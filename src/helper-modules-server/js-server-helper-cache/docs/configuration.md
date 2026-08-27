# Configuration. `helper-cache`

Loader pattern, every configuration key, the environment-variable boundary, peer dependencies, and the testing tier. For the function reference see [API Reference](api.md). For the canonical entry shape see [Data Model](data-model.md). For backend selection criteria see the [Storage Adapters](../README.md#storage-adapters) section in the module README.

## On This Page

- [Loader Pattern](#loader-pattern)
- [Configuration Keys](#configuration-keys)
- [Environment Variables](#environment-variables)
- [Peer Dependencies](#peer-dependencies)
- [Testing Tier](#testing-tier)

---

## Loader Pattern

Every Superloom server-side module is a factory function that takes the `Lib` container and a `CONFIG` object and returns the public interface. The cache module follows that shape exactly.

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

**`Store` is a ready-to-use object, not a factory function.** Configure and instantiate the adapter independently, then pass the resulting store object directly. Each adapter is a fully independent module that owns its own Lib, Config, and ERRORS.

The factory validates `CONFIG` at construction time. Misconfiguration fails at boot with a thrown `Error`, never at runtime.

---

## Configuration Keys

| Key | Type | Default | Required | Notes |
|---|---|---|---|---|
| `Store` | `object` | `null` | Yes | Ready-to-use store object. Configure adapter independently, then pass result |
| `GET_OR_FETCH_LOCK_ENABLED` | `Boolean` | `false` | No | Enable distributed stampede protection in `getOrFetchCache` |
| `GET_OR_FETCH_LOCK_TIMEOUT_MS` | `Number` | `3000` | No | Lock auto-expiry in milliseconds. Handles crashed processes |
| `GET_OR_FETCH_LOCK_RETRY_MS` | `Number` | `50` | No | Poll interval when waiting for a lock holder to finish |
| `GET_OR_FETCH_LOCK_RETRY_JITTER_MS` | `Number` | `20` | No | Random 0-N ms added to each retry to avoid synchronized retry bursts |
| `GET_OR_FETCH_LOCK_WAIT_TIMEOUT_MS` | `Number` | `5000` | No | Maximum total milliseconds to wait for a lock holder before returning `CACHE_LOCK_WAIT_TIMEOUT` |

`Store` is the primary config key. The cache module composes no backend key - it forwards `namespace` and `cache_code` to the store as separate parameters, so every separator and prefix concern belongs to the adapter that actually builds a backend key. Do not add `KEY_PREFIX` or `KEY_SEPARATOR` here; both live on the Valkey adapter.

The five `GET_OR_FETCH_LOCK_*` keys control distributed stampede protection in `getOrFetchCache`. When `GET_OR_FETCH_LOCK_ENABLED` is `false` (default), `getOrFetchCache` does plain fetch-and-cache with no lock. When `true`, the loader validates that the store implements `setCacheLock` and `releaseCacheLock`; a store without lock support throws at boot. The wait for a lock holder is bounded by `GET_OR_FETCH_LOCK_WAIT_TIMEOUT_MS`; when exceeded, `getOrFetchCache` returns `CACHE_LOCK_WAIT_TIMEOUT`.

---

## Environment Variables

The cache module reads no environment variables. Per the Superloom loader contract, only the project loader reads `process.env`; it passes the relevant slice in as `CONFIG`. The config file holds static defaults only. Backend credentials (a Valkey host, an AWS region) are the storage adapter's concern and are documented in the adapter package.

---

## Peer Dependencies

Loaded through the standard Superloom loader. The cache module reads only from the shared `Lib` container; nothing is `require`d directly inside the module.

| `Lib.*` | Source package | Used for |
|---|---|---|
| `Lib.Utils` | `helper-utils` | Type checks, validation helpers |
| `Lib.Debug` | `helper-debug` | Diagnostics for store failures |

`helper-instance` is a peer dependency because the `instance` parameter on every public function must be a `helper-instance` product. The cache module does not call `Lib.Instance` itself - the caller creates the instance object and passes it in.

Optional peer dependencies (at least one must be installed and passed as `CONFIG.Store`):

| Package | Backend |
|---|---|
| `helper-cache-store-valkey` | Valkey/Redis (via `kv-valkey`) |
| `helper-cache-store-dynamodb` | DynamoDB (via `nosql-aws-dynamodb`) |

The storage adapter (`CONFIG.Store`) is a fully independent module that owns its own driver helper (`Lib.KV` for Valkey, `Lib.NoDB` for DynamoDB, `Lib.MongoDB` for MongoDB). The cache module never imports a database driver helper directly.

---

## Testing Tier

| Tier | Runtime | Backend |
|---|---|---|
| Unit | Node.js `node --test` | In-process memory store (`_test/memory-store.js`) implementing the full 9-method store contract |

The cache module's own tests use an in-process memory store implementing the same 9-method contract every real adapter satisfies (7 required + 2 lock methods). There is no Docker dependency in this package and no database driver is required.

Integration tests for each storage backend live in the corresponding adapter package (`helper-cache-store-*`) and run against real backends.
