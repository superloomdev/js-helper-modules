# API Reference. `js-server-helper-nosql-mongodb-admin`

Every exported function with its signature, parameters, return shape, semantics, and examples. For configuration keys and runtime patterns see [Configuration](https://github.com/superloomdev/superloom/blob/main/src/helper-modules-server/js-server-helper-nosql-mongodb-admin/docs/configuration.md).

## On This Page

- [Conventions](#conventions)
- [Collection Management](#collection-management)
  - [`createCollection`](#createcollection)
  - [`deleteCollection`](#deletecollection)
- [Index Management](#index-management)
  - [`createIndexes`](#createindexes)
  - [`enableTtlIndex`](#enablettlindex)
  - [`listIndexes`](#listindexes)
- [Lifecycle](#lifecycle)
  - [`ping`](#ping)
  - [`close`](#close)

---

## Conventions

All I/O functions are **async** and accept `instance` as their first argument. The `instance` is built once per request by `Lib.Instance.initialize()` and threaded through the call chain for request context and performance logging via `Lib.Debug.performanceAuditLog`.

Every function returns a consistent response envelope:

```javascript
{ success: true,  data: { /* result fields */ }, error: null }
{ success: false, data: { /* zeroed fields */ }, error: { type, message } }
```

All provisioning functions are **idempotent** with ensure semantics. Already-exists is `success: true` with `data.created: false`, never an error.

Operational failures (connection lost, permission denied, driver error) never throw. They come back through `error` so the caller can branch without a try/catch. Programming errors (bad arguments, missing required options) throw `TypeError`, because those are bugs.

---

## Collection Management

### `createCollection`

```javascript
async createCollection(instance, options) -> { success, data, error }
```

Create a collection. Idempotent: if the collection already exists, returns `data.created: false`.

| Parameter | Type | Description |
|---|---|---|
| `instance` | `Object` | Request instance from `Lib.Instance.initialize()` |
| `options.collection_name` | `String` | Name of the collection to create |
| `options.collection_options` | `Object` *(optional)* | Options passed to the driver's `createCollection` (e.g. `{ capped: true, size: 100000 }`) |

**Returns:** `{ success: true, data: { created: Boolean }, error: null }` or `{ success: false, data: { created: false }, error: {...} }`.

---

### `deleteCollection`

```javascript
async deleteCollection(instance, options) -> { success, data, error }
```

Delete a collection. Idempotent: if the collection does not exist, returns `data.dropped: false`.

| Parameter | Type | Description |
|---|---|---|
| `instance` | `Object` | Request instance from `Lib.Instance.initialize()` |
| `options.collection_name` | `String` | Name of the collection to delete |

**Returns:** `{ success: true, data: { dropped: Boolean }, error: null }` or `{ success: false, data: { dropped: false }, error: {...} }`.

---

## Index Management

### `createIndexes`

```javascript
async createIndexes(instance, options) -> { success, data, error }
```

Create one or more indexes on a collection. Idempotent: indexes that already exist with an identical spec are counted in `data.skipped`.

| Parameter | Type | Description |
|---|---|---|
| `instance` | `Object` | Request instance from `Lib.Instance.initialize()` |
| `options.collection_name` | `String` | Name of the collection |
| `options.indexes` | `Array` | Array of index specs |
| `options.indexes[].keys` | `Object` | Index key spec (e.g. `{ field: 1 }` ascending, `{ field: -1 }` descending) |
| `options.indexes[].index_options` | `Object` *(optional)* | Driver `createIndex` options (e.g. `{ name: 'idx_field', unique: true, sparse: true }`) |

**Returns:** `{ success: true, data: { created: String[], skipped: String[] }, error: null }` or `{ success: false, data: { created: [], skipped: [] }, error: {...} }`.

---

### `enableTtlIndex`

```javascript
async enableTtlIndex(instance, options) -> { success, data, error }
```

Enable a sparse TTL index on a Date field. Idempotent: if a TTL index already exists on the same field, returns `data.enabled: false`. If a TTL index exists on a **different** field, returns `ADMIN_TTL_CONFLICT`.

| Parameter | Type | Description |
|---|---|---|
| `instance` | `Object` | Request instance from `Lib.Instance.initialize()` |
| `options.collection_name` | `String` | Name of the collection |
| `options.field_name` | `String` | Date field to index (must store BSON Date values) |
| `options.expire_after_seconds` | `Number` | TTL in seconds (non-negative) |

**Returns:** `{ success: true, data: { enabled: Boolean }, error: null }` or `{ success: false, data: { enabled: false }, error: {...} }`.

**Error types:**

| Error type | When |
|---|---|
| `ADMIN_TTL_CONFLICT` | A TTL index already exists on a different field for this collection |
| `ADMIN_OPERATION_FAILED` | Driver error during index creation |

---

### `listIndexes`

```javascript
async listIndexes(instance, options) -> { success, data, error }
```

List all indexes on a collection.

| Parameter | Type | Description |
|---|---|---|
| `instance` | `Object` | Request instance from `Lib.Instance.initialize()` |
| `options.collection_name` | `String` | Name of the collection |

**Returns:** `{ success: true, data: { indexes: Array }, error: null }` or `{ success: false, data: { indexes: [] }, error: {...} }`.

---

## Lifecycle

### `ping`

```javascript
async ping(instance) -> { success, data, error }
```

Round-trip check with admin credentials. Verifies the connection is alive and the admin user can authenticate.

| Parameter | Type | Description |
|---|---|---|
| `instance` | `Object` | Request instance from `Lib.Instance.initialize()` |

**Returns:** `{ success: true, data: { ok: true }, error: null }` or `{ success: false, data: { ok: false }, error: {...} }`.

---

### `close`

```javascript
async close(instance) -> { success, error }
```

Close the MongoDB admin connection for this instance. Idempotent: closing an already-closed connection succeeds. Teardown is registered automatically with `Lib.Instance.addProcessCleanupRoutine` on first client creation. A caller normally never calls `close()` directly. The deployment's `CLOSE_ON_CLEANUP` config on `helper-instance` decides when it runs.

| Parameter | Type | Description |
|---|---|---|
| `instance` | `Object` | Request instance from `Lib.Instance.initialize()` |

**Returns:** `{ success: true, error: null }` or `{ success: false, error: {...} }`.

**When close runs:**

| Deployment | `CLOSE_ON_CLEANUP` | When close runs |
|---|---|---|
| Persistent (Express, Docker, EC2) | `false` | On SIGTERM via `Lib.Instance.runProcessCleanup()` |
| Serverless (Lambda, Cloud Functions) | `true` | After every request via `Lib.Instance.runInstanceCleanup(instance)` |

**Example (persistent server):**

```javascript
process.on('SIGTERM', async () => {
  await Lib.Instance.runProcessCleanup();
  process.exit(0);
});
```
