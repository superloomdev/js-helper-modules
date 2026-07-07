# Configuration. `helper-logger`

Loader pattern, every configuration key, the adapter integration pattern, peer dependencies, and the testing tier. For the function reference see [API Reference](api.md). For backend selection criteria see the [Storage Adapters](../README.md#storage-adapters) section in the module README.

## On This Page

- [Loader Pattern](#loader-pattern)
- [Configuration Keys](#configuration-keys)
- [IP Encryption](#ip-encryption)
- [Peer Dependencies](#peer-dependencies)
- [Testing Tier](#testing-tier)

---

## Loader Pattern

Every Superloom server-side module is a factory function that takes the `Lib` container and a `CONFIG` object and returns the public interface. The logger module follows that shape exactly.

Each store adapter is a **fully independent module** — it owns its own Lib, Config, and ERRORS. Construct the adapter first with its own config, then pass the ready-to-use store object as `CONFIG.Store`.

```js
const Store = require('helper-logger-store-postgres')({
  table_name: 'action_log',
  lib_sql:    Lib.Postgres
});

Lib.Logger = require('helper-logger')(Lib, {
  Store:          Store,
  IP_ENCRYPT_KEY: process.env.IP_ENCRYPT_KEY    // optional
});
```

The factory validates `CONFIG` at construction time. Misconfiguration fails at boot with a thrown `Error`, never at runtime.

---

## Configuration Keys

| Key | Type | Default | Required | Notes |
|---|---|---|---|---|
| `Store` | `object` | `null` | Yes | Ready-to-use store object. Construct the adapter first: `require('helper-logger-store-<backend>')({ ... })`. Loader throws on missing or non-object |
| `IP_ENCRYPT_KEY` | `string` | `null` | No | When set, every non-empty `ip` is AES-encrypted at rest via `Lib.Crypto.aesEncrypt`. Reads transparently decrypt via `Lib.Crypto.aesDecrypt`. Empty string throws; pass `null` (or omit) to store plaintext |

---

## IP Encryption

Setting `IP_ENCRYPT_KEY` is the difference between an audit log that survives a database dump and one that leaks plaintext IPs to anyone with read access to the table.

**Key shape.** A 256-bit hex string (64 hex characters) is recommended. The exact requirements come from `Lib.Crypto.aesEncrypt`; see the `helper-crypto` module's documentation.

**Key handling.**

- Store the key in a secret manager (AWS Secrets Manager, GCP Secret Manager, sealed Kubernetes secret).
- **Never** commit the key to source.
- Inject it as an environment variable at process start.

**Key rotation.** The logger has no built-in rotation; the deployer manages it. The pattern is:

1. Deploy a reader that knows both the old and the new key.
2. Migrate writes to the new key.
3. Wait until the cutover window passes (no rows written under the old key are still in the active retention window).
4. Retire the old key.

A decrypt failure (wrong key, key rotation in flight) returns the ciphertext rather than throwing. Audit reviewers see the opaque blob and can investigate; the request path keeps working.

**When to leave the key unset.** Fraud-detection and geo-IP pipelines need plaintext IPs. When transport-level controls (DB encryption at rest, IAM-scoped access) are sufficient for the deployment's compliance posture, the key can be omitted and IPs stored in plaintext.

---

## Peer Dependencies

Loaded through the standard Superloom loader. The logger reads only from the shared `Lib` container; nothing is `require`d directly inside the module.

| `Lib.*` | Source package | Used for |
|---|---|---|
| `Lib.Utils` | `helper-utils` | Type checks, validation helpers |
| `Lib.Debug` | `helper-debug` | `debug` for adapter-failure diagnostics on background writes |
| `Lib.Crypto` | `helper-crypto` | `generateRandomString` (sort-key randomization), `aesEncrypt` / `aesDecrypt` (IP encryption) |
| `Lib.Instance` | `helper-instance` | `backgroundRoutine` for non-blocking `log()` writes |
| `Lib.HttpHandler` *(optional)* | `helper-http` | `getHttpRequestIPAddress`, `getHttpRequestUserAgent` for auto-capture from `instance.http_request` |

The storage adapter (`CONFIG.Store`) is a fully independent module. It owns its own Lib (including the database driver helper), Config, and ERRORS. The logger module never imports `Lib.Postgres`, `Lib.MongoDB`, or any other backend-specific helper directly.

---

## Testing Tier

| Tier | Runtime | Backend |
|---|---|---|
| Unit | Node.js `node --test` | In-process memory store (`_test/memory-store.js`) implementing the full 5-method store contract |

The logger module's own tests use an in-process memory store implementing the same 5-method contract every real adapter satisfies. There is no Docker dependency in this package and no database driver is required.

Integration tests for each storage backend live in the corresponding adapter package (`helper-logger-store-*`) and run the shared store-contract suite against real backends.
