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
const Store = require('helper-cache-store-valkey')(Lib, {
  KEY_PREFIX: 'cache:'
});

Lib.Cache = require('helper-cache')(Lib, {
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

`Store` is the only config key. The cache module composes no backend key - it forwards `namespace` and `cache_code` to the store as separate parameters, so every separator and prefix concern belongs to the adapter that actually builds a backend key. Do not add `KEY_PREFIX` or `KEY_SEPARATOR` here; both live on the Valkey adapter.

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
| `Lib.Instance` | `helper-instance` | Request lifecycle object |

The storage adapter (`CONFIG.Store`) is a fully independent module that owns its own driver helper (`Lib.KV` for Valkey, `Lib.NoDB` for DynamoDB, `Lib.MongoDB` for MongoDB). The cache module never imports a database driver helper directly.

---

## Testing Tier

| Tier | Runtime | Backend |
|---|---|---|
| Unit | Node.js `node --test` | In-process memory store (`_test/memory-store.js`) implementing the full 5-method store contract |

The cache module's own tests use an in-process memory store implementing the same 5-method contract every real adapter satisfies. There is no Docker dependency in this package and no database driver is required.

Integration tests for each storage backend live in the corresponding adapter package (`helper-cache-store-*`) and run against real backends.
