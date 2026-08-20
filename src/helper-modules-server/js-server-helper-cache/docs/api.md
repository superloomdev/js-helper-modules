# API Reference. `helper-cache`

Every exported function on the public interface, with parameters, return shape, and notes. For loader semantics and configuration keys see [Configuration](configuration.md). For the canonical entry shape and per-field design rationale see [Data Model](data-model.md). For backend selection see the [Storage Adapters](../README.md#storage-adapters) section in the module README; for per-backend configuration shape see each adapter package's own README.

## On This Page

- [Conventions](#conventions)
- [The Response Envelope](#the-response-envelope)
- [set](#setinstance-namespace-cache_code-value-ttl_seconds)
- [get](#getinstance-namespace-cache_code)
- [delete](#deleteinstance-namespace-cache_code)
- [clear](#clearinstance-namespace-cache_code_prefix)
- [list](#listinstance-namespace-cache_code_prefix)
- [Error Catalog](#error-catalog)

---

## Conventions

| Pattern | Behavior |
|---|---|
| **`instance` is always the first argument** | Every operation receives the per-request lifecycle object returned by `Lib.Instance.initialize()` |
| **Programmer errors throw `TypeError` synchronously** | Missing namespace, missing cache_code, non-string prefix, non-positive TTL throw `TypeError` at the call-site |
| **Operational errors return `{ success: false, error }`** | Store driver failures and serialization failures come through the response envelope |
| **A cache miss is not an error** | `get` on an absent or expired entry returns `{ success: true, value: null, error: null }` |
| **The cache module owns JSON serialization** | `set` stringifies the value before delegating to the store; `get` parses the string it gets back. The store handles backend-specific encoding only |
| **The cache module never reads the source database** | It uses the cache-aside pattern. On a miss, the application fetches from the source and populates the cache |

---

## The Response Envelope

| Field | Type | Description |
|---|---|---|
| `success` | `boolean` | `true` on success. `false` on operational failure |
| `error` | `object \| null` | `{ type, message }` on failure. `null` on success. See [Error Catalog](#error-catalog) |
| `value` | `* \| null` | The cached value on `get` success. `null` on a miss or failure |
| `deleted_count` | `number` | Number of entries removed by `clear` |
| `cache_codes` | `string[]` | Entry identifiers returned by `list`, without the namespace prefix |

---

## `set(instance, namespace, cache_code, value, ttl_seconds)`

Store a value in the cache with an optional TTL (seconds). Overwrites any existing entry at the same `(namespace, cache_code)`.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `instance` | `object` | Yes | Request instance for time and lifecycle |
| `namespace` | `string` | Yes | Logical group for the cache entry |
| `cache_code` | `string` | Yes | Specific entry identifier within the namespace |
| `value` | `*` | Yes | Value to cache (JSON-serializable) |
| `ttl_seconds` | `number` | No | Lifetime in seconds. Omit for no expiry |

**Return shape.** `{ success, error }`.

**Lifecycle.**

1. Validate identifiers and TTL (throws `TypeError` on programmer error).
2. JSON-serialize `value`. A throw becomes `CACHE_SERIALIZATION_FAILED`.
3. Delegate to `store.set(instance, namespace, cache_code, serialized, ttl_seconds)`. Store failure becomes `CACHE_STORE_UNAVAILABLE`.

---

## `get(instance, namespace, cache_code)`

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
2. Delegate to `store.get(instance, namespace, cache_code)`. Store failure becomes `CACHE_STORE_UNAVAILABLE`.
3. A `null` or undefined store value short-circuits as a miss before any parse.
4. JSON-parse the store value. A throw becomes `CACHE_SERIALIZATION_FAILED`.

---

## `delete(instance, namespace, cache_code)`

Remove one cache entry. Idempotent: succeeds even if the `cache_code` does not exist.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `instance` | `object` | Yes | Request instance for time and lifecycle |
| `namespace` | `string` | Yes | Logical group for the cache entry |
| `cache_code` | `string` | Yes | Specific entry identifier within the namespace |

**Return shape.** `{ success, error }`.

---

## `clear(instance, namespace, cache_code_prefix)`

Mass invalidation. Remove all entries in `namespace` whose `cache_code` starts with `cache_code_prefix`. When `cache_code_prefix` is omitted, removes every entry in the namespace. Entries in other namespaces are never touched.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `instance` | `object` | Yes | Request instance for time and lifecycle |
| `namespace` | `string` | Yes | Logical group for the cache entries |
| `cache_code_prefix` | `string` | No | Prefix filter. Omit to clear the whole namespace |

**Return shape.** `{ success, deleted_count, error }`.

**Example.**

```js
// Remove every electronics entry in ProductCatalog
await Lib.Cache.clear(instance, 'ProductCatalog', 'electronics:');

// Remove every entry in ProductCatalog
await Lib.Cache.clear(instance, 'ProductCatalog');
```

---

## `list(instance, namespace, cache_code_prefix)`

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

## Error Catalog

All operational errors live in `cache.errors.js`. Every failure path returns a frozen `{ type, message }` object from this catalog.

| `error.type` | Trigger |
|---|---|
| `CACHE_STORE_UNAVAILABLE` | Any store adapter call returned `success: false` or threw |
| `CACHE_SERIALIZATION_FAILED` | `JSON.stringify` or `JSON.parse` threw on the cached value |

Error shape is frozen at module load:

```js
{ type: 'CACHE_STORE_UNAVAILABLE', message: 'Cache store operation failed' }
```

The store adapter's own error type and message never leak through. Driver detail is logged at debug level instead.
