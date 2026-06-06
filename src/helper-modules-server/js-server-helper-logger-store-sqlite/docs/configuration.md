# Configuration — js-server-helper-logger-store-sqlite

## Construction Pattern

This adapter is fully independent — it owns its own Lib and ERRORS. Construct it before the Logger parent and pass it as `CONFIG.Store`.

```js
const Store = require('@superloomdev/js-server-helper-logger-store-sqlite')({
  table_name: 'action_log',
  lib_sql:    Lib.SQLite
});

Lib.Logger = require('@superloomdev/js-server-helper-logger')(Lib, {
  Store:          Store,
  IP_ENCRYPT_KEY: process.env.IP_ENCRYPT_KEY  // optional
});
```

## Config Keys

| Key | Type | Required | Description |
|-----|------|----------|-------------|
| `table_name` | `String` | Yes | Name of the log table. Must not contain a double-quote. One table per Logger instance. |
| `lib_sql` | `Object` | Yes | An initialized `Lib.SQLite` instance (`@superloomdev/js-server-helper-sql-sqlite`). |

## Dependencies

| Package | Scope | Purpose |
|---------|-------|---------|
| `@superloomdev/js-helper-utils` | Owned | Type checks (`getUnixTime`) |
| `@superloomdev/js-helper-debug` | Owned | Structured debug logging |
| `@superloomdev/js-server-helper-sql-sqlite` | Peer (via `config.lib_sql`) | SQLite driver wrapper |

## Environment Variables

Consumed only by `_test/loader.js` — never read by the adapter itself.

| Variable | Default | Description |
|----------|---------|-------------|
| `SQLITE_FILE` | `':memory:'` | SQLite database file path, or `:memory:` for an ephemeral in-process database |

## Testing Tier

| Tier | Runtime | Notes |
|------|---------|-------|
| Contract + Integration | SQLite (`:memory:`, in-process via `node:sqlite`) | No Docker, no credentials, no network required |

```bash
cd _test && npm install && npm test
```

The test script does not use `pretest`/`posttest` Docker lifecycle hooks because SQLite runs in-process. The entire suite completes with no external dependencies.
