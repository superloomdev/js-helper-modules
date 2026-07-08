# Configuration. `helper-verify`

Loader pattern, every configuration key, the per-backend configuration shape, the environment-variable boundary, peer dependencies, and the testing tier. For the validated input and store contracts see [Schemas](schemas.md). For the function reference see [API Reference](api.md). For backend selection criteria see the [Storage Adapters](../README.md#storage-adapters) section in the module README.

## On This Page

- [Loader Pattern](#loader-pattern)
- [Configuration Keys](#configuration-keys)
- [Configuration by Backend](#configuration-by-backend)
- [Charset Overrides](#charset-overrides)
- [Environment Variables](#environment-variables)
- [Peer Dependencies](#peer-dependencies)
- [Testing Tier](#testing-tier)

---

## Loader Pattern

Every Superloom server-side module is a factory function that takes the `Lib` container and a `CONFIG` object and returns the public interface. The verify module follows that shape exactly.

```js
const Store = require('helper-verify-store-postgres')({
  table_name: 'verification_codes',
  lib_postgresql: Lib.PostgreSQL
});

Lib.Verify = require('helper-verify')(Lib, {
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
| `PIN_CHARSET` | `string` | `'0123456789'` | No | Charset used by `createPin`. Overridden only when a non-numeric "pin" is required |
| `CODE_CHARSET` | `string` | Crockford Base32 (`'0123456789ABCDEFGHJKMNPQRSTVWXYZ'`) | No | Charset used by `createCode`. The default deliberately omits `I`, `L`, `O`, `U` to avoid visual confusion |
| `TOKEN_CHARSET` | `string` | `a-zA-Z0-9` (62 chars) | No | Charset used by `createToken`. The default is URL-safe without escaping |

---

## Configuration by Backend

The exact configuration key set lives in each adapter package's own README. The shape generally looks like one of:

| Adapter family | Typical adapter configuration |
|---|---|
| SQL (sqlite, postgres, mysql) | `{ table_name: 'verification_codes', lib_sqlite: Lib.SQLite }` |
| MongoDB | `{ collection_name: 'verification_codes', lib_mongodb: Lib.MongoDB }` |
| DynamoDB | `{ table_name: 'verification_codes', lib_dynamodb: Lib.DynamoDB }` |

Each adapter validates its own configuration internally and throws at construction time on anything missing or malformed.

---

## Charset Overrides

The three default charsets are chosen for human ergonomics. Override them only when the use case requires it.

| Charset | Default rationale | When to override |
|---|---|---|
| `PIN_CHARSET` | `0-9`. Smallest entropy per character, easiest to enter on a numeric phone keypad. Pairs naturally with SMS OTP delivery | Almost never. Only when the delivery channel cannot represent digits |
| `CODE_CHARSET` | Crockford Base32 (`0-9 A-Z` minus `I L O U`). Designed for spoken or printed delivery; omits visually ambiguous glyphs | When the audience needs lowercase letters (for example some IVR systems) or full alphanumeric entropy |
| `TOKEN_CHARSET` | `a-zA-Z0-9` (62 chars). Highest entropy per character; safe in URL query strings without percent-encoding | When the transport requires URL-safe base64 (`-` and `_`); never include characters that require encoding |

Custom charsets are passed verbatim to `Lib.Crypto.generateRandomString(charset, length)`. The verify module does not deduplicate or sort the characters; a charset with duplicates over-represents those characters in the generated code.

---

## Environment Variables

The verify module reads no environment variables. Per the Superloom loader contract, only the project loader reads `process.env`; it passes the relevant slice in as `CONFIG`. The config file holds static defaults only. Backend credentials (a database host, an AWS region) are the storage adapter's concern and are documented in the adapter package.

---

## Peer Dependencies

Loaded through the standard Superloom loader. The verify module reads only from the shared `Lib` container; nothing is `require`d directly inside the module.

| `Lib.*` | Source package | Used for |
|---|---|---|
| `Lib.Utils` | `helper-utils` | Type checks, validation helpers |
| `Lib.Debug` | `helper-debug` | Diagnostics for the post-verify background delete |
| `Lib.Crypto` | `helper-crypto` | `generateRandomString(charset, length)` for code generation |
| `Lib.Instance` | `helper-instance` | `backgroundRoutine` for the post-verify record deletion |

The storage adapter (`CONFIG.Store`) is a fully independent module that owns its own driver helper (`Lib.SQLite`, `Lib.Postgres`, `Lib.MySQL`, `Lib.MongoDB`, or `Lib.DynamoDB`). The verify module never imports a database driver helper directly.

---

## Testing Tier

| Tier | Runtime | Backend |
|---|---|---|
| Unit | Node.js `node --test` | In-process memory store (`_test/memory-store.js`) implementing the full 6-method store contract |

The verify module's own tests use an in-process memory store implementing the same 6-method contract every real adapter satisfies. There is no Docker dependency in this package and no database driver is required.

Integration tests for each storage backend live in the corresponding adapter package (`helper-verify-store-*`) and run the shared store-contract suite against real backends. Each adapter ships its own `_test/store-contract-suite.js` as a self-contained local copy of that suite.
