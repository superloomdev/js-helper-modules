# ROBOTS.md. `js-server-helper-distinct-queue`

Compact, AI-targeted reference for the public interface. Humans should read `README.md` and `docs/`.

## Module Overview

Persistent, storage-agnostic last-write-wins coalescing queue keyed by `(tenant_id, resource_id)`. N rapid-fire writes for the same resource collapse into at most one execution of the latest payload. Write path is append-only (no reads on enqueue). The "distinct" property is enforced at consumption time (`claim`), not at write time. Storage backends are standalone adapter packages (`@superloomdev/js-server-helper-distinct-queue-store-*`); the caller passes a ready-to-use store object as `CONFIG.Store`.

## Factory Pattern

```js
module.exports = function loader (shared_libs, config) {
  // Returns independent instance with isolated Lib + CONFIG.
  // Validates CONFIG at construction (Store must be a ready-to-use object).
  // Throws synchronously on misconfiguration.
  return { enqueue, claim, listByPrefix };
};
```

`CONFIG.Store` is a **ready-to-use store object** from a fully-independent adapter module. The adapter owns its own `Lib`, `Config`, and `ERRORS` internally. The parent module uses the store directly through the contract interface. Passing a non-object throws `CONFIG.Store is required and must be a store object`.

```js
Lib.DistinctQueue = require('@superloomdev/js-server-helper-distinct-queue')(Lib, {
  Store: require('@superloomdev/js-server-helper-distinct-queue-store-dynamodb')(Lib, {
    table_name: 'distinct_queue'
  })
});
```

## Public Functions

### `enqueue(instance, options)` *(async)*

Append a new job record. Write-only - no reads. Safe to call from many concurrent handlers.

- **options.tenant_id**: String, required. Partition boundary.
- **options.resource_id**: String, required. Opaque resource identifier within the tenant.
- **options.payload**: Object, required. Arbitrary data stored as-is, returned by `claim`.
- **options.action**: String, required. Opaque label for the worker, returned by `claim`.
- **Returns**: `{ success, request_id, error }`. `request_id` is the compact UUID generated for this enqueue.

### `claim(instance, options)` *(async)*

Query all records for a resource. Pick the latest (highest `data_version`). Delete all stale records (data_version ≤ winner). Return the winning record's payload and action. Called only by the single scheduled poller. Poller loops claim until `payload` is null.

- **options.tenant_id**: String, required. Partition boundary.
- **options.resource_id**: String, required. Opaque resource identifier.
- **Returns**: `{ success, payload, action, error }`. `payload=null` when no records exist.

### `listByPrefix(instance, options)` *(async)*

Operational prefix query. Not used in the normal enqueue/claim flow.

- **options.tenant_id**: String, required.
- **options.resource_id_prefix**: String, required. Prefix to match against `resource_id`.
- **Returns**: `{ success, records, error }`.

## Configuration

| Key | Type | Required | Notes |
|---|---|---|---|
| `Store` | object | Yes | Ready-to-use store object from a fully-independent adapter module. |

## Error Catalog

| `error.type` | Trigger | Surfaces in |
|---|---|---|
| `DISTINCT_QUEUE_SERVICE_UNAVAILABLE` | Store returned `{ success: false }` or threw | All async functions |

Error shape is frozen at module load: `{ type: 'DISTINCT_QUEUE_SERVICE_UNAVAILABLE', message: 'Distinct queue service temporarily unavailable' }`.

## Store Contract (4 methods)

Every adapter must implement these methods:

| Method | Signature | Purpose |
|---|---|---|
| `writeRecord` | `(instance, record)` → `{ success, error }` | Append a record |
| `queryByResourceId` | `(instance, tenant_id, resource_id)` → `{ success, records, error }` | All records for a resource |
| `deleteByDataVersionLte` | `(instance, tenant_id, resource_id, dv)` → `{ success, error }` | Delete stale records |
| `queryByResourceIdPrefix` | `(instance, tenant_id, prefix)` → `{ success, records, error }` | Prefix scan |

## Record Shape

| Field | Type | Set by |
|---|---|---|
| `tenant_id` | String | caller |
| `resource_id` | String | caller |
| `data_version` | Number | module - current time in ms at enqueue |
| `request_id` | String | module - compact UUID for uniqueness, tiebreaking, and caller correlation |
| `payload` | Object | caller |
| `action` | String | caller |
| `toc` | Number | module - same as `data_version` in v1 |

## Critical Behavior for Code-Generating Tools

- **`instance` is always the first argument.** Every function uses it for request context.
- **`Store` is a ready-to-use object, not a string or function.** The loader throws on string, function, or missing.
- **Programmer errors throw, operational errors return.** Missing required options throw `TypeError`; store failures return `{ success: false, error }`.
- **Write path is append-only.** `enqueue` never reads. Multiple records coexist; distinctness is enforced by `claim`.
- **Single-poller deployment.** `claim` must be called by exactly one consumer at a time. The module does not implement distributed locking.
- **`data_version` is module-generated.** The caller never supplies it. It is current time in ms at enqueue time.
- **Claim deletes stale records.** After picking the latest, `claim` deletes all records with `data_version ≤` the winner's. Deletion failure is non-fatal.
- **Poller loops until `payload` is null.** The poller calls `claim` repeatedly. When `payload` is null, there is nothing left to process.

## Peer Dependencies

| `Lib.*` | Source | Used for |
|---|---|---|
| `Lib.Utils` | `@superloomdev/js-helper-utils` | Type checks |
| `Lib.Debug` | `@superloomdev/js-helper-debug` | Diagnostic logging on store failures |
| `Lib.Crypto` | `@superloomdev/js-server-helper-crypto` | Compact UUID generation for `request_id` |
| `Lib.Instance` | `@superloomdev/js-server-helper-instance` | Request instance lifecycle |

The store adapter (`CONFIG.Store`) is a fully independent module with its own `Lib`, `Config`, and `ERRORS`. The distinct-queue module uses the store object directly through the contract interface.

## Documentation

- `docs/api.md`. Full API reference (every function, every option, every error type)
- `docs/configuration.md`. Loader pattern, every config key, peer dependencies, testing tier
- `docs/data-model.md`. Record shape, core concepts, sort key design
- Storage adapters: see the README's "Storage Adapters" section. Per-backend schema, indexes, and configuration shape live in each adapter package's own README (`@superloomdev/js-server-helper-distinct-queue-store-*`)
