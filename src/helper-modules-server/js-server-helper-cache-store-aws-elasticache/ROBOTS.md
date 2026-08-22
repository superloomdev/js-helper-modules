# helper-cache-store-aws-elasticache. AI Reference

Class F storage adapter. ElastiCache (Redis-compatible engine) backend for `helper-cache`. Fully independent module that owns its own CONFIG, ERRORS, and Validators. Standard factory shape: `(shared_libs, config)`. Configured and instantiated independently, then passed to the Cache parent as a ready-to-use store object.

Requires a running ElastiCache instance. Uses `helper-kv-aws-elasticache` (native driver wrapper) injected via `shared_libs.KV`.

## Adapter Factory

```js
const Store = require('@superloomdev/js-server-helper-cache-store-aws-elasticache')(Lib, {
  KEY_PREFIX: 'cache:',
  KEY_SEPARATOR: ':'
});
```

| Argument | Type | Required | Description |
|---|---|---|---|
| `shared_libs` | Object | Yes | Dependency container (Utils, Debug, KV) |
| `KEY_PREFIX` | String | Yes | Prefix prepended to every composed ElastiCache key |
| `KEY_SEPARATOR` | String | Yes | Separator between namespace and cache_code |

Returns a ready-to-use Store interface. The Cache parent receives this object and calls the contract methods.

## Configuration

```js
{
  KEY_PREFIX: 'cache:',        // required. isolates cache keys from non-cache keys
  KEY_SEPARATOR: ':',          // required. separator in composed key
  LOCK_KEY_PREFIX: 'cache:lock:' // required. prefix for distributed lock keys
}
```

All three keys live on this adapter, not on the cache module. The cache module composes no backend key. Lock keys use `LOCK_KEY_PREFIX` instead of `KEY_PREFIX` so they are separate from cache entry keys.

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

This adapter owns serialization: `setCache` JSON-stringifies the value before handing it to `Lib.KV.set`; `getCache` JSON-parses the stored string before returning it to the cache module. The cache module passes raw JavaScript objects.

`setCacheLock` uses `Lib.KV.setIfNotExists` (atomic `SET NX`) with a TTL derived from `options.timeout_ms`. Lock keys are separate from cache entry keys. `releaseCacheLock` uses `Lib.KV.delete` and is idempotent.

## Key Composition

```
full key = KEY_PREFIX + namespace + KEY_SEPARATOR + cache_code
```

Example: `cache:ProductCatalog:electronics:laptop-x1`

The adapter strips a known-length prefix to recover the cache_code; it does not split on `KEY_SEPARATOR`. A cache_code containing the separator round-trips correctly.

## Behaviors That Must Not Be Violated When Generating Code

1. **Never call the adapter directly from application code.** Always go through the parent Cache module. The adapter is configured independently and passed as a ready-to-use store object to the Cache parent.

2. **`getCache` returns `value: null` on a miss.** Not an error. ElastiCache handles TTL natively, so an expired key is simply absent.

3. **`setCache` with no `ttl_seconds` means no expiry.** The key persists until explicitly deleted.

4. **`deleteCache` is idempotent.** A missing key is treated as success.

5. **`deleteCacheByPrefix` and `clearCache` short-circuit on zero matches.** No `deleteMany` call is made when `scan` returns an empty key list.

6. **`deleteCacheByPrefix`, `clearCache`, and `listCacheCodes` are O(N) over the entire keyspace.** `SCAN` iterates every key in the database and filters after retrieval. ElastiCache exposes a flat keyspace with no partition or sort key. On node-based ElastiCache this costs CPU only; on serverless ElastiCache it costs ECUs (ElastiCache Compute Units) proportional to data scanned. Prefer targeted `deleteCache` for routine invalidation.

7. **The driver slot is named `KV`, never `ElastiCache` or `Redis`.** The capability name, not the vendor name.

8. **No SET-based secondary index.** Rejected: would add `SADD` to every `setCache` call and need its own cleanup. O(N) `deleteCacheByPrefix`/`clearCache` is the accepted trade.

## Peer Dependencies

```
helper-utils              (type checks - via shared_libs.Utils)
helper-debug              (structured logging - via shared_libs.Debug)
helper-kv-aws-elasticache (ElastiCache driver wrapper - via shared_libs.KV)
```

All are loaded into `Lib` by the application before the Cache parent is loaded. The adapter never requires any of them directly; it picks them from the injected container.

## Error Catalog

This adapter owns its own `store.errors.js`. Two types:

| Error | When |
|---|---|
| `ERRORS.SERVICE_UNAVAILABLE` | Driver-level call failed. Logged via `Lib.Debug.debug`, never surfaced to caller |
| `ERRORS.SERIALIZATION_FAILED` | `JSON.stringify` or `JSON.parse` threw on the cached value. This adapter owns serialization |

## Single Source of Truth

The store's source file is `store.js`; the config validator is `store.validators.js`. Key composition is routed through a single `keyBase(namespace)` helper so the prefix and separator appear in exactly one place.
