# @superloomdev/js-server-helper-distinct-queue

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![Node.js 24+](https://img.shields.io/badge/Node.js-24%2B-brightgreen.svg)](https://nodejs.org)

A persistent, last-write-wins coalescing queue keyed by tenant and resource. N rapid-fire writes for the same resource collapse into at most one execution of the latest payload. The storage backend is chosen at construction time through a pluggable adapter. Part of the [Superloom](https://github.com/superloomdev/superloom) framework.

## What It Does

Many systems integrate with external data sources that push updates via
webhooks. When the external source changes rapidly — a product catalog updated
ten times in thirty seconds, a configuration object changed by multiple actors
in parallel — the receiving system is flooded with update requests for the same
resource. Processing every one of them wastes compute and risks interleaved
writes. Only the most recent one contains the current state.

`js-server-helper-distinct-queue` solves this with a simple guarantee:
**one queue slot per resource, always holding the latest job**. Every time a
new job is written for a resource, it supersedes all previous pending jobs for
that resource. If a worker is already running, the new job waits. When the
worker finishes, it checks the slot: if a newer job arrived during execution,
it processes that one immediately. If the slot is empty, it exits. N writes for
the same resource collapse into at most one execution, always of the latest
payload.

This pattern is a **last-write-wins coalescing queue**. It is different from a
FIFO job queue (which processes every item in arrival order) and from a message
broker (which fans out to subscribers). Here, only one execution per resource
matters at any given time — and stale jobs are discarded, not retried.

## Why

- **No string-dispatched backends.** The chosen storage adapter is passed as a factory function via `CONFIG.STORE`. Unused backends never get loaded and the module has no internal `switch` block.
- **One factory call. One independent instance.** No singletons. Run multiple queue instances with different configs if needed.
- **Write path has zero reads.** `enqueue` is append-only. No read-before-write, no compare-and-swap. This makes the write path fast and safe to call from many concurrent request handlers.
- **Distinctness is enforced at consumption, not at write.** Multiple records can coexist. `claim` picks the latest and discards the rest. This avoids write-time contention entirely.

## Partitioning: `tenant_id` and `resource_id`

Every job is identified by two caller-supplied strings.

**`tenant_id`** is the partition boundary. All jobs belonging to the same
tenant live under the same partition. This isolates tenants from each other
completely — one tenant's jobs can never interfere with another's — and enables
efficient tenant-level cleanup (removing all jobs for a tenant is a single
partitioned delete, not a full-table scan).

**`resource_id`** is the unique identifier of the specific resource being
updated, within that tenant. The module treats it as an opaque string. The
caller constructs it from whatever hierarchy the application knows about. A
good `resource_id` encodes every dimension that makes the resource unique so
that two different resources never share the same slot:

```
// A product inside a catalog inside an account
resource_id: account_id + '.' + catalog_id + '.' + product_id

// A configuration object inside a workspace inside an organisation
resource_id: org_id + '.' + workspace_id + '.' + config_object_id

// A user profile inside a region
resource_id: region_id + '.' + user_id
```

The module never parses `resource_id`. It is stored and queried as-is.

## Architecture Overview

The module operates in a two-phase flow:

**Enqueue side** (runs inside an inbound request handler):

1. Call `enqueue(instance, { tenant_id, resource_id, payload, action })`.
2. The module generates an internal ordering timestamp and a unique sort key.
   The record is appended to the store. No reads.

```js
// Example: webhook handler enqueues a sync job
await Lib.DistinctQueue.enqueue(instance, {
  tenant_id: account_id,
  resource_id: account_id + '.' + catalog_id + '.' + product_id,
  payload: { source_url: webhook_payload.url, metadata: webhook_payload.meta },
  action: 'sync-catalog'
});
```

**Worker side** (runs inside the single scheduled poller):

1. Call `claim(instance, { tenant_id, resource_id })` — finds the latest
   record, deletes all stale records, returns the winning payload and action.
2. If `payload` is null, stop — nothing to process.
3. Execute the work using the returned payload.
4. Loop back to step 1.

```js
// Example: poller loop
const result = await Lib.DistinctQueue.claim(instance, {
  tenant_id: account_id,
  resource_id: account_id + '.' + catalog_id + '.' + product_id
});

if (result.payload === null) {
  return; // Nothing to process
}

await processSync(result.payload, result.action);
```

**Deployment constraint:** use a single scheduled worker (e.g. a Lambda on
EventBridge every 10 seconds) as the sole consumer of `claim`. Do not run
multiple parallel consumers against the same queue — this module does not
implement distributed locking. One poller per queue is the correct operating
model.

## Storage Adapters

| Backend | Package |
|---|---|
| DynamoDB | `@superloomdev/js-server-helper-distinct-queue-store-dynamodb` |
| MongoDB | `@superloomdev/js-server-helper-distinct-queue-store-mongodb` |

Pass the adapter factory as `CONFIG.STORE`. Each adapter's README documents
its `STORE_CONFIG` shape, table/collection schema, and provisioning steps.

## Adding to Your Project

Install this module **and** the one storage adapter you need as peer dependencies in your project's `package.json` and load them through the standard Superloom loader.

```bash
npm install @superloomdev/js-server-helper-distinct-queue \
            @superloomdev/js-server-helper-distinct-queue-store-dynamodb
```

Substitute the adapter package for your database. The full list is in the [Storage Adapters](#storage-adapters) section above.

```js
// In your project loader
const DistinctQueueFactory = require('@superloomdev/js-server-helper-distinct-queue');

Lib.DistinctQueue = DistinctQueueFactory(Lib, {
  STORE:        require('@superloomdev/js-server-helper-distinct-queue-store-dynamodb'),
  STORE_CONFIG: { table_name: 'distinct_queue', lib_dynamodb: Lib.DynamoDB }
});
```

## Aligned with Superloom Philosophy

If your project is built on Superloom conventions (the same loader pattern, the same testing model, the same `instance`-first call shape), this module slots in without you needing to learn anything new. Every function takes `instance` as its first argument.

If you are not yet using Superloom, the principles are documented at [superloom.dev](https://superloom.dev).

## Dependencies

This module has no external dependencies.

It expects three peer modules in the `Lib` container (Utils, Debug, Instance) and one adapter package for your storage backend. Peer dependencies:

| `Lib.*` | Source | Used for |
|---|---|---|
| `Lib.Utils` | `@superloomdev/js-helper-utils` | Type checks, isEmpty, isNullOrUndefined |
| `Lib.Debug` | `@superloomdev/js-helper-debug` | Diagnostic logging on store failures |
| `Lib.Instance` | `@superloomdev/js-server-helper-instance` | Request instance for lifecycle |

The store adapter (`CONFIG.STORE`) consumes its own driver helper
(`Lib.DynamoDB`, `Lib.MongoDB`) through `CONFIG.STORE_CONFIG`. The
distinct-queue module never imports a database driver helper directly.

## Testing Status

| Tier | Runtime | Status |
|---|---|---|
| Unit (offline) | Node.js `node --test` against an in-process memory store | ✅ |

The module's own tests use the in-process memory fixture (`_test/memory-store.js`) which implements the full 4-method store contract (`writeRecord`, `queryByResourceId`, `deleteByDataVersionLte`, `queryByResourceIdPrefix`). There is no Docker dependency in this package and no database driver is required. Integration tests for each storage backend live in the corresponding adapter package.

## Extended Documentation

- [API reference](docs/api.md). Every exported function with its signature, parameters, return shape, lifecycle, and error catalog
- [Configuration](docs/configuration.md). Loader pattern, every configuration key, per-backend `STORE_CONFIG` shape, peer dependencies, testing tier
- [Data model](docs/data-model.md). Every record field, core concepts, sort key design, resource_id design guide
- [Superloom](https://superloom.dev). The framework

## License

MIT
