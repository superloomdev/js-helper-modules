# js-server-helper-logger-store-mongodb. AI Reference

MongoDB storage adapter for `@superloomdev/js-server-helper-logger`. Fully independent — owns its own Lib, Config, and ERRORS. Constructed first by application code and passed as a ready-to-use store object to the Logger parent.

Requires a running MongoDB instance. Uses `js-server-helper-nosql-mongodb` (native driver wrapper) passed via `config.lib_mongodb`.

## Construction

```js
const Store = require('@superloomdev/js-server-helper-logger-store-mongodb')({
  collection_name: 'action_log',  // required. one collection per logger instance
  lib_mongodb:     Lib.MongoDB    // required. initialized js-server-helper-nosql-mongodb
});

Lib.Logger = require('@superloomdev/js-server-helper-logger')(Lib, {
  Store: Store
});
```

Both config keys are required. The loader throws an `Error` if either is missing, null, or empty.

## Store Contract

| Method | Signature | Returns |
|---|---|---|
| `setupNewStore` | `(instance)` | `{ success, error }` |
| `addLog` | `(instance, record)` | `{ success, error }` |
| `getLogsByEntity` | `(instance, query)` | `{ success, records, next_cursor, error }` |
| `getLogsByActor` | `(instance, query)` | `{ success, records, next_cursor, error }` |
| `cleanupExpiredLogs` | `(instance)` | `{ success, deleted_count, error }` |

## Behaviors That Must Not Be Violated When Generating Code

1. **Construct the adapter before the Logger.** The adapter is fully independent. Pass the returned store object as `CONFIG.Store` to the Logger parent.

2. **`_id` is set to `sort_key`.** MongoDB document ID equals `sort_key` — no auto-generated ObjectId. This is the primary deduplication key for `addLog`.

3. **`addLog` is idempotent.** Uses `replaceOne` with `upsert: true` on `{ _id: sort_key }`. Re-inserting the same `sort_key` silently replaces the document with identical content.

4. **No denormalized compound keys.** Documents store the canonical fields only (`scope`, `entity_type`, `entity_id`, `actor_type`, `actor_id`, etc.). The two query paths use compound indexes on the individual fields — no `entity_pk`/`actor_pk` strings are computed or stored.

5. **`_ttl` is a `Date` field derived from `expires_at * 1000`.** Drives the sparse TTL index. Absent for persistent (never-expiring) log records (where `expires_at` is null).

6. **`setupNewStore` creates exactly two compound indexes plus one TTL index:**
   - `{ scope: 1, entity_type: 1, entity_id: 1, sort_key: -1 }` named `logger_entity_idx` for `getLogsByEntity`.
   - `{ scope: 1, actor_type: 1, actor_id: 1, sort_key: -1 }` named `logger_actor_idx` for `getLogsByActor`.
   - `{ _ttl: 1 }` named `logger_ttl_idx` with `expireAfterSeconds: 0, sparse: true` for automatic TTL.

7. **`cleanupExpiredLogs` is an explicit sweep** on `{ expires_at: { $ne: null, $lte: now } }`. Complements the native TTL sweeper.

8. **`MONGO_URL` defaults to port 27020** in the test environment (not the standard 27017 or 27019 used by verify-store-mongodb) to avoid collisions.

9. **`data` is stored as a native MongoDB object** (not serialized to a string), because MongoDB supports embedded documents. This is different from SQL adapters where `data` is JSON TEXT.

## Dependencies

Owned (bundled in package):
```
@superloomdev/js-helper-utils                    (type checks)
@superloomdev/js-helper-debug                    (structured logging)
```

Peer (caller provides via config.lib_mongodb):
```
@superloomdev/js-server-helper-nosql-mongodb     (MongoDB driver wrapper)
```

## Error Catalog

| Error | When |
|---|---|
| `SERVICE_UNAVAILABLE` | Driver-level call failed. Logged via `Lib.Debug.debug`, returned as `{ success: false, error }` |

## Single Source of Truth

The store's source file is `store.js`; the config validator is `store.validators.js`; the error catalog is `store.errors.js`. `_id = sort_key`. No denormalized compound keys — indexes are compound on the canonical fields. TTL field: `_ttl` (sparse index, only set when `expires_at` is non-null).
