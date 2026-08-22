# API Reference. `helper-cache`

Every exported function on the public interface, with parameters, return shape, and notes. For loader semantics and configuration keys see [Configuration](configuration.md). For the canonical entry shape and per-field design rationale see [Data Model](data-model.md). For backend selection see the [Storage Adapters](../README.md#storage-adapters) section in the module README; for per-backend configuration shape see each adapter package's own README.

## On This Page

- [Conventions](#conventions)
- [The Response Envelope](#the-response-envelope)
- [setCache](#setcacheinstance-namespace-cache_code-value-ttl_seconds)
- [getCache](#getcacheinstance-namespace-cache_code)
- [getCacheExists](#getcacheexistsinstance-namespace-cache_code)
- [deleteCache](#deletecacheinstance-namespace-cache_code)
- [deleteCacheByPrefix](#deletecachebyprefixinstance-namespace-cache_code_prefix)
- [clearCache](#clearcacheinstance-namespace)
- [listCacheCodes](#listcachecodesinstance-namespace-cache_code_prefix)
- [getOrFetchCache](#getorfetchcacheinstance-namespace-cache_code-ttl_seconds-fetcher)
- [Error Catalog](#error-catalog)

---

## Conventions

| Pattern | Behavior |
|---|---|
| **`instance` is always the first argument** | Every operation receives the per-request lifecycle object returned by `Lib.Instance.initialize()` |
| **Programmer errors throw `TypeError` synchronously** | Missing namespace, missing cache_code, non-string prefix, non-positive TTL throw `TypeError` at the call-site |
| **Operational errors return `{ success: false, error }`** | Store driver failures and fetcher failures come through the response envelope |
| **A cache miss is not an error** | `getCache` on an absent or expired entry returns `{ success: true, value: null, error: null }` |
| **The store adapter owns serialization** | `setCache` passes a raw JavaScript object to the store; `getCache` receives a raw JavaScript object back. The store adapter handles JSON.stringify/parse. This module does not serialize |
| **The cache module never reads the source database** | It uses the cache-aside pattern. On a miss, the application fetches from the source and populates the cache, or uses `getOrFetchCache` with a caller-provided fetcher |

---

## The Response Envelope

| Field | Type | Description |
|---|---|---|
| `success` | `boolean` | `true` on success. `false` on operational failure |
| `error` | `object \| null` | `{ type, message }` on failure. `null` on success. See [Error Catalog](#error-catalog) |
| `value` | `* \| null` | The cached value on `getCache` success. `null` on a miss or failure |
| `deleted_count` | `number` | Number of entries removed by `deleteCacheByPrefix` or `clearCache` |
| `cache_codes` | `string[]` | Entry identifiers returned by `listCacheCodes`, without the namespace prefix |

---

## `setCache(instance, namespace, cache_code, value, ttl_seconds)`

Store a value in the cache with an optional TTL (seconds). Overwrites any existing entry at the same `(namespace, cache_code)`.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `instance` | `object` | Yes | Request instance for time and lifecycle |
| `namespace` | `string` | Yes | Logical group for the cache entry |
| `cache_code` | `string` | Yes | Specific entry identifier within the namespace |
| `value` | `*` | Yes | Value to cache. The store adapter serializes it |
| `ttl_seconds` | `number` | No | Lifetime in seconds. Omit for no expiry |

**Return shape.** `{ success, error }`.

**Lifecycle.**

1. Validate identifiers and TTL (throws `TypeError` on programmer error).
2. Delegate to `store.setCache(instance, namespace, cache_code, value, ttl_seconds)`. Store failure becomes `CACHE_STORE_UNAVAILABLE`. The store adapter owns serialization.

---

## `getCache(instance, namespace, cache_code)`

Read a value from the cache. Returns `value: null` on a cache miss (entry absent or expired). A miss is not an error.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `instance` | `object` | Yes | Request instance for time and lifecycle |
| `namespace` | `string` | Yes | Logical group for the cache entry |
| `cache_code` | `string` | Yes | Specific entry identifier within the namespace |

**Return shape.**

```js
// Cache hit
{ success: true, value: { id: 'laptop-x1', price: 1299 }, error: null }

// Cache miss
{ success: true, value: null, error: null }

// Store failure
{ success: false, value: null, error: { type: 'CACHE_STORE_UNAVAILABLE', message: '...' } }
```

**Lifecycle.**

1. Validate identifiers (throws `TypeError` on programmer error).
2. Delegate to `store.getCache(instance, namespace, cache_code)`. Store failure becomes `CACHE_STORE_UNAVAILABLE`.
3. A `null` store value is a miss. Pass the store's value straight through. The store adapter owns deserialization.

---

## `getCacheExists(instance, namespace, cache_code)`

Check whether a cache entry exists without fetching its value. Returns `exists: true` if the key is present and not expired, `false` if absent or expired. Useful for marker keys and conditional logic that only needs presence, not the payload.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `instance` | `object` | Yes | Request instance for time and lifecycle |
| `namespace` | `string` | Yes | Logical group for the cache entry |
| `cache_code` | `string` | Yes | Specific entry identifier within the namespace |

**Return shape.** `{ success, exists, error }`. Does not include a `value` field.

**Lifecycle.**

1. Validate identifiers (throws `TypeError` on programmer error).
2. Delegate to `store.getCacheExists(instance, namespace, cache_code)`. Store failure becomes `CACHE_STORE_UNAVAILABLE`.

---

## `deleteCache(instance, namespace, cache_code)`

Remove one cache entry. Idempotent: succeeds even if the `cache_code` does not exist.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `instance` | `object` | Yes | Request instance for time and lifecycle |
| `namespace` | `string` | Yes | Logical group for the cache entry |
| `cache_code` | `string` | Yes | Specific entry identifier within the namespace |

**Return shape.** `{ success, error }`.

---

## `deleteCacheByPrefix(instance, namespace, cache_code_prefix)`

Selective mass invalidation. Remove all entries in `namespace` whose `cache_code` starts with `cache_code_prefix`. The prefix is required - use `clearCache` to wipe every entry in a namespace. Entries in other namespaces are never touched.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `instance` | `object` | Yes | Request instance for time and lifecycle |
| `namespace` | `string` | Yes | Logical group for the cache entries |
| `cache_code_prefix` | `string` | Yes | Prefix filter. Only entries whose cache_code starts with this are removed |

**Return shape.** `{ success, deleted_count, error }`.

**Example.**

```js
// Remove every electronics entry in ProductCatalog
await Lib.Cache.deleteCacheByPrefix(instance, 'ProductCatalog', 'electronics:');
```

---

## `clearCache(instance, namespace)`

Wipe every entry in a namespace. Use `deleteCacheByPrefix` for selective removal by prefix. Entries in other namespaces are never touched.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `instance` | `object` | Yes | Request instance for time and lifecycle |
| `namespace` | `string` | Yes | Logical group for the cache entries |

**Return shape.** `{ success, deleted_count, error }`.

**Example.**

```js
// Remove every entry in ProductCatalog
await Lib.Cache.clearCache(instance, 'ProductCatalog');
```

---

## `listCacheCodes(instance, namespace, cache_code_prefix)`

List `cache_code`s in `namespace` whose `cache_code` starts with `cache_code_prefix`. When `cache_code_prefix` is omitted, lists every `cache_code` in the namespace. Returns `cache_codes` without the namespace prefix - just the entity identifier portion.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `instance` | `object` | Yes | Request instance for time and lifecycle |
| `namespace` | `string` | Yes | Logical group for the cache entries |
| `cache_code_prefix` | `string` | No | Prefix filter. Omit to list the whole namespace |

**Return shape.**

```js
{ success: true, cache_codes: ['electronics:laptop-x1', 'electronics:mouse-z2'], error: null }
```

---

## `getOrFetchCache(instance, namespace, cache_code, ttl_seconds, fetcher)`

Cache-aside with optional distributed stampede protection. On a cache hit, returns the cached value without calling the fetcher. On a miss, calls the fetcher, caches the result, and returns it.

When `GET_OR_FETCH_LOCK_ENABLED` is `true`, acquires a distributed lock in the store before fetching, so concurrent requests for the same key wait rather than all calling the fetcher. Exactly one concurrent caller fetches; the rest wait and retry the cache read until the value appears or the lock expires and they acquire it themselves.

This is NOT cache-through. The cache module does not know about the source database. The caller provides the fetcher function.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `instance` | `object` | Yes | Request instance for time and lifecycle |
| `namespace` | `string` | Yes | Logical group for the cache entry |
| `cache_code` | `string` | Yes | Specific entry identifier within the namespace |
| `ttl_seconds` | `number` | Yes | TTL for the cached value (seconds) |
| `fetcher` | `function` | Yes | Async function called on a miss. Returns any value or throws |

**Return shape.**

```js
// Cache hit or successful fetch
{ success: true, value: { id: 'laptop-x1', price: 1299 }, error: null }

// Fetcher threw
{ success: false, value: null, error: { type: 'CACHE_FETCHER_FAILED', message: '...' } }
```

**Lifecycle.**

1. Validate identifiers, TTL, and fetcher (throws `TypeError` on programmer error).
2. Check the cache. On a hit, return immediately. The fetcher is never called.
3. On a miss with lock disabled: call the fetcher, cache the result, return it.
4. On a miss with lock enabled: acquire the lock via `store.setCacheLock`. If acquired, call the fetcher, cache, release the lock, return. If not acquired, wait and retry the cache read until the value appears or the lock expires and this caller acquires it.
5. If the fetcher throws, nothing is cached, the lock is released immediately, and `CACHE_FETCHER_FAILED` is returned.

---

## Error Catalog

All operational errors live in `cache.errors.js`. Every failure path returns a frozen `{ type, message }` object from this catalog.

| `error.type` | Trigger |
|---|---|
| `CACHE_STORE_UNAVAILABLE` | Any store adapter call returned `success: false` or threw |
| `CACHE_FETCHER_FAILED` | The fetcher function passed to `getOrFetchCache` threw an error |

Error shape is frozen at module load:

```js
{ type: 'CACHE_STORE_UNAVAILABLE', message: 'Cache store operation failed' }
```

The store adapter's own error type and message never leak through. Driver detail is logged at debug level instead. Serialization errors are owned by the store adapter, not this module.
