# Configuration - helper-cache-store-mongodb

## Loader Pattern

```js
import cacheStoreMongodb from '@superloomdev/js-server-helper-cache-store-mongodb';
import cache from '@superloomdev/js-server-helper-cache';

const Store = cacheStoreMongodb(Lib, {
  COLLECTION_NAME: 'my_cache_collection'
});

Lib.Cache = cache(Lib, {
  Store: Store
});
```

## Configuration Keys

| Key | Type | Required | Default | Description |
|-----|------|----------|---------|-------------|
| `COLLECTION_NAME` | `String` | Yes | `null` | MongoDB collection name. One collection per cache store instance |
| `VALUE_FIELD` | `String` | No | `'cache_value'` | Field name for the cached value (stored as native BSON) |
| `EXPIRY_FIELD` | `String` | No | `'expires_at'` | Field name for the expiry timestamp (BSON Date). Create a MongoDB TTL index on this field |
| `LOCK_ID_PREFIX` | `String` | No | `'\u001Flock\u001F'` | _id prefix for distributed lock documents. Lock documents share the same collection as cache entries but use a distinct _id prefix |

All keys live on this adapter, not on the cache module. The cache module composes no backend key - it forwards `namespace` and `cache_code` to the store as separate parameters.

## Collection Requirements

The MongoDB collection must be configured with:

- **Default _id index:** MongoDB creates this automatically. The composite string `_id` (`namespace + '\u001F' + cache_code`) is the primary key
- **TTL index:** A MongoDB TTL index on the attribute named by `EXPIRY_FIELD` (default: `expires_at`):
  ```
  db.<collection>.createIndex({ expires_at: 1 }, { expireAfterSeconds: 0 })
  ```

Collection creation and TTL index configuration are handled out-of-band via IaC, `mongosh`, or an admin script. This adapter does not create collections or indexes.

## Dependencies

| Package | Type | Purpose |
|---------|------|---------|
| `helper-utils` | Injected via `shared_libs.Utils` | Type checks |
| `helper-debug` | Injected via `shared_libs.Debug` | Structured debug logging |
| `helper-nosql-mongodb` | Injected via `shared_libs.MongoDB` | MongoDB driver wrapper |

The driver slot is named `MongoDB` (the capability), never `Mongo` or `Mongoose`. A vendor-named slot re-couples the module to that vendor through its own source text even though no import exists.

## Environment Variables

Consumed only by `_test/loader.js` - never read by the adapter itself.

| Variable | Default | Description |
|----------|---------|-------------|
| `MONGODB_CONNECTION_STRING` | `mongodb://127.0.0.1:27018` | MongoDB connection string (port 27018 to avoid collision with other test instances) |
| `MONGODB_DATABASE` | `test_cache_store` | MongoDB database name |

## deleteCacheByPrefix, clearCache, and listCacheCodes Complexity

`deleteCacheByPrefix`, `clearCache`, and `listCacheCodes` use left-anchored regex on `_id`, which MongoDB converts to an index range scan on the `_id` B-tree. This is **O(K) where K = matching documents**, not the entire collection - a significant advantage over a flat-keyspace adapter where `SCAN` iterates every key in the database.

### Recommendation

Prefer targeted `deleteCache` calls for routine invalidation. Use `deleteCacheByPrefix` and `clearCache` for administrative mass invalidation (deployments, cache warmups, namespace resets).

## Testing Tier

| Tier | Runtime | Notes |
|------|---------|-------|
| Contract + Integration | MongoDB via Docker Compose | `pretest`/`posttest` manage the Docker lifecycle |

```bash
npm install && npm test  # run from _test/
```

The `pretest` script runs `docker compose down -v --remove-orphans` then `docker compose up -d --wait`. Never start Docker manually before running tests.
