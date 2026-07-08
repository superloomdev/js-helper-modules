# helper-verify-store-mongodb. AI Reference

Class F storage adapter. MongoDB backend for `helper-verify`. Fully independent module that owns its own CONFIG, ERRORS, and Validators. Standard factory shape: `(shared_libs, config)`. Configured and instantiated independently, then passed to the Verify parent as a ready-to-use store object.

Requires a running MongoDB instance. Uses `helper-nosql-mongodb` (native driver wrapper) injected via `shared_libs.MongoDB`.

## Adapter Factory

```js
const Store = require('@superloomdev/js-server-helper-verify-store-mongodb')(Lib, {
  collection_name: 'verification_codes'
});
```

| Argument | Type | Required | Description |
|---|---|---|---|
| `shared_libs` | Object | Yes | Dependency container (Utils, Debug, MongoDB) |
| `collection_name` | String | Yes | Name of the verification collection |

Returns a ready-to-use Store interface. The Verify parent receives this object and calls the contract methods.

## Configuration

```js
{
  collection_name: 'verification_codes'  // required. one collection per verify instance
}
```

`collection_name` is required. The loader throws an `Error` if it is missing, null, or empty. The MongoDB driver is injected via `shared_libs.MongoDB`.

## Store Contract

| Method | Signature | Returns |
|---|---|---|
| `setupNewStore` | `(instance)` | `{ success, error }` |
| `getRecord` | `(instance, scope, key)` | `{ success, record, error }` |
| `setRecord` | `(instance, scope, key, record)` | `{ success, error }` |
| `incrementFailCount` | `(instance, scope, key)` | `{ success, error }` |
| `deleteRecord` | `(instance, scope, key)` | `{ success, error }` |
| `cleanupExpiredRecords` | `(instance)` | `{ success, deleted_count, error }` |

All methods are async. `instance` is the per-request scope object from `Lib.Instance.initialize()`.

## Behaviors That Must Not Be Violated When Generating Code

1. **Never call the adapter directly from application code.** Always go through the parent Verify module. The adapter is configured independently and passed as a ready-to-use store object to the Verify parent.

2. **`getRecord` returns `record: null` on a miss.** Not an error.

3. **`setRecord` is a full UPSERT via `replaceOne`.** The filter is `{ _id: { scope, id } }` - the compound `_id` field. A second `setRecord` on the same `(scope, key)` pair replaces the entire document.

4. **`incrementFailCount` uses `$inc` for atomic increment.** Issues `{ $inc: { fail_count: 1 } }`. Does not read first.

5. **`deleteRecord` is idempotent.** A missing document is treated as success.

6. **`_id` is a compound object `{ scope, id }`.** Not a string, not an ObjectId. The adapter constructs this on every write/read.

7. **`_ttl` is a `Date` field derived from `expires_at * 1000`.** The TTL index on `_ttl` (`expireAfterSeconds: 0`) triggers automatic MongoDB background deletion approximately 60 seconds after the Date passes. Verify codes always carry `expires_at`, so every document has `_ttl` - the index is non-sparse.

8. **`setupNewStore` creates exactly one index:** a TTL index `{ _ttl: 1 }` with `{ name: 'verify_ttl_idx', expireAfterSeconds: 0 }`. The primary key is the compound `_id`; MongoDB creates a unique index on `_id` automatically.

9. **`cleanupExpiredRecords` is an explicit sweep.** Deletes documents using `{ expires_at: { $lt: instance.time } }`. Complements the native TTL sweeper for environments needing deterministic `deleted_count` reporting.

10. **`MONGO_URL` defaults to port 27019** in the test environment (not the standard 27017) to avoid collisions with other running MongoDB instances.

## Peer Dependencies

```
helper-utils              (type checks - via shared_libs.Utils)
helper-debug              (structured logging - via shared_libs.Debug)
helper-nosql-mongodb      (MongoDB driver wrapper - via shared_libs.MongoDB)
```

All are loaded into `Lib` by the application before the Verify parent is loaded. The adapter never requires any of them directly; it picks them from the injected container.

## Error Catalog

This adapter owns its own `store.errors.js`. Only one type:

| Error | When |
|---|---|
| `ERRORS.SERVICE_UNAVAILABLE` | Driver-level call failed. Logged via `Lib.Debug.debug`, never surfaced to caller |

## Single Source of Truth

The store's source file is `store.js`; the config validator is `store.validators.js`. The compound `_id` key is `{ scope, id }`. The `_ttl` field is the TTL index key.
