# ROBOTS.md - AI Agent Reference

> Compact reference for code generation. For human docs see README.md

## Type

Class D Cloud Service Wrapper. Wraps kv-valkey with ElastiCache IAM auth (SigV4 token generation). Single instance, cluster mode disabled. Server-only.

## Peer Dependencies

| Injection Name | Package | Alias |
|---|---|---|
| `Utils` | `@superloomdev/js-helper-utils` | `helper-utils` |
| `Debug` | `@superloomdev/js-helper-debug` | `helper-debug` |
| `Instance` | `@superloomdev/js-server-helper-instance` | `helper-instance` |
| `KV` (valkey) | `@superloomdev/js-server-helper-kv-valkey` | `helper-kv-valkey` |

## Direct Dependencies

- `aws4` - SigV4 query signing for IAM token generation
- `ioredis` - Redis/Valkey client (same as kv-valkey)

## Companion Files

- `kv-aws-elasticache.config.js` - keys: all kv-valkey keys plus `AWS_REGION`, `AWS_KEY`, `AWS_SECRET`, `IAM_USER_ID`, `CACHE_NAME`, `TOKEN_REFRESH_MARGIN_SECONDS`
- `kv-aws-elasticache.errors.js` - constants: all kv-valkey errors plus `KV_ELASTICACHE_IAM_TOKEN_FAILED`, `KV_ELASTICACHE_IAM_TOKEN_EXPIRED`
- `kv-aws-elasticache.validators.js` - functions: `validateConfig(CONFIG)`

## Loader Pattern (Factory)

```javascript
// With IAM auth
const KV = require('@superloomdev/js-server-helper-kv-aws-elasticache')(Lib, {
  HOST: 'cluster.cache.amazonaws.com',
  PORT: 6379,
  TLS: true,
  IAM_USER_ID: 'my-user',
  CACHE_NAME: 'my-cluster',
  AWS_KEY: 'AKIA...',
  AWS_SECRET: 'secret...',
  AWS_REGION: 'us-east-1'
});

// Without IAM auth (passthrough to kv-valkey)
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
| `KEY_PREFIX` | String | `''` | no | Key prefix for isolation |
| `SERIALIZE_JSON` | Boolean | `true` | no | JSON serialization |
| `SCAN_PAGE_SIZE` | Number | `100` | no | SCAN COUNT hint |
| `CONNECT_TIMEOUT_MS` | Number | `5000` | no | Connection timeout |
| `COMMAND_TIMEOUT_MS` | Number | `3000` | no | Command timeout |
| `AWS_REGION` | String | `'us-east-1'` | no | AWS region for SigV4 |
| `AWS_KEY` | String | - | if IAM | AWS access key ID |
| `AWS_SECRET` | String | - | if IAM | AWS secret access key |
| `IAM_USER_ID` | String | - | no | ElastiCache IAM user ID |
| `CACHE_NAME` | String | - | if IAM | ElastiCache cluster name |
| `TOKEN_REFRESH_MARGIN_SECONDS` | Number | `60` | no | Refresh token before expiry by this much |

## Exported Functions (17 total - same as kv-valkey)

All functions delegate to the underlying kv-valkey instance. Signatures and return shapes are identical.

### Lifecycle
close(instance) -> { success, error } | async:yes
ping(instance) -> { success, error } | async:yes

### Single Key
set(instance, key, value, ttl_seconds?) -> { success, error } | async:yes
get(instance, key) -> { success, value, error } | async:yes
delete(instance, key) -> { success, deleted_count, error } | async:yes
getKeyExists(instance, key) -> { success, exists, error } | async:yes

### Multiple Keys
setMany(instance, entries, ttl_seconds?) -> { success, error } | async:yes
getMany(instance, keys) -> { success, values, error } | async:yes
deleteMany(instance, keys) -> { success, deleted_count, error } | async:yes

### Scan
scan(instance, pattern, options?) -> { success, keys, error } | async:yes

### Hash
setHashField(instance, key, field, value) -> { success, error } | async:yes
getHashField(instance, key, field) -> { success, value, error } | async:yes
getHashFields(instance, key) -> { success, fields, error } | async:yes
deleteHashField(instance, key, field) -> { success, deleted_count, error } | async:yes

### TTL
setExpire(instance, key, ttl_seconds) -> { success, applied, error } | async:yes
getTtl(instance, key) -> { success, ttl_seconds, error } | async:yes

### Counter
increment(instance, key, by?) -> { success, value, error } | async:yes

## IAM Auth Flow

1. On first operation, module generates SigV4 token via `aws4.sign()`
2. Token is cached with expiry time (900s - 60s margin = 840s effective)
3. Token passed as PASSWORD to underlying ioredis client
4. On token expiry, fresh token generated on next operation
5. If IAM_USER_ID is not set, module falls through to kv-valkey passthrough mode

## Error Catalog

| Error type | When |
|---|---|
| `KV_CONNECTION_FAILED` | Server unreachable |
| `KV_COMMAND_FAILED` | Command fails operationally |
| `KV_TIMEOUT` | Command times out |
| `KV_SERIALIZATION_FAILED` | JSON serialization fails |
| `KV_ELASTICACHE_IAM_TOKEN_FAILED` | SigV4 token generation fails |
| `KV_ELASTICACHE_IAM_TOKEN_EXPIRED` | Token expired and refresh failed |
