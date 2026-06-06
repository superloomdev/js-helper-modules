# Configuration — js-server-helper-verify-store-sqlite

## Loader Pattern

The adapter is configured and instantiated independently, then passed to the Verify parent as a ready-to-use store object:

```js
const Store = require('@superloomdev/js-server-helper-verify-store-sqlite')({
  table_name: 'verification_codes',
  lib_sqlite: Lib.SQLite
});

Lib.Verify = require('@superloomdev/js-server-helper-verify')(Lib, {
  Store: Store
});
```

The adapter validates its configuration at construction time and throws an `Error` on misconfiguration before any database call is made.

## Configuration Keys

| Key | Type | Required | Description |
|-----|------|----------|-------------|
| `table_name` | `String` | Yes | Name of the verification table. Must not contain a double-quote. One table per Verify instance. |
| `lib_sqlite` | `Object` | Yes | An initialized `Lib.SQLite` instance (`@superloomdev/js-server-helper-sql-sqlite`). |

The validator rejects missing, null, or empty-string values for both keys. The `table_name` double-quote guard fires at quoting time (first DDL or query call), not at validation time.

## Dependencies

| Package | Type | Purpose |
|---------|------|---------|
| `@superloomdev/js-helper-utils` | Direct | Type checks (`getUnixTime`) |
| `@superloomdev/js-helper-debug` | Direct | Structured debug logging |
| `@superloomdev/js-server-helper-sql-sqlite` | Peer | SQLite driver wrapper (`Lib.SQLite`) |

The adapter loads its own Utils and Debug dependencies directly. The SQLite driver helper is provided by the caller as `lib_sqlite` in the configuration.

## Environment Variables

Consumed only by `_test/loader.js` — never read by the adapter itself.

| Variable | Default | Description |
|----------|---------|-------------|
| `SQLITE_FILE` | `':memory:'` | SQLite database file path, or `:memory:` for an ephemeral in-process database |

## Testing Tier

| Tier | Runtime | Notes |
|------|---------|-------|
| Contract + Integration | SQLite (`:memory:`, in-process via `node:sqlite`) | No Docker, no credentials, no network required |

Run tests from `_test/`:

```bash
cd _test && npm install && npm test
```

The test script does not use `pretest`/`posttest` Docker lifecycle hooks because SQLite runs in-process. The entire suite completes with no external dependencies.
