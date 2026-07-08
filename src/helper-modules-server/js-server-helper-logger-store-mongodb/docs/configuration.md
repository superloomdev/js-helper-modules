# Configuration - helper-logger-store-mongodb

## Construction Pattern

This adapter is fully independent - it owns its own Lib and ERRORS. Construct it before the Logger parent and pass it as `CONFIG.Store`.

```js
const Store = require('@superloomdev/js-server-helper-logger-store-mongodb')(Lib, {
  collection_name: 'action_log'
});

Lib.Logger = require('@superloomdev/js-server-helper-logger')(Lib, {
  Store:          Store,
  IP_ENCRYPT_KEY: process.env.IP_ENCRYPT_KEY
});
```

## Config Keys

| Key | Type | Required | Description |
|-----|------|----------|--------------|
| `collection_name` | `String` | Yes | Name of the log collection. One collection per Logger instance. |

## Dependencies

| Package | Scope | Purpose |
|---------|-------|---------||
| `@superloomdev/js-helper-utils` | Injected via `shared_libs.Utils` | Type checks (`getUnixTime`) |
| `@superloomdev/js-helper-debug` | Injected via `shared_libs.Debug` | Structured debug logging |
| `@superloomdev/js-server-helper-nosql-mongodb` | Injected via `shared_libs.MongoDB` | MongoDB driver wrapper |

## Environment Variables

Consumed only by `_test/loader.js` - never read by the adapter itself.

| Variable | Default | Description |
|----------|---------|-------------|
| `MONGO_URL` | `mongodb://127.0.0.1:27020/?directConnection=true` | MongoDB connection string (port 27020 to avoid collisions) |
| `MONGO_DATABASE` | `test_db` | Database name |

## Testing Tier

| Tier | Runtime | Notes |
|------|---------|-------|
| Contract + Integration | MongoDB via Docker Compose | `pretest`/`posttest` manage the Docker lifecycle |

```bash
npm install && npm test
```

The `pretest` script runs `docker compose down -v` then `docker compose up -d --wait`. Never start Docker manually before running tests.
