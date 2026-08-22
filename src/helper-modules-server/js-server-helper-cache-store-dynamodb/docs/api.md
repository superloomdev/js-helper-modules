# API Reference - helper-cache-store-dynamodb

This adapter implements the 9-method store contract consumed by `helper-cache` (7 required + 2 lock methods). This document focuses on the DynamoDB-specific semantics.

## Adapter Factory

```js
const Store = require('@superloomdev/js-server-helper-cache-store-dynamodb')(Lib, {
  TABLE_NAME: 'my_cache_table'
});
```

## Serialization

This adapter owns serialization. `setCache` JSON-stringifies the value before storing it as a string attribute (`VALUE_FIELD`); `getCache` JSON-parses the stored string before returning it to the cache module. The cache module passes raw JavaScript objects. A serialization failure returns `CACHE_DYNAMODB_SERIALIZATION_FAILED`.

## Store Contract

### `getCache(instance, namespace, cache_code)`

Fetches the item by composite primary key (`PARTITION_KEY` = namespace, `SORT_KEY` = cache_code) via `Lib.DynamoDB.getRecord` with `consistentRead: true`. Returns `value: null` on a miss (key absent or expired). If the item exists but its `EXPIRY_FIELD` timestamp has passed, the adapter treats it as a miss and deletes the stale item.

**Return:** `{ success, value, error }`

---

### `setCache(instance, namespace, cache_code, value, ttl_seconds)`

JSON-serializes the value, builds a DynamoDB item with the composite key, value, and optional expiry timestamp, and writes it via `Lib.DynamoDB.writeRecord` (upsert). `ttl_seconds` is positional and optional - when absent, the item has no expiry. When provided, the adapter writes a Unix epoch timestamp to `EXPIRY_FIELD` and DynamoDB native TTL should be enabled on that attribute.

**Return:** `{ success, error }`

---

### `deleteCache(instance, namespace, cache_code)`

Deletes the item by composite primary key via `Lib.DynamoDB.deleteRecord`. Idempotent: a missing item is still `success: true`.

**Return:** `{ success, error }`

---

### `deleteCacheByPrefix(instance, namespace, cache_code_prefix)`

Queries for all items in the namespace with sort key `begins_with` the prefix, then batch-deletes them via `Lib.DynamoDB.batchDeleteRecords`. Short-circuits on zero matches. The `cache_code_prefix` is required.

**O(N) over the partition**, not the entire table. DynamoDB's composite key design means the query is scoped to one partition key (namespace).

**Return:** `{ success, deleted_count, error }`

---

### `clearCache(instance, namespace)`

Queries for all items in the namespace (no sort-key condition), then batch-deletes them via `Lib.DynamoDB.batchDeleteRecords`. Short-circuits on zero matches. Wipes every entry in the namespace.

**O(N) over the partition.** Same query cost as `deleteCacheByPrefix`.

**Return:** `{ success, deleted_count, error }`

---

### `listCacheCodes(instance, namespace, cache_code_prefix?)`

Queries for all items in the namespace with sort key `begins_with` the prefix, extracts the `SORT_KEY` attribute from each, and returns the `cache_codes`. When `cache_code_prefix` is omitted, lists every `cache_code` in the namespace.

**O(N) over the partition.** Same query cost as `deleteCacheByPrefix`/`clearCache`.

**Return:** `{ success, cache_codes, error }`

---

### `getCacheExists(instance, namespace, cache_code)`

Fetches the item via `Lib.DynamoDB.getRecord` and checks for item presence and expiry. Returns `exists: true` if the item is present and not expired, `false` otherwise. Does not deserialize the value.

DynamoDB does not have a native "exists" check without fetching the item. The full item is fetched; the value is simply not deserialized.

**Return:** `{ success, exists, error }`

---

### `setCacheLock(instance, namespace, cache_code, options)`

Builds a lock item with a separate sort key (`LOCK_SORT_KEY_PREFIX + cache_code`) and attempts an atomic create-only write via `Lib.DynamoDB.writeRecordIfNotExists` (PutItem with `attribute_not_exists` condition). The lock auto-expires via DynamoDB native TTL on `EXPIRY_FIELD`.

Returns `applied: true` if this caller acquired the lock, `false` if another caller already holds it. `applied: false` is not an error.

When the atomic write returns `applied: false`, the adapter checks whether the existing lock has expired (DynamoDB TTL sweeper may lag up to 48 hours). If the existing lock has expired, the stale lock is deleted and the atomic write is retried. The race window is tiny and the worst case is two callers fetching instead of one - stampede protection degrades gracefully.

**Return:** `{ success, applied, error }`

---

### `releaseCacheLock(instance, namespace, cache_code)`

Deletes the lock item by its composite primary key via `Lib.DynamoDB.deleteRecord`. Idempotent: succeeds even if the lock was already released or expired via TTL.

**Return:** `{ success, error }`

---

## Error Handling

All methods return `{ success: false, error: ERRORS.SERVICE_UNAVAILABLE }` on driver failure. The underlying error is logged via `Lib.Debug.debug`. The driver's own error type and message never leak through.

Serialization failures return `{ success: false, error: ERRORS.SERIALIZATION_FAILED }`.
