# API Reference - helper-cache-store-valkey

This adapter implements the 9-method store contract consumed by `helper-cache` (7 required + 2 lock methods). This document focuses on the Valkey-specific semantics.

## Adapter Factory

```js
import cacheStoreValkey from '@superloomdev/js-server-helper-cache-store-valkey';

const Store = cacheStoreValkey(Lib, {
  KEY_PREFIX: 'cache:',
  KEY_SEPARATOR: ':',
  LOCK_KEY_PREFIX: 'cache:lock:'
});
```

## Serialization

This adapter owns serialization. `setCache` JSON-stringifies the value before handing it to `Lib.KV.set`; `getCache` JSON-parses the stored string before returning it to the cache module. The cache module passes raw JavaScript objects. A serialization failure returns `CACHE_VALKEY_SERIALIZATION_FAILED`.

## Store Contract

### `getCache(instance, namespace, cache_code)`

Composes a flat Valkey key `KEY_PREFIX + namespace + KEY_SEPARATOR + cache_code` and delegates to `Lib.KV.get`. Returns `value: null` on a miss (key absent or expired via native Valkey TTL). The stored JSON string is deserialized before being returned.

**Return:** `{ success, value, error }`

---

### `setCache(instance, namespace, cache_code, value, ttl_seconds)`

Composes the key, JSON-serializes the value, and delegates to `Lib.KV.set`. `ttl_seconds` is positional and optional - when absent, the key has no expiry. Valkey handles expiry natively via `SET key value EX ttl_seconds`.

**Return:** `{ success, error }`

---

### `deleteCache(instance, namespace, cache_code)`

Composes the key and delegates to `Lib.KV.delete`. Idempotent: a `deleted_count` of 0 is still `success: true`.

**Return:** `{ success, error }`

---

### `deleteCacheByPrefix(instance, namespace, cache_code_prefix)`

SCAN for every key matching `KEY_PREFIX + namespace + KEY_SEPARATOR + cache_code_prefix + '*'`, then delete them in one `Lib.KV.deleteMany` call. Short-circuits on zero matches to avoid a needless roundtrip. The `cache_code_prefix` is required.

**O(N) over the entire keyspace.** `SCAN` iterates every key in the database and filters after retrieval; the `MATCH` pattern does not narrow the scan. See [Configuration](configuration.md#deletecachebyprefix-clearcache-and-listcachecodes-complexity) for the cost implications.

**Return:** `{ success, deleted_count, error }`

---

### `clearCache(instance, namespace)`

SCAN for every key matching `KEY_PREFIX + namespace + KEY_SEPARATOR + '*'`, then delete them in one `Lib.KV.deleteMany` call. Short-circuits on zero matches. Wipes every entry in the namespace.

**O(N) over the entire keyspace.** Same SCAN cost as `deleteCacheByPrefix`.

**Return:** `{ success, deleted_count, error }`

---

### `listCacheCodes(instance, namespace, cache_code_prefix?)`

SCAN for matching keys, strip the `KEY_PREFIX + namespace + KEY_SEPARATOR` prefix from each, and return the `cache_codes`. When `cache_code_prefix` is omitted, lists every `cache_code` in the namespace.

**O(N) over the entire keyspace.** Same SCAN cost as `deleteCacheByPrefix`/`clearCache`.

**Return:** `{ success, cache_codes, error }`

---

### `getCacheExists(instance, namespace, cache_code)`

Composes the key and delegates to `Lib.KV.getKeyExists`. Returns `exists: true` if the key is present and not expired, `false` otherwise. Does not fetch the value.

**Return:** `{ success, exists, error }`

---

### `setCacheLock(instance, namespace, cache_code, options)`

Composes a lock key `LOCK_KEY_PREFIX + namespace + KEY_SEPARATOR + cache_code` and delegates to `Lib.KV.setIfNotExists` (atomic `SET NX`) with a TTL derived from `options.timeout_ms`. Lock keys are separate from cache entry keys, so deleting a cache entry never releases a lock.

Returns `applied: true` if this caller acquired the lock, `false` if another caller already holds it. `applied: false` is not an error.

**Return:** `{ success, applied, error }`

---

### `releaseCacheLock(instance, namespace, cache_code)`

Composes the lock key and delegates to `Lib.KV.delete`. Idempotent: succeeds even if the lock was already released or expired via TTL.

**Return:** `{ success, error }`

---

## Error Handling

All methods return `{ success: false, error: ERRORS.SERVICE_UNAVAILABLE }` on driver failure. The underlying error is logged via `Lib.Debug.debug`. The driver's own error type and message never leak through.

Serialization failures return `{ success: false, error: ERRORS.SERIALIZATION_FAILED }`.
