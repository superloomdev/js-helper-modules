# ROBOTS.md. `js-server-helper-distinct-queue`

Compact, AI-targeted reference for the public interface. Humans should read `README.md` and `docs/`.

## Module Overview

Persistent, storage-agnostic last-write-wins coalescing queue keyed by `(tenant_id, resource_id)`. N rapid-fire writes for the same resource collapse into at most one execution of the latest payload. Write path is append-only (no reads on enqueue). The "distinct" property is enforced at consumption time (`claim`), not at write time. Storage backends are standalone adapter packages (`@superloomdev/js-server-helper-distinct-queue-store-*`); the caller passes the adapter factory directly as `CONFIG.STORE`.

## Factory Pattern

```js
module.exports = function loader (shared_libs, config) {
  // Returns independent instance with isolated Lib + CONFIG.
  // Validates CONFIG at construction (STORE must be a function).
  // Throws synchronously on misconfiguration.
  return { enqueue, claim, listByPrefix };
};
```

`CONFIG.STORE` is a **pre-configured factory function** - the result of calling the adapter's own configure call. The loader calls it as `CONFIG.STORE(Lib, ERRORS)` and binds the returned store object to the instance. Passing a string throws `CONFIG.STORE is required and must be a store factory function`.

```js
Lib.DistinctQueue = require('@superloomdev/js-server-helper-distinct-queue')(Lib, {
  STORE: require('@superloomdev/js-server-helper-distinct-queue-store-dynamodb')(
    { table_name: 'distinct_queue', lib_dynamodb: Lib.DynamoDB }
  )
});
```

## Public Functions

### `enqueue(instance, options)` *(async)*

Append a new job record. Write-only — no reads. Safe to call from many concurrent handlers.

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
| `STORE` | function | Yes | Pre-configured store adapter factory. Call the adapter's configure export with its own config and pass the result here. |

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
| `data_version` | Number | module — current time in ms at enqueue |
| `request_id` | String | module — compact UUID for uniqueness, tiebreaking, and caller correlation |
| `payload` | Object | caller |
| `action` | String | caller |
| `toc` | Number | module — same as `data_version` in v1 |

## Critical Behaviour for Code-Generating Tools

- **`instance` is always the first argument.** Every function uses it for lifecycle.
- **`STORE` is a factory function, not a string.** The loader throws on string, object, or missing.
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
| `Lib.Instance` | `@superloomdev/js-server-helper-instance` | Request instance lifecycle |

The store adapter (`CONFIG.STORE`) consumes its own driver helper (`Lib.DynamoDB`, `Lib.MongoDB`) through its own internal configuration. The distinct-queue module never imports a database driver directly.

## Documentation

- `docs/api.md`. Full API reference (every function, every option, every error type)
- `docs/configuration.md`. Loader pattern, every config key, peer dependencies, testing tier
- `docs/data-model.md`. Record shape, core concepts, sort key design
- Storage adapters: see the README's "Storage Adapters" section. Per-backend schema, indexes, and configuration shape live in each adapter package's own README (`@superloomdev/js-server-helper-distinct-queue-store-*`)
