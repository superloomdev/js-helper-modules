# ROBOTS.md. `helper-cache`

Compact, AI-targeted reference for the public interface. Humans should read `README.md` and `docs/`.

## Module Overview

Application-level cache with TTL and namespacing. Cache-aside pattern: the application fetches from the source database on a miss and populates the cache; this module never reads the source. Eight operations cover the lifecycle of a cached value: `setCache`, `getCache`, `deleteCache`, `getOrFetchCache` (cache-aside with optional stampede protection), `getCacheExists` (existence check), `deleteCacheByPrefix` (selective mass invalidation by prefix), `clearCache` (wipe all entries in a namespace), and `listCacheCodes` (enumerate cache_codes by prefix). Storage backends are provided by standalone adapter packages. The caller passes the chosen ready-to-use store object directly as `CONFIG.Store` - no string dispatch inside this module.

## Factory Pattern

```js
export default function loader (shared_libs, config) {
  // Returns independent instance with isolated Lib + CONFIG.
  // Validates CONFIG at construction (Store must be a ready-to-use object).
  // Validates the 7-method store contract at construction.
  // When GET_OR_FETCH_LOCK_ENABLED is true, validates setCacheLock and releaseCacheLock.
  // Throws synchronously on misconfiguration.
  return { setCache, getCache, deleteCache, getOrFetchCache, getCacheExists, deleteCacheByPrefix, clearCache, listCacheCodes };
}
```

`CONFIG.Store` is a **ready-to-use store object**, not a factory function. The loader uses it directly. The adapter is a fully independent module that owns its own Lib/Config/ERRORS. Passing a factory function throws `CONFIG.Store is required and must be a ready-to-use store object`.

```js
import cacheStoreValkey from 'helper-cache-store-valkey';
import cache from 'helper-cache';

const Store = cacheStoreValkey(Lib, {
  KEY_PREFIX: 'cache:'
});

Lib.Cache = cache(Lib, {
  Store: Store
});
```

## Public Functions

### `setCache(instance, namespace, cache_code, value, ttl_seconds?)` *(async)*

Store a value in the cache with an optional TTL (seconds). Overwrites any existing entry. The value is passed to the store as a raw JavaScript object; the store adapter handles backend-specific serialization.

- **namespace**: String, required. Logical group for the cache entry.
- **cache_code**: String, required. Specific entry identifier within the namespace.
- **value**: Any value, required. The store adapter serializes it.
- **ttl_seconds**: Number, optional. Lifetime in seconds. Omit for no expiry.
- **Returns**: `{ success, error }`.

### `getCache(instance, namespace, cache_code)` *(async)*

Read a value from the cache. Returns `value: null` on a cache miss (entry absent or expired). A miss is not an error. The store adapter deserializes the stored value before returning it.

- **Returns**: `{ success, value, error }`. `value` is the deserialized object on a hit, `null` on a miss.

### `getCacheExists(instance, namespace, cache_code)` *(async)*

Check whether a cache entry exists without fetching its value. Returns `exists: true` if the key is present and not expired, `false` otherwise. Useful for marker keys and conditional logic that only needs presence, not the payload.

- **Returns**: `{ success, exists, error }`. Does not include a `value` field.

### `deleteCache(instance, namespace, cache_code)` *(async)*

Remove one cache entry. Idempotent: succeeds even if the cache_code does not exist.

- **Returns**: `{ success, error }`.

### `deleteCacheByPrefix(instance, namespace, cache_code_prefix)` *(async)*

Selective mass invalidation. Remove all entries in `namespace` whose `cache_code` starts with `cache_code_prefix`. The prefix is required - use `clearCache` to wipe every entry in a namespace. Entries in other namespaces are never touched.

- **cache_code_prefix**: String, required. Prefix filter.
- **Returns**: `{ success, deleted_count, error }`.

### `clearCache(instance, namespace)` *(async)*

Wipe every entry in a namespace. Use `deleteCacheByPrefix` for selective removal by prefix. Entries in other namespaces are never touched.

- **Returns**: `{ success, deleted_count, error }`.

### `listCacheCodes(instance, namespace, cache_code_prefix?)` *(async)*

List cache_codes in `namespace` whose `cache_code` starts with `cache_code_prefix`. When omitted, lists every cache_code in the namespace. Returns cache_codes without the namespace prefix.

- **Returns**: `{ success, cache_codes, error }`.

### `getOrFetchCache(instance, namespace, cache_code, ttl_seconds?, fetcher)` *(async)*

Cache-aside with optional distributed stampede protection. On a cache hit, returns the cached value without calling the fetcher. On a miss, calls the fetcher, caches the result, and returns it. When `GET_OR_FETCH_LOCK_ENABLED` is true, acquires a distributed lock in the store before fetching, so concurrent requests for the same key wait rather than all calling the fetcher. The wait is bounded by `GET_OR_FETCH_LOCK_WAIT_TIMEOUT_MS`; when exceeded, returns `CACHE_LOCK_WAIT_TIMEOUT`.

- **namespace**: String, required.
- **cache_code**: String, required.
- **ttl_seconds**: Number, optional. TTL for the cached value. Omit for no expiry.
- **fetcher**: Async function, required. Called on a miss. Returns any value or throws.
- **Returns**: `{ success, value, error }`. If the fetcher throws, returns `CACHE_FETCHER_FAILED` and nothing is cached. If the lock wait times out, returns `CACHE_LOCK_WAIT_TIMEOUT`.

This is NOT cache-through. The cache module does not know about the source database. The caller provides the fetcher.

## Configuration

| Key | Type | Required | Default | Notes |
|---|---|---|---|---|
| `Store` | object | Yes | - | Ready-to-use store object. Configure adapter independently, then pass result |
| `GET_OR_FETCH_LOCK_ENABLED` | Boolean | No | `false` | Enable distributed stampede protection in `getOrFetchCache` |
| `GET_OR_FETCH_LOCK_TIMEOUT_MS` | Number | No | `3000` | Lock auto-expiry in milliseconds. Handles crashed processes |
| `GET_OR_FETCH_LOCK_RETRY_MS` | Number | No | `50` | Poll interval when waiting for a lock holder to finish |
| `GET_OR_FETCH_LOCK_RETRY_JITTER_MS` | Number | No | `20` | Random 0-N ms added to each retry to avoid synchronized retry bursts |
| `GET_OR_FETCH_LOCK_WAIT_TIMEOUT_MS` | Number | No | `5000` | Maximum total milliseconds to wait for a lock holder before returning `CACHE_LOCK_WAIT_TIMEOUT` |

`Store` is the primary config key. The cache module composes no backend key - it forwards `namespace` and `cache_code` to the store as separate parameters. `KEY_PREFIX` and `KEY_SEPARATOR` belong to the Valkey adapter, not here.

When `GET_OR_FETCH_LOCK_ENABLED` is true, the loader validates that the store implements `setCacheLock` and `releaseCacheLock`. A store without lock support throws at boot.

## Error Catalog

| `error.type` | Trigger | Surfaces in |
|---|---|---|
| `CACHE_STORE_UNAVAILABLE` | Store adapter returned `{ success: false }` or threw | All async functions |
| `CACHE_FETCHER_FAILED` | The fetcher function passed to `getOrFetchCache` threw an error | `getOrFetchCache` |
| `CACHE_LOCK_WAIT_TIMEOUT` | `getOrFetchCache` waited for a lock holder but the value never appeared within `GET_OR_FETCH_LOCK_WAIT_TIMEOUT_MS` | `getOrFetchCache` |

Error shape is frozen at module load. The store adapter's own error type and message never leak through. Serialization errors are owned by the store adapter, not this module.

## Critical Behavior for Code-Generating Tools

- **`instance` is always the first argument.** Every function receives the per-request lifecycle object.
- **`Store` is a ready-to-use object, not a factory function.** The loader throws on factory function, string, or missing.
- **Programmer errors throw, operational errors return.** Missing namespace or cache_code throws `TypeError`; store failures return `{ success: false, error }`.
- **A cache miss is not an error.** `getCache` on an absent or expired entry returns `{ success: true, value: null, error: null }`.
- **The store adapter owns serialization.** `setCache` passes a raw JavaScript object to the store; `getCache` receives a raw JavaScript object back. The store adapter handles JSON.stringify/parse. This module does not serialize.
- **The cache module never reads the source database.** It uses the cache-aside pattern. On a miss, the application fetches from the source and populates the cache, or uses `getOrFetchCache` which calls a caller-provided fetcher.
- **`getOrFetchCache` is not cache-through.** The cache module does not know about the source database. The caller provides the fetcher function.
- **Distributed locking is opt-in.** When `GET_OR_FETCH_LOCK_ENABLED` is false (default), `getOrFetchCache` does plain fetch-and-cache. When true, it uses `setCacheLock`/`releaseCacheLock` on the store for stampede protection. The wait for a lock holder is bounded by `GET_OR_FETCH_LOCK_WAIT_TIMEOUT_MS`.
- **`deleteCacheByPrefix`, `clearCache`, and `listCacheCodes` use prefix match only.** Range operators (`gt`, `lt`, `between`) are database queries, not cache operations.

## Store Contract

Seven required async methods, each returning a result envelope:

| Method | Signature | Returns |
|---|---|---|
| `getCache` | `(instance, namespace, cache_code)` | `{ success, value, error }` - `value: null` on miss |
| `setCache` | `(instance, namespace, cache_code, value, ttl_seconds)` | `{ success, error }` |
| `deleteCache` | `(instance, namespace, cache_code)` | `{ success, error }` |
| `deleteCacheByPrefix` | `(instance, namespace, cache_code_prefix)` | `{ success, deleted_count, error }` |
| `clearCache` | `(instance, namespace)` | `{ success, deleted_count, error }` |
| `listCacheCodes` | `(instance, namespace, cache_code_prefix?)` | `{ success, cache_codes, error }` |
| `getCacheExists` | `(instance, namespace, cache_code)` | `{ success, exists, error }` |

Two optional async methods, required only when `GET_OR_FETCH_LOCK_ENABLED` is true:

| Method | Signature | Returns |
|---|---|---|
| `setCacheLock` | `(instance, namespace, cache_code, options)` | `{ success, applied, error }` - `applied: true` if this caller acquired the lock |
| `releaseCacheLock` | `(instance, namespace, cache_code)` | `{ success, error }` |

Construction hard-validates the seven required methods. A missing method throws at boot. Lock methods are validated only when locking is enabled. The store receives `namespace` and `cache_code` as separate parameters - no adapter ever decomposes a composed key. The store owns serialization: `setCache` receives a raw JavaScript object, `getCache` returns a raw JavaScript object.

## Peer Dependencies

| `Lib.*` | Source | Used for |
|---|---|---|
| `Lib.Utils` | `helper-utils` | Type checks |
| `Lib.Debug` | `helper-debug` | Diagnostics for store failures |

`helper-instance` is a peer dependency because the `instance` parameter on every public function must be a `helper-instance` product, but the cache module does not call `Lib.Instance` itself - the caller creates the instance object.

Optional peer dependencies (at least one must be installed and passed as `CONFIG.Store`):

| Package | Backend |
|---|---|
| `helper-cache-store-valkey` | Valkey/Redis (via `kv-valkey`) |
| `helper-cache-store-dynamodb` | DynamoDB (via `nosql-aws-dynamodb`) |

The store adapter (`CONFIG.Store`) is a fully independent module that owns its own driver helper (`Lib.KV` for Valkey, `Lib.NoDB` for DynamoDB, `Lib.MongoDB` for MongoDB). The cache module never imports a database driver helper directly.

## Out of Scope

- **Client-side caching.** This module is server-side only. Client-side caching is a separate system.
- **Cache-through / read-through.** The cache module does not fetch from the source database on a miss.
- **Range operators on cache_codes.** `deleteCacheByPrefix`, `clearCache`, and `listCacheCodes` support prefix match only.
- **Cache warming / precomputation.** The application populates the cache on demand.
- **Cache statistics / hit rate tracking.** Not tracked by this module.

## Documentation

- `docs/api.md`. Full API reference (every function, every parameter, every error type)
- `docs/configuration.md`. Loader pattern, every config key, peer dependencies, testing tier
- `docs/data-model.md`. Entry shape, core concepts (namespace, cache_code, TTL), design decisions
- Storage adapters: see the README's "Storage Adapters" section. Per-backend schema, indexes, TTL, and configuration shape live in each adapter package's own README (`helper-cache-store-*`)
