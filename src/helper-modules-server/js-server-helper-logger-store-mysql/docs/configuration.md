# Configuration - helper-logger-store-mysql

## Construction Pattern

Construct this adapter before the Logger parent and pass it as `CONFIG.Store`.

```js
const Store = require('@superloomdev/js-server-helper-logger-store-mysql')(Lib, {
  table_name: 'action_log'
});

Lib.Logger = require('@superloomdev/js-server-helper-logger')(Lib, {
  Store:          Store,
  IP_ENCRYPT_KEY: process.env.IP_ENCRYPT_KEY  // optional
});
```

## Config Keys

| Key | Type | Required | Description |
|-----|------|----------|-------------|
| `table_name` | `String` | Yes | Name of the log table. Must not contain a backtick. |

## Dependencies

| Package | Type | Purpose |
|---------|------|----------|
| `helper-utils` | Injected via `shared_libs.Utils` | Type checks |
| `helper-debug` | Injected via `shared_libs.Debug` | Structured debug logging |
| `helper-sql-mysql` | Injected via `shared_libs.SQL` | MySQL driver wrapper |

## Environment Variables

Consumed only by `_test/loader.js` - never read by the adapter itself.

| Variable | Default | Description |
|----------|---------|-------------|
| `MYSQL_HOST` | `127.0.0.1` | MySQL host |
| `MYSQL_PORT` | `3308` | Port (offset from default 3306 to avoid collisions) |
| `MYSQL_DATABASE` | `test_db` | Database name |
| `MYSQL_USER` | `test_user` | Username |
| `MYSQL_PASSWORD` | `test_pw` | Password |

## Testing Tier

| Tier | Runtime | Notes |
|------|---------|-------|
| Contract + Integration | MySQL via Docker Compose | `pretest`/`posttest` manage the Docker lifecycle |

```bash
npm install && npm test
```

The `pretest` script runs `docker compose down -v` then `docker compose up -d --wait`. Never start Docker manually before running tests.
