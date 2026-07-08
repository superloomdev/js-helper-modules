# Configuration - helper-verify-store-mongodb

## Loader Pattern

```js
const Store = require('@superloomdev/js-server-helper-verify-store-mongodb')(Lib, {
  collection_name: 'verification_codes'
});

Lib.Verify = require('@superloomdev/js-server-helper-verify')(Lib, {
  Store: Store
});
```

## Configuration Keys

| Key | Type | Required | Description |
|-----|------|----------|--------------|
| `collection_name` | `String` | Yes | Name of the verification collection. One collection per Verify instance. |

## Dependencies

| Package | Type | Purpose |
|---------|------|---------|
| `helper-utils` | Injected via `shared_libs.Utils` | Type checks |
| `helper-debug` | Injected via `shared_libs.Debug` | Structured debug logging |
| `helper-nosql-mongodb` | Injected via `shared_libs.MongoDB` | MongoDB driver wrapper |

## Environment Variables

Consumed only by `_test/loader.js` - never read by the adapter itself.

| Variable | Default | Description |
|----------|---------|-------------|
| `MONGO_URL` | `mongodb://127.0.0.1:27019/?directConnection=true` | MongoDB connection string (port 27019 to avoid collisions) |
| `MONGO_DATABASE` | `test_db` | Database name |

## Testing Tier

| Tier | Runtime | Notes |
|------|---------|-------|
| Contract + Integration | MongoDB via Docker Compose | `pretest`/`posttest` manage the Docker lifecycle |

```bash
npm install && npm test  # run from _test/
```

The `pretest` script runs `docker compose down -v` then `docker compose up -d --wait`. Never start Docker manually before running tests.
