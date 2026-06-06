# Configuration — js-server-helper-logger-store-mongodb

## Construction Pattern

This adapter is fully independent — it owns its own Lib and ERRORS. Construct it before the Logger parent and pass it as `CONFIG.Store`.

```js
const Store = require('@superloomdev/js-server-helper-logger-store-mongodb')({
  collection_name: 'action_log',
  lib_mongodb:     Lib.MongoDB
});

Lib.Logger = require('@superloomdev/js-server-helper-logger')(Lib, {
  Store:          Store,
  IP_ENCRYPT_KEY: process.env.IP_ENCRYPT_KEY  // optional
});
```

## Config Keys

| Key | Type | Required | Description |
|-----|------|----------|-------------|
| `collection_name` | `String` | Yes | Name of the log collection. One collection per Logger instance. |
| `lib_mongodb` | `Object` | Yes | An initialized `Lib.MongoDB` instance (`@superloomdev/js-server-helper-nosql-mongodb`). |

## Dependencies

| Package | Scope | Purpose |
|---------|-------|---------||
| `@superloomdev/js-helper-utils` | Owned | Type checks (`getUnixTime`) |
| `@superloomdev/js-helper-debug` | Owned | Structured debug logging |
| `@superloomdev/js-server-helper-nosql-mongodb` | Peer (via `config.lib_mongodb`) | MongoDB driver wrapper |

## Environment Variables

Consumed only by `_test/loader.js` — never read by the adapter itself.

| Variable | Default | Description |
|----------|---------|-------------|
| `MONGO_URL` | `mongodb://127.0.0.1:27020/?directConnection=true` | MongoDB connection string (port 27020 to avoid collisions) |
| `MONGO_DATABASE` | `test_db` | Database name |

## Testing Tier

| Tier | Runtime | Notes |
|------|---------|-------|
| Contract + Integration | MongoDB via Docker Compose | `pretest`/`posttest` manage the Docker lifecycle |

```bash
cd _test && npm install && npm test
```

The `pretest` script runs `docker compose down -v` then `docker compose up -d --wait`. Never start Docker manually before running tests.
