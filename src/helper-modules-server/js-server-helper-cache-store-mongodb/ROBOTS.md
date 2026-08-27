# helper-cache-store-mongodb. AI Reference

Class F storage adapter. MongoDB backend for `helper-cache`. Fully independent module that owns its own CONFIG, ERRORS, and Validators. Standard factory shape: `(shared_libs, config)`. Configured and instantiated independently, then passed to the Cache parent as a ready-to-use store object.

Requires a running MongoDB instance. Uses `helper-nosql-mongodb` (MongoDB Node.js driver wrapper) injected via `shared_libs.MongoDB`.

## Adapter Factory

```js
import cacheStoreMongodb from '@superloomdev/js-server-helper-cache-store-mongodb';

const Store = cacheStoreMongodb(Lib, {
  COLLECTION_NAME: 'my_cache_collection'
});
```

| Argument | Type | Required | Description |
|---|---|---|---|
| `shared_libs` | Object | Yes | Dependency container (Utils, Debug, MongoDB) |
| `COLLECTION_NAME` | String | Yes | MongoDB collection name |

Returns a ready-to-use Store interface. The Cache parent receives this object and calls the contract methods.

## Configuration

```js
{
  COLLECTION_NAME: null,        // required. MongoDB collection name
  VALUE_FIELD: 'cache_value',   // field name for the cached value (stored as native BSON)
  EXPIRY_FIELD: 'expires_at',   // field name for the expiry timestamp (BSON Date). Create a TTL index on this field
  LOCK_ID_PREFIX: '\u001Flock\u001F'  // _id prefix for distributed lock documents
}
```

All keys live on this adapter, not on the cache module. The cache module composes no backend key. Lock documents share the same collection as cache entries but use a distinct _id prefix.

## Store Contract

| Method | Signature | Returns |
|---|---|---|
| `getCache` | `(instance, namespace, cache_code)` | `{ success, value, error }` |
| `setCache` | `(instance, namespace, cache_code, value, ttl_seconds)` | `{ success, error }` |
| `deleteCache` | `(instance, namespace, cache_code)` | `{ success, error }` |
| `deleteCacheByPrefix` | `(instance, namespace, cache_code_prefix)` | `{ success, deleted_count, error }` |
| `clearCache` | `(instance, namespace)` | `{ success, deleted_count, error }` |
| `listCacheCodes` | `(instance, namespace, cache_code_prefix?)` | `{ success, cache_codes, error }` |
| `getCacheExists` | `(instance, namespace, cache_code)` | `{ success, exists, error }` |
| `setCacheLock` | `(instance, namespace, cache_code, options)` | `{ success, applied, error }` |
| `releaseCacheLock` | `(instance, namespace, cache_code)` | `{ success, error }` |

All methods are async. `instance` is the per-request lifecycle object from `Lib.Instance.initialize()`.

This adapter does not serialize. MongoDB stores native BSON, so `setCache` passes the raw JavaScript object straight through to `Lib.MongoDB` as the `VALUE_FIELD`; `getCache` returns the stored BSON object directly. The cache module passes raw JavaScript objects.

`setCacheLock` uses `Lib.MongoDB.insertRecordIfNotExists` (atomic `insertOne` that catches the E11000 duplicate key error) with an expiry Date on EXPIRY_FIELD. Lock documents use a distinct _id prefix. When the atomic insert returns `applied: false`, the adapter checks whether the existing lock has expired (the MongoDB TTL sweeper may lag up to 60 seconds). If it has, the stale lock is deleted and the insert is retried. `releaseCacheLock` uses `Lib.MongoDB.deleteRecord` and is idempotent.

## Key Composition

```
_id = namespace + '\u001F' + cache_code
```

Example: namespace `ProductCatalog`, cache_code `electronics:laptop-x1`

```
_id = ProductCatalog\u001Felectronics:laptop-x1
```

The `\u001F` (ASCII Unit Separator) is a fixed, non-configurable separator that cannot appear in any human-readable identifier. `deleteCacheByPrefix`, `clearCache`, and `listCacheCodes` use left-anchored regex on `_id`, which MongoDB converts to an index range scan on the _id B-tree - O(K) where K = matching documents, not the entire collection.

## Behaviors That Must Not Be Violated When Generating Code

1. **Never call the adapter directly from application code.** Always go through the parent Cache module.

2. **`getCache` returns `value: null` on a miss.** Not an error. Also returns null when the document exists but has expired (the MongoDB TTL sweeper may lag).

3. **`setCache` with no `ttl_seconds` means no expiry.** The document persists until explicitly deleted.

4. **`deleteCache` is idempotent.** A missing document is treated as success.

5. **`deleteCacheByPrefix` and `clearCache` short-circuit on zero matches.** No `deleteRecordsByFilter` call is made when the query returns an empty result set.

6. **`deleteCacheByPrefix`, `clearCache`, and `listCacheCodes` are namespace-scoped.** They use left-anchored regex on `_id`, scoped to one namespace prefix. This is O(K) where K = matching documents, not the entire collection.

7. **The driver slot is named `MongoDB`, never `Mongo` or `Mongoose`.** The capability name, not the vendor name.

8. **Lock keys use a separate _id prefix.** Lock documents share the same collection as cache entries but use `LOCK_ID_PREFIX` in the _id, so they do not collide with cache_code values.

## Peer Dependencies

```
helper-utils                    (type checks - via shared_libs.Utils)
helper-debug                    (structured logging - via shared_libs.Debug)
helper-nosql-mongodb            (MongoDB driver wrapper - via shared_libs.MongoDB)
```

All are loaded into `Lib` by the application before the Cache parent is loaded. The adapter never requires any of them directly; it picks them from the injected container.

## Error Catalog

This adapter owns its own `store.errors.js`. One type:

| Error | When |
|---|---|
| `ERRORS.SERVICE_UNAVAILABLE` | Driver-level call failed. Logged via `Lib.Debug.debug`, never surfaced to caller |

## Single Source of Truth

The store's source file is `store.js`; the config validator is `store.validators.js`. Key composition is routed through a single `composeKey(namespace, cache_code)` helper so the separator and _id format appear in exactly one place.
