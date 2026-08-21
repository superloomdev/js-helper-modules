# helper-cache-store-dynamodb. AI Reference

Class F storage adapter. DynamoDB backend for `helper-cache`. Fully independent module that owns its own CONFIG, ERRORS, and Validators. Standard factory shape: `(shared_libs, config)`. Configured and instantiated independently, then passed to the Cache parent as a ready-to-use store object.

Requires a running DynamoDB instance. Uses `helper-nosql-aws-dynamodb` (AWS SDK v3 wrapper) injected via `shared_libs.DynamoDB`.

## Adapter Factory

```js
const Store = require('@superloomdev/js-server-helper-cache-store-dynamodb')(Lib, {
  TABLE_NAME: 'my_cache_table'
});
```

| Argument | Type | Required | Description |
|---|---|---|---|
| `shared_libs` | Object | Yes | Dependency container (Utils, Debug, DynamoDB) |
| `TABLE_NAME` | String | Yes | DynamoDB table name |

Returns a ready-to-use Store interface. The Cache parent receives this object and calls the contract methods.

## Configuration

```js
{
  TABLE_NAME: null,              // required. DynamoDB table name
  PARTITION_KEY: 'namespace',    // partition key attribute name
  SORT_KEY: 'cache_code',        // sort key attribute name
  VALUE_FIELD: 'cache_value',    // attribute name for the JSON string value
  EXPIRY_FIELD: 'expiry_ttl',    // attribute name for the TTL timestamp (enable DynamoDB native TTL on this)
  LOCK_SORT_KEY_PREFIX: '\u001Flock\u001F'  // sort-key prefix for lock items
}
```

All keys live on this adapter, not on the cache module. The cache module composes no backend key. Lock items share the same partition key as cache entries but use a distinct sort-key prefix.

## Store Contract

| Method | Signature | Returns |
|---|---|---|
| `get` | `(instance, namespace, cache_code)` | `{ success, value, error }` |
| `set` | `(instance, namespace, cache_code, value, ttl_seconds)` | `{ success, error }` |
| `delete` | `(instance, namespace, cache_code)` | `{ success, error }` |
| `clear` | `(instance, namespace, cache_code_prefix?)` | `{ success, deleted_count, error }` |
| `list` | `(instance, namespace, cache_code_prefix?)` | `{ success, cache_codes, error }` |
| `has` | `(instance, namespace, cache_code)` | `{ success, exists, error }` |
| `setLock` | `(instance, namespace, cache_code, options)` | `{ success, applied, error }` |
| `releaseLock` | `(instance, namespace, cache_code)` | `{ success, error }` |

All methods are async. `instance` is the per-request lifecycle object from `Lib.Instance.initialize()`.

This adapter owns serialization: `set` JSON-stringifies the value before storing it as a string attribute (VALUE_FIELD); `get` JSON-parses the stored string before returning it to the cache module. The cache module passes raw JavaScript objects.

`setLock` uses `Lib.DynamoDB.writeRecordIfNotExists` (atomic `PutItem` with `attribute_not_exists` condition) with an expiry timestamp on EXPIRY_FIELD. Lock items use a distinct sort-key prefix. When the atomic write returns `applied: false`, the adapter checks whether the existing lock has expired (DynamoDB TTL sweeper may lag up to 48 hours). If it has, the stale lock is deleted and the write is retried. `releaseLock` uses `Lib.DynamoDB.deleteRecord` and is idempotent.

## Key Composition

```
partition key = namespace
sort key      = cache_code
```

Example: namespace `ProductCatalog`, cache_code `electronics:laptop-x1`

DynamoDB has a native composite key, so no flattening or separator is needed. `clear` and `list` use `Query` with `begins_with` on the sort key, scoped to one partition - O(N) over the partition, not the entire table.

## Behaviors That Must Not Be Violated When Generating Code

1. **Never call the adapter directly from application code.** Always go through the parent Cache module.

2. **`get` returns `value: null` on a miss.** Not an error. Also returns null when the item exists but has expired (DynamoDB TTL sweeper may lag).

3. **`set` with no `ttl_seconds` means no expiry.** The item persists until explicitly deleted.

4. **`delete` is idempotent.** A missing item is treated as success.

5. **`clear` short-circuits on zero matches.** No `batchDeleteRecords` call is made when the query returns an empty item list.

6. **`clear` and `list` are partition-scoped.** They use `Query` with `begins_with` on the sort key, scoped to one partition key (namespace). This is O(N) over the partition, not the entire table.

7. **The driver slot is named `DynamoDB`, never `AWS` or `Dynamo`.** The capability name, not the vendor name.

8. **Lock keys use a separate sort-key prefix.** Lock items share the same partition key as cache entries but use `LOCK_SORT_KEY_PREFIX` in the sort key, so they do not collide with cache_code values.

## Peer Dependencies

```
helper-utils                    (type checks - via shared_libs.Utils)
helper-debug                    (structured logging - via shared_libs.Debug)
helper-nosql-aws-dynamodb       (DynamoDB driver wrapper - via shared_libs.DynamoDB)
```

All are loaded into `Lib` by the application before the Cache parent is loaded. The adapter never requires any of them directly; it picks them from the injected container.

## Error Catalog

This adapter owns its own `store.errors.js`. Two types:

| Error | When |
|---|---|
| `ERRORS.SERVICE_UNAVAILABLE` | Driver-level call failed. Logged via `Lib.Debug.debug`, never surfaced to caller |
| `ERRORS.SERIALIZATION_FAILED` | `JSON.stringify` or `JSON.parse` threw on the cached value. This adapter owns serialization |

## Single Source of Truth

The store's source file is `store.js`; the config validator is `store.validators.js`. Key composition is routed through a single `composeKey(namespace, cache_code)` helper so the partition and sort key attribute names appear in exactly one place.
