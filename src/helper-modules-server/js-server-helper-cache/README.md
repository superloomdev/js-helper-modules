# helper-cache

[![Test](https://github.com/superloomdev/js-helper-modules/actions/workflows/ci-publish-helper-modules.yml/badge.svg?branch=main)](https://github.com/superloomdev/js-helper-modules/actions/workflows/ci-publish-helper-modules.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![Node.js 24+](https://img.shields.io/badge/Node.js-24%2B-brightgreen.svg)](https://nodejs.org)

Application-level cache with TTL and namespacing for Superloom applications. Cache-aside pattern: the application fetches from the source database on a miss and populates the cache; this module never reads the source. The storage backend is chosen at construction time through a pluggable Class F adapter. Part of the [Superloom](https://github.com/superloomdev/superloom) framework.

## What It Does

The cache module provides eight operations over a namespaced, TTL-aware key-value store:

- **`setCache`** - Store a value with an optional TTL (seconds). Overwrites if the entry exists.
- **`getCache`** - Read a value. Returns `null` on a cache miss (absent or expired). A miss is not an error.
- **`deleteCache`** - Remove one entry. Idempotent.
- **`getOrFetchCache`** - Cache-aside with optional distributed stampede protection. On a miss, calls a caller-provided fetcher, caches the result, and returns it.
- **`getCacheExists`** - Check whether an entry exists without fetching its value.
- **`deleteCacheByPrefix`** - Selective mass invalidation. Remove all entries in a namespace whose `cache_code` starts with a required prefix.
- **`clearCache`** - Wipe every entry in a namespace.
- **`listCacheCodes`** - Enumerate `cache_code`s in a namespace, optionally filtered by prefix.

Two identifier parameters - `namespace` and `cache_code` - locate every entry. The word "key" is avoided because it already means three different things across the target backends (a flat string in Valkey, a partition plus sort pair in DynamoDB, `_id` in MongoDB).

## Why

- **Cache-aside, not cache-through.** The cache module never reads the source database. On a miss, the application fetches from the source and populates the cache. This keeps the cache module a dumb store with TTL and namespacing, decoupled from the source schema.
- **No string-dispatched backends.** The chosen storage adapter is configured and instantiated independently, then passed as a ready-to-use object via `CONFIG.Store`. Unused backends never get loaded, never pull their npm dependencies, and the module has no internal `switch (STORE) { ... }` block to maintain.
- **One factory call. One independent instance.** No singletons. Multiple cache instances run in parallel when different categories need different backends or prefixes.
- **Prefix invalidation.** The hierarchical structure of `cache_code` (e.g. `electronics:laptop-x1`) enables `deleteCacheByPrefix(instance, 'ProductCatalog', 'electronics:')` to remove every electronics entry in one call while `clothing:jacket-m` survives.

## Architecture Overview

```
Cache instance
 ├─ CONFIG.Store          (ready-to-use store object, e.g. import cacheStoreValkey from 'helper-cache-store-valkey'; cacheStoreValkey(Lib, config))
 └─ Store                 (passed directly; reads/writes cache entries)
```

`CONFIG.Store` is the ready-to-use store object itself. Configure and instantiate the adapter independently, then pass the resulting store object directly. Each adapter is a fully independent module that owns its own Lib, Config, and ERRORS, so adding a new backend never changes the call-site code.

For the full data-model walk-through and design rationale, see [`docs/data-model.md`](docs/data-model.md). For per-backend index, TTL, and configuration details, see each adapter package's own README (linked below).

## Storage Adapters

One storage adapter ships today, with more arriving as consumers need them:

| Adapter | Backend |
|---|---|
| [`helper-cache-store-valkey`](https://github.com/superloomdev/js-helper-modules/tree/main/src/helper-modules-server/js-server-helper-cache-store-valkey) | Valkey/Redis (via `kv-valkey`) |

**Each application selects the adapter that matches its own cache backend.** The cache module's calling shape is identical across all backends, so the choice is operational, not application-code.

Each adapter package ships its own README with the backend-specific schema, indexes, TTL behavior, and configuration shape. The cache module itself owns no per-backend documentation: every Class F adapter is the authoritative source for its own backend.

## Usage Example

```javascript
// Cache a product for 1 hour
await Lib.Cache.setCache(instance, 'ProductCatalog', 'electronics:laptop-x1', productData, 3600);

// Read it back (cache hit)
const result = await Lib.Cache.getCache(instance, 'ProductCatalog', 'electronics:laptop-x1');
// result.value === productData

// Cache miss - value is null
const miss = await Lib.Cache.getCache(instance, 'ProductCatalog', 'clothing:jacket-m');
// miss.value === null

// Invalidate one entry
await Lib.Cache.deleteCache(instance, 'ProductCatalog', 'electronics:laptop-x1');

// Selective mass invalidation: delete all electronics cache entries
await Lib.Cache.deleteCacheByPrefix(instance, 'ProductCatalog', 'electronics:');

// Wipe every entry in a namespace
await Lib.Cache.clearCache(instance, 'ProductCatalog');

// List all electronics cache_codes
const list = await Lib.Cache.listCacheCodes(instance, 'ProductCatalog', 'electronics:');
// list.cache_codes === ['electronics:laptop-x1', 'electronics:mouse-z2', ...]
```

## Aligned with Superloom Philosophy

A project built on Superloom conventions (the same loader pattern, the same testing model, the same `instance`-first call shape) adopts this module without learning anything new. Every function takes `instance` as its first argument.

The principles are documented at [superloom.dev](https://superloom.dev) for projects not yet using Superloom.

## Extended Documentation

- [API reference](docs/api.md). Every exported function with its signature, parameters, return shape, and error catalog
- [Configuration](docs/configuration.md). Loader pattern, every configuration key, peer dependencies, testing tier
- [Data model](docs/data-model.md). Entry shape, core concepts (namespace, cache_code, TTL), design decisions
- [Superloom](https://superloom.dev). The framework

## Adding to Your Project

This module and the one storage adapter it needs are declared as dependencies in the project's `package.json` and loaded through the standard Superloom loader. The published packages are the supported integration path; vendoring the source or using a local file dependency is not.

The adapter is configured and instantiated independently, then passed to the cache loader as a ready-to-use `CONFIG.Store` object. The full wiring and the per-backend configuration shape are in [Configuration](docs/configuration.md). The loader pattern, including the full `Lib` container shape, is documented in [Server Loader Architecture](https://github.com/superloomdev/superloom/blob/main/docs/languages/js/server/server-loader.md). One-time GitHub Packages registry setup is in the [npmrc setup guide](https://github.com/superloomdev/superloom/blob/main/docs/dev/npmrc-setup.md).

## Dependencies

This module has no external dependencies.

It expects three peer modules in the `Lib` container (Utils, Debug, Instance) and one optional peer adapter package for the storage backend. For the full dependency breakdown, see [`docs/configuration.md`](docs/configuration.md).

## Testing Status

| Tier | Runtime | Status |
|---|---|---|
| Unit (offline) | Node.js `node --test` against an in-process memory store | [![Test](https://github.com/superloomdev/js-helper-modules/actions/workflows/ci-publish-helper-modules.yml/badge.svg?branch=main)](https://github.com/superloomdev/js-helper-modules/actions/workflows/ci-publish-helper-modules.yml) |

The cache module's own tests use the in-process memory fixture (`_test/memory-store.js`) which implements the full 9-method store contract. There is no Docker dependency in this package and no database driver is required. Integration tests for each storage backend live in the corresponding adapter package (`helper-cache-store-*`) and run against real backends.

## License

MIT
