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

## Exported Functions (18 total)

All functions are async and return an envelope. Same signatures and return shapes as kv-valkey.

### Lifecycle
close(instance) -> { success, error } | async:yes
  Close the connection. Idempotent: returns success if already closed or never connected.
  Teardown is registered with Lib.Instance.addProcessCleanupRoutine on first client creation. The deployment's CLOSE_ON_CLEANUP config on helper-instance decides when it runs: at SIGTERM on a persistent server, or after every request on a serverless runtime. A caller normally never calls close() directly.

ping(instance) -> { success, error } | async:yes
  Ping the server. Triggers lazy connect on first call.

### Single Key
set(instance, key, value, ttl_seconds?) -> { success, error }
setIfNotExists(instance, key, value, ttl_seconds?) -> { success, applied, error }
  Atomic SET NX. Returns `applied: true` on insert, `applied: false` on duplicate (not an error).
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

## Connection Lifecycle

The ioredis client is created lazily on the first call via `initIfNot(instance)` and shared for the process lifetime. On first creation, the module registers `KV.close` as a process-scoped cleanup routine with `Lib.Instance`. The module never decides when to close the connection. That decision belongs to the deployment:

| Deployment | CLOSE_ON_CLEANUP | When close runs |
|---|---|---|
| Persistent (Express, Docker, EC2) | false | On SIGTERM via `Lib.Instance.runProcessCleanup()` |
| Serverless (Lambda, Cloud Functions) | true | After every request via `Lib.Instance.runInstanceCleanup(instance)` |

## Patterns
- Performance logging: `Lib.Debug.performanceAuditLog` on every I/O function using a local `start_ms`
- Lazy loading: ioredis and AWS SDK packages loaded only when first function is called
- Key prefix: applied on write, stripped on read including scan results
- JSON serialization: set runs JSON.stringify, get runs JSON.parse (configurable via SERIALIZE_JSON)
- IAM auth: SigV4 token generated on first connection, cached, refreshed before expiry
- Single instance: no cluster mode, no fan-out
- Empty inputs: no-op success without contacting the engine
- Automatic cleanup: close() is registered with Lib.Instance.addProcessCleanupRoutine on first client creation. The deployment's CLOSE_ON_CLEANUP config on helper-instance decides when it runs
