# Configuration — js-server-helper-verify-store-mongodb

## Loader Pattern

```js
const Store = require('@superloomdev/js-server-helper-verify-store-mongodb')({
  collection_name: 'verification_codes',
  lib_mongodb: Lib.MongoDB
});

Lib.Verify = require('@superloomdev/js-server-helper-verify')(Lib, {
  Store: Store
});
```

## Configuration Keys

| Key | Type | Required | Description |
|-----|------|----------|-------------|
| `collection_name` | `String` | Yes | Name of the verification collection. One collection per Verify instance. |
| `lib_mongodb` | `Object` | Yes | An initialized `Lib.MongoDB` instance (`@superloomdev/js-server-helper-nosql-mongodb`). |

## Dependencies

| Package | Type | Purpose |
|---------|------|---------|
| `@superloomdev/js-helper-utils` | Direct | Type checks (`getUnixTime`) |
| `@superloomdev/js-helper-debug` | Direct | Structured debug logging |
| `@superloomdev/js-server-helper-nosql-mongodb` | Peer | MongoDB driver wrapper (`Lib.MongoDB`) |

## Environment Variables

Consumed only by `_test/loader.js` — never read by the adapter itself.

| Variable | Default | Description |
|----------|---------|-------------|
| `MONGO_URL` | `mongodb://127.0.0.1:27019/?directConnection=true` | MongoDB connection string (port 27019 to avoid collisions) |
| `MONGO_DATABASE` | `test_db` | Database name |

## Testing Tier

| Tier | Runtime | Notes |
|------|---------|-------|
| Contract + Integration | MongoDB via Docker Compose | `pretest`/`posttest` manage the Docker lifecycle |

```bash
cd _test && npm install && npm test
```

The `pretest` script runs `docker compose down -v` then `docker compose up -d --wait`. Never start Docker manually before running tests.
