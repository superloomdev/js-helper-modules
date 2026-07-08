# Configuration - helper-verify-store-sqlite

## Loader Pattern

The adapter is configured and instantiated independently, then passed to the Verify parent as a ready-to-use store object:

```js
const Store = require('helper-verify-store-sqlite')(Lib, {
  table_name: 'verification_codes'
});

Lib.Verify = require('helper-verify')(Lib, {
  Store: Store
});
```

The adapter validates its configuration at construction time and throws an `Error` on misconfiguration before any database call is made.

## Configuration Keys

| Key | Type | Required | Description |
|-----|------|----------|-------------|
| `table_name` | `String` | Yes | Name of the verification table. Must not contain a double-quote. One table per Verify instance. |

The validator rejects missing, null, or empty-string values. The `table_name` double-quote guard fires at quoting time (first DDL or query call), not at validation time. The SQL driver arrives via `shared_libs.SQL` (injected by the application).

## Dependencies

| Package | Type | Purpose |
|---------|------|---------|
| `helper-utils` | Injected | Type checks |
| `helper-debug` | Injected | Structured debug logging |
| `helper-sql-sqlite` | Injected | SQLite driver wrapper (`Lib.SQL`) |

All three dependencies are injected by the application through the `shared_libs` container. The adapter picks them by reference and does not require them directly.

## Environment Variables

Consumed only by `_test/loader.js` - never read by the adapter itself.

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
