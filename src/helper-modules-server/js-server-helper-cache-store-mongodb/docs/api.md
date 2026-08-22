# API Reference - helper-cache-store-mongodb

This adapter implements the 9-method store contract consumed by `helper-cache` (7 required + 2 lock methods). This document focuses on the MongoDB-specific semantics.

## Adapter Factory

```js
const Store = require('@superloomdev/js-server-helper-cache-store-mongodb')(Lib, {
  COLLECTION_NAME: 'my_cache_collection'
});
```

## Serialization

This adapter does not serialize. MongoDB stores native BSON, so `setCache` passes the raw JavaScript object straight through to `Lib.MongoDB` as the `VALUE_FIELD`; `getCache` returns the stored BSON object directly. The cache module passes raw JavaScript objects. There is no `JSON.stringify` or `JSON.parse` step and no serialization error.

## Store Contract

### `getCache(instance, namespace, cache_code)`

Fetches the document by composite `_id` (`namespace + '\u001F' + cache_code`) via `Lib.MongoDB.getRecord`. Returns `value: null` on a miss (document absent or expired). If the document exists but its `EXPIRY_FIELD` Date has passed, the adapter treats it as a miss and deletes the stale document.

**Return:** `{ success, value, error }`

---

### `setCache(instance, namespace, cache_code, value, ttl_seconds)`

Builds a MongoDB document with the composite `_id`, the value as a native BSON object field (`VALUE_FIELD`), and an optional expiry Date, then writes it via `Lib.MongoDB.writeRecord` (upsert via `replaceOne`). `ttl_seconds` is positional and optional - when absent, the document has no expiry. When provided, the adapter writes a BSON Date to `EXPIRY_FIELD` and a MongoDB TTL index should be created on that field.

**Return:** `{ success, error }`

---

### `deleteCache(instance, namespace, cache_code)`

Deletes the document by composite `_id` via `Lib.MongoDB.deleteRecord`. Idempotent: a missing document is still `success: true`.

**Return:** `{ success, error }`

---

### `deleteCacheByPrefix(instance, namespace, cache_code_prefix)`

Deletes all documents in the namespace whose `_id` matches a left-anchored regex prefix via `Lib.MongoDB.deleteRecordsByFilter`. Short-circuits on zero matches. The `cache_code_prefix` is required.

**O(K) where K = matching documents**, not the entire collection. MongoDB converts the left-anchored regex to an index range scan on the `_id` B-tree.

**Return:** `{ success, deleted_count, error }`

---

### `clearCache(instance, namespace)`

Deletes all documents in the namespace via `Lib.MongoDB.deleteRecordsByFilter` with a left-anchored regex on `_id` matching the namespace prefix. Short-circuits on zero matches. Wipes every entry in the namespace.

**O(K) where K = matching documents.** Same query cost as `deleteCacheByPrefix`.

**Return:** `{ success, deleted_count, error }`

---

### `listCacheCodes(instance, namespace, cache_code_prefix?)`

Queries for all documents in the namespace whose `_id` matches a left-anchored regex prefix, extracts the `cache_code` from each `_id` by stripping the namespace and separator, and returns the `cache_codes`. When `cache_code_prefix` is omitted, lists every `cache_code` in the namespace.

**O(K) where K = matching documents.** Same query cost as `deleteCacheByPrefix`/`clearCache`.

**Return:** `{ success, cache_codes, error }`

---

### `getCacheExists(instance, namespace, cache_code)`

Fetches the document via `Lib.MongoDB.getRecord` and checks for document presence and expiry. Returns `exists: true` if the document is present and not expired, `false` otherwise. Does not return the value to the caller.

MongoDB does not have a native "exists" check without fetching the document. A projection could reduce the data transfer, but the overhead of fetching the full document is acceptable for a cache. The value is simply not returned to the caller.

**Return:** `{ success, exists, error }`

---

### `setCacheLock(instance, namespace, cache_code, options)`

Builds a lock document with a separate `_id` (`LOCK_ID_PREFIX + namespace + '\u001F' + cache_code`) and attempts an atomic create-only insert via `Lib.MongoDB.insertRecordIfNotExists` (insertOne that catches the E11000 duplicate key error). The lock auto-expires via the MongoDB TTL index on `EXPIRY_FIELD`.

Returns `applied: true` if this caller acquired the lock, `false` if another caller already holds it. `applied: false` is not an error.

When the atomic insert returns `applied: false`, the adapter checks whether the existing lock has expired (the MongoDB TTL sweeper may lag up to 60 seconds). If the existing lock has expired, the stale lock is deleted and the atomic insert is retried. The race window is tiny and the worst case is two callers fetching instead of one - stampede protection degrades gracefully.

**Return:** `{ success, applied, error }`

---

### `releaseCacheLock(instance, namespace, cache_code)`

Deletes the lock document by its `_id` via `Lib.MongoDB.deleteRecord`. Idempotent: succeeds even if the lock was already released or expired via the TTL index.

**Return:** `{ success, error }`

---

## Error Handling

All methods return `{ success: false, error: ERRORS.SERVICE_UNAVAILABLE }` on driver failure. The underlying error is logged via `Lib.Debug.debug`. The driver's own error type and message never leak through.
