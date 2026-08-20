# ROBOTS.md. `helper-cache`

Compact, AI-targeted reference for the public interface. Humans should read `README.md` and `docs/`.

## Module Overview

Application-level cache with TTL and namespacing. Cache-aside pattern: the application fetches from the source database on a miss and populates the cache; this module never reads the source. Five operations cover the lifecycle of a cached value: `set`, `get`, `delete`, `clear` (mass invalidation by prefix), and `list` (enumerate cache_codes by prefix). Storage backends are standalone Class F adapter packages (`helper-cache-store-*`); the caller passes the ready-to-use store object directly as `CONFIG.Store`.

## Factory Pattern

```js
module.exports = function loader (shared_libs, config) {
  // Returns independent instance with isolated Lib + CONFIG.
  // Validates CONFIG at construction (Store must be a ready-to-use object).
  // Validates the 5-method store contract at construction.
  // Throws synchronously on misconfiguration.
  return { set, get, delete, clear, list };
};
```

`CONFIG.Store` is a **ready-to-use store object**, not a factory function. The loader uses it directly. The adapter is a fully independent module that owns its own Lib/Config/ERRORS. Passing a factory function throws `CONFIG.Store is required and must be a ready-to-use store object`.

```js
const Store = require('helper-cache-store-valkey')(Lib, {
  KEY_PREFIX: 'cache:'
});

Lib.Cache = require('helper-cache')(Lib, {
  Store: Store
});
```

## Public Functions

### `set(instance, namespace, cache_code, value, ttl_seconds?)` *(async)*

Store a value in the cache with an optional TTL (seconds). Overwrites any existing entry. The value is JSON-serialized before being handed to the store.

- **namespace**: String, required. Logical group for the cache entry.
- **cache_code**: String, required. Specific entry identifier within the namespace.
- **value**: Any JSON-serializable value, required.
- **ttl_seconds**: Number, optional. Lifetime in seconds. Omit for no expiry.
- **Returns**: `{ success, error }`.

### `get(instance, namespace, cache_code)` *(async)*

Read a value from the cache. Returns `value: null` on a cache miss (entry absent or expired). A miss is not an error.

- **Returns**: `{ success, value, error }`. `value` is the parsed JSON on a hit, `null` on a miss.

### `delete(instance, namespace, cache_code)` *(async)*

Remove one cache entry. Idempotent: succeeds even if the cache_code does not exist.

- **Returns**: `{ success, error }`.

### `clear(instance, namespace, cache_code_prefix?)` *(async)*

Mass invalidation. Remove all entries in `namespace` whose `cache_code` starts with `cache_code_prefix`. When omitted, removes every entry in the namespace. Entries in other namespaces are never touched.

- **Returns**: `{ success, deleted_count, error }`.

### `list(instance, namespace, cache_code_prefix?)` *(async)*

List cache_codes in `namespace` whose `cache_code` starts with `cache_code_prefix`. When omitted, lists every cache_code in the namespace. Returns cache_codes without the namespace prefix.

- **Returns**: `{ success, cache_codes, error }`.

## Configuration

| Key | Type | Required | Notes |
|---|---|---|---|
| `Store` | object | Yes | Ready-to-use store object. Configure adapter independently, then pass result |

`Store` is the only config key. The cache module composes no backend key - it forwards `namespace` and `cache_code` to the store as separate parameters. `KEY_PREFIX` and `KEY_SEPARATOR` belong to the Valkey adapter, not here.

## Error Catalog

| `error.type` | Trigger | Surfaces in |
|---|---|---|
| `CACHE_STORE_UNAVAILABLE` | Store adapter returned `{ success: false }` or threw | All async functions |
| `CACHE_SERIALIZATION_FAILED` | `JSON.stringify` or `JSON.parse` threw on the cached value | `set`, `get` |

Error shape is frozen at module load: `{ type: 'CACHE_STORE_UNAVAILABLE', message: 'Cache store operation failed' }`. The store adapter's own error type and message never leak through.

## Critical Behavior for Code-Generating Tools

- **`instance` is always the first argument.** Every function receives the per-request lifecycle object.
- **`Store` is a ready-to-use object, not a factory function.** The loader throws on factory function, string, or missing.
- **Programmer errors throw, operational errors return.** Missing namespace or cache_code throws `TypeError`; store failures return `{ success: false, error }`.
- **A cache miss is not an error.** `get` on an absent or expired entry returns `{ success: true, value: null, error: null }`.
- **The cache module owns JSON serialization.** `set` stringifies before delegating; `get` parses after. The store receives and returns a plain string.
- **The cache module never reads the source database.** It uses the cache-aside pattern. On a miss, the application fetches from the source and populates the cache.
- **`clear` and `list` use prefix match only.** Range operators (`gt`, `lt`, `between`) are database queries, not cache operations.

## Store Contract

Five async methods, each returning a result envelope:

| Method | Signature | Returns |
|---|---|---|
| `get` | `(instance, namespace, cache_code)` | `{ success, value, error }` - `value: null` on miss |
| `set` | `(instance, namespace, cache_code, value, ttl_seconds)` | `{ success, error }` |
| `delete` | `(instance, namespace, cache_code)` | `{ success, error }` |
| `clear` | `(instance, namespace, cache_code_prefix?)` | `{ success, deleted_count, error }` |
| `list` | `(instance, namespace, cache_code_prefix?)` | `{ success, cache_codes, error }` |

Construction hard-validates all five. A missing method throws at boot. The store receives `namespace` and `cache_code` as separate parameters - no adapter ever decomposes a composed key.

## Peer Dependencies

| `Lib.*` | Source | Used for |
|---|---|---|
| `Lib.Utils` | `helper-utils` | Type checks |
| `Lib.Debug` | `helper-debug` | Diagnostics for store failures |
| `Lib.Instance` | `helper-instance` | Request lifecycle object |

The store adapter (`CONFIG.Store`) is a fully independent module that owns its own driver helper (`Lib.KV` for Valkey, `Lib.NoDB` for DynamoDB, `Lib.MongoDB` for MongoDB). The cache module never imports a database driver helper directly.

## Out of Scope

- **Client-side caching.** This module is server-side only. Client-side caching is a separate system.
- **Cache-through / read-through.** The cache module does not fetch from the source database on a miss.
- **Range operators on cache_codes.** `clear` and `list` support prefix match only.
- **Cache warming / precomputation.** The application populates the cache on demand.
- **Cache statistics / hit rate tracking.** Not tracked by this module.

## Documentation

- `docs/api.md`. Full API reference (every function, every parameter, every error type)
- `docs/configuration.md`. Loader pattern, every config key, peer dependencies, testing tier
- `docs/data-model.md`. Entry shape, core concepts (namespace, cache_code, TTL), design decisions
- Storage adapters: see the README's "Storage Adapters" section. Per-backend schema, indexes, TTL, and configuration shape live in each adapter package's own README (`helper-cache-store-*`)
