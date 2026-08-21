# Configuration - helper-cache-store-dynamodb

## Loader Pattern

```js
const Store = require('@superloomdev/js-server-helper-cache-store-dynamodb')(Lib, {
  TABLE_NAME: 'my_cache_table'
});

Lib.Cache = require('@superloomdev/js-server-helper-cache')(Lib, {
  Store: Store
});
```

## Configuration Keys

| Key | Type | Required | Default | Description |
|-----|------|----------|---------|-------------|
| `TABLE_NAME` | `String` | Yes | `null` | DynamoDB table name. One table per cache store instance |
| `PARTITION_KEY` | `String` | No | `'namespace'` | Partition key attribute name in the DynamoDB table |
| `SORT_KEY` | `String` | No | `'cache_code'` | Sort key attribute name in the DynamoDB table |
| `VALUE_FIELD` | `String` | No | `'cache_value'` | Attribute name for the JSON string value |
| `EXPIRY_FIELD` | `String` | No | `'expiry_ttl'` | Attribute name for the TTL timestamp (Unix epoch seconds). Enable DynamoDB native TTL on this attribute |
| `LOCK_SORT_KEY_PREFIX` | `String` | No | `'\u001Flock\u001F'` | Sort-key prefix for distributed lock items. Lock items share the same partition key as cache entries but use a distinct sort-key prefix |

All keys live on this adapter, not on the cache module. The cache module composes no backend key - it forwards `namespace` and `cache_code` to the store as separate parameters.

## Table Requirements

The DynamoDB table must be provisioned with:

- **Partition key:** the attribute named by `PARTITION_KEY` (default: `namespace`), type `S`
- **Sort key:** the attribute named by `SORT_KEY` (default: `cache_code`), type `S`
- **TTL:** DynamoDB native TTL enabled on the attribute named by `EXPIRY_FIELD` (default: `expiry_ttl`)

Table creation and TTL configuration are handled out-of-band via IaC, AWS Console, or the `helper-nosql-aws-dynamodb-admin` module. This adapter does not create tables.

## Dependencies

| Package | Type | Purpose |
|---------|------|---------|
| `helper-utils` | Injected via `shared_libs.Utils` | Type checks |
| `helper-debug` | Injected via `shared_libs.Debug` | Structured debug logging |
| `helper-nosql-aws-dynamodb` | Injected via `shared_libs.DynamoDB` | DynamoDB driver wrapper |

The driver slot is named `DynamoDB` (the capability), never `AWS` or `Dynamo`. A vendor-named slot re-couples the module to that vendor through its own source text even though no import exists.

## Environment Variables

Consumed only by `_test/loader.js` - never read by the adapter itself.

| Variable | Default | Description |
|----------|---------|-------------|
| `DYNAMO_ENDPOINT` | `http://127.0.0.1:8002` | DynamoDB Local endpoint (port 8002 to avoid collision with auth-store-dynamodb on 8001) |
| `AWS_REGION` | `us-east-1` | AWS region |
| `AWS_ACCESS_KEY_ID` | `local` | AWS access key (use `local` for DynamoDB Local) |
| `AWS_SECRET_ACCESS_KEY` | `local` | AWS secret key (use `local` for DynamoDB Local) |

## clear and list Complexity

`clear` and `list` use `Lib.DynamoDB.query` with `begins_with` on the sort key, scoped to one partition key (namespace). This is **O(N) over the partition**, not the entire table - a significant advantage over the flat-keyspace Valkey adapter where `SCAN` iterates every key in the database.

### Recommendation

Prefer targeted `delete` calls for routine invalidation. Use `clear` for administrative mass invalidation (deployments, cache warmups, namespace resets).

## Testing Tier

| Tier | Runtime | Notes |
|------|---------|-------|
| Contract + Integration | DynamoDB Local via Docker Compose | `pretest`/`posttest` manage the Docker lifecycle |

```bash
npm install && npm test  # run from _test/
```

The `pretest` script runs `docker compose down -v` then `docker compose up -d --wait`. Never start Docker manually before running tests.
