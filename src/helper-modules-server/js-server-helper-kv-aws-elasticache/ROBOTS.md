# ROBOTS.md - AI Agent Reference

> Compact reference for code generation. For human docs see README.md

## Type

Class D Cloud Service Wrapper. Standalone ElastiCache key-value driver with IAM auth. Single instance, cluster mode disabled. Server-only. Does NOT depend on kv-valkey - owns its full implementation.

## Peer Dependencies

| Injection Name | Package | Alias |
|---|---|---|
| `Utils` | `@superloomdev/js-helper-utils` | `helper-utils` |
| `Debug` | `@superloomdev/js-helper-debug` | `helper-debug` |
| `Instance` | `@superloomdev/js-server-helper-instance` | `helper-instance` |

## Direct Dependencies

- `ioredis` - Redis/Valkey client
- `@smithy/signature-v4` - AWS SDK v3 SigV4 signing for IAM token generation
- `@aws-crypto/sha256-js` - SHA-256 hash required by SignatureV4

## Companion Files

- `kv-aws-elasticache.config.js` - keys: HOST, PORT, DB, TLS, TLS_CONFIG, REGION, KEY, SECRET, ENDPOINT, IAM_USER_ID, CACHE_NAME, SERVERLESS, TOKEN_REFRESH_MARGIN_SECONDS, KEY_PREFIX, SERIALIZE_JSON, SCAN_PAGE_SIZE, CONNECT_TIMEOUT_MS, COMMAND_TIMEOUT_MS
- `kv-aws-elasticache.errors.js` - constants: KV_CONNECTION_FAILED, KV_COMMAND_FAILED, KV_TIMEOUT, KV_SERIALIZATION_FAILED, KV_ELASTICACHE_IAM_TOKEN_FAILED, KV_ELASTICACHE_IAM_TOKEN_EXPIRED
- `kv-aws-elasticache.validators.js` - functions: `validateConfig(CONFIG)`

## Loader Pattern (Factory)

```javascript
// With IAM auth (production)
const KV = require('@superloomdev/js-server-helper-kv-aws-elasticache')(Lib, {
  HOST: 'cluster.cache.amazonaws.com',
  PORT: 6379,
  TLS: true,
  REGION: 'us-east-1',
  KEY: 'AKIA...',
  SECRET: 'secret...',
  IAM_USER_ID: 'my-user',
  CACHE_NAME: 'my-cluster'
});

// Without IAM auth (local testing)
const KV = require('@superloomdev/js-server-helper-kv-aws-elasticache')(Lib, {
  HOST: 'localhost',
  PORT: 6379,
  TLS: false
});
```

## Config Keys

| Key | Type | Default | Required | Description |
|---|---|---|---|---|
| `HOST` | String | `'localhost'` | no | ElastiCache endpoint |
| `PORT` | Number | `6379` | no | ElastiCache port |
| `DB` | Number | `0` | no | Logical database (0-15) |
| `TLS` | Boolean | `true` | no | Enable TLS (required for ElastiCache) |
| `TLS_CONFIG` | Object | - | no | Additional TLS options |
| `REGION` | String | `'us-east-1'` | no | AWS region for SigV4 |
| `KEY` | String | - | if IAM | AWS access key ID |
| `SECRET` | String | - | if IAM | AWS secret access key |
| `ENDPOINT` | String | - | no | Custom endpoint (local testing; skips IAM) |
| `IAM_USER_ID` | String | - | no | ElastiCache IAM user ID |
| `CACHE_NAME` | String | - | if IAM | ElastiCache cluster name |
| `SERVERLESS` | Boolean | `false` | no | Serverless cache (adds ResourceType param) |
| `TOKEN_REFRESH_MARGIN_SECONDS` | Number | `60` | no | Refresh token before expiry by this much |
| `KEY_PREFIX` | String | `''` | no | Key prefix for isolation |
| `SERIALIZE_JSON` | Boolean | `true` | no | JSON serialization |
| `SCAN_PAGE_SIZE` | Number | `100` | no | SCAN COUNT hint |
| `CONNECT_TIMEOUT_MS` | Number | `5000` | no | Connection timeout |
| `COMMAND_TIMEOUT_MS` | Number | `3000` | no | Command timeout |

## Exported Functions (17 total)

All functions are async and return an envelope. Same signatures and return shapes as kv-valkey.

### Lifecycle
close(instance) -> { success, error }
ping(instance) -> { success, error }

### Single Key
set(instance, key, value, ttl_seconds?) -> { success, error }
get(instance, key) -> { success, value, error }
delete(instance, key) -> { success, deleted_count, error }
getKeyExists(instance, key) -> { success, exists, error }

### Multiple Keys
setMany(instance, entries, ttl_seconds?) -> { success, error }
getMany(instance, keys) -> { success, values, error }
deleteMany(instance, keys) -> { success, deleted_count, error }

### Scan
scan(instance, pattern, options?) -> { success, keys, error }

### Hash
setHashField(instance, key, field, value) -> { success, error }
getHashField(instance, key, field) -> { success, value, error }
getHashFields(instance, key) -> { success, fields, error }
deleteHashField(instance, key, field) -> { success, deleted_count, error }

### TTL
setExpire(instance, key, ttl_seconds) -> { success, applied, error }
getTtl(instance, key) -> { success, ttl_seconds, error }

### Counter
increment(instance, key, by?) -> { success, value, error }

## IAM Auth Flow

1. On first operation, module generates SigV4 token via `@smithy/signature-v4` `SignatureV4.presign()`
2. Token is cached with expiry time (900s - 60s margin = 840s effective)
3. Token passed as password to ioredis client
4. On token expiry, fresh token generated on next operation
5. If ENDPOINT is set or IAM_USER_ID is not set, connects without IAM auth

## Error Catalog

| Error type | When |
|---|---|
| `KV_CONNECTION_FAILED` | Server unreachable |
| `KV_COMMAND_FAILED` | Command fails operationally |
| `KV_TIMEOUT` | Command times out |
| `KV_SERIALIZATION_FAILED` | JSON serialization fails |
| `KV_ELASTICACHE_IAM_TOKEN_FAILED` | SigV4 token generation fails |
| `KV_ELASTICACHE_IAM_TOKEN_EXPIRED` | Token expired and refresh failed |
