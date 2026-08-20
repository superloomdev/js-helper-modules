# Configuration

## Loader Pattern

### With IAM Auth (ElastiCache)

```javascript
const KV = require('@superloomdev/js-server-helper-kv-aws-elasticache')(Lib, {
  HOST: 'your-cluster.xxxxxx.cache.amazonaws.com',
  PORT: 6379,
  TLS: true,
  IAM_USER_ID: 'your-elasticache-user-id',
  CACHE_NAME: 'your-cluster-name',
  AWS_KEY: process.env.AWS_ACCESS_KEY_ID,
  AWS_SECRET: process.env.AWS_SECRET_ACCESS_KEY,
  AWS_REGION: 'us-east-1'
});
```

### Without IAM Auth (Passthrough)

```javascript
const KV = require('@superloomdev/js-server-helper-kv-aws-elasticache')(Lib, {
  HOST: 'localhost',
  PORT: 6379,
  TLS: false
});
```

When `IAM_USER_ID` is not set, the module delegates to `kv-valkey` with standard connection. Use `kv-valkey` directly for non-IAM use cases - this passthrough exists for testing convenience.

## Config Keys

### Connection (passthrough to kv-valkey)

| Key | Type | Default | Description |
|---|---|---|---|
| `HOST` | String | `'localhost'` | ElastiCache endpoint hostname |
| `PORT` | Number | `6379` | ElastiCache endpoint port |
| `DB` | Number | `0` | Logical database (0-15) |
| `TLS` | Boolean | `true` | Enable TLS (required for ElastiCache) |
| `TLS_CONFIG` | Object | - | Additional TLS options |
| `KEY_PREFIX` | String | `''` | Key prefix for isolation |
| `SERIALIZE_JSON` | Boolean | `true` | JSON serialization on set/get |
| `SCAN_PAGE_SIZE` | Number | `100` | SCAN COUNT hint |
| `CONNECT_TIMEOUT_MS` | Number | `5000` | Connection timeout (ms) |
| `COMMAND_TIMEOUT_MS` | Number | `3000` | Command timeout (ms) |

### AWS IAM Auth

| Key | Type | Default | Description |
|---|---|---|---|
| `AWS_REGION` | String | `'us-east-1'` | AWS region for SigV4 signing |
| `AWS_KEY` | String | - | AWS access key ID (required if IAM_USER_ID set) |
| `AWS_SECRET` | String | - | AWS secret access key (required if IAM_USER_ID set) |
| `IAM_USER_ID` | String | - | ElastiCache user ID with IAM auth mode |
| `CACHE_NAME` | String | - | ElastiCache cluster/replication group name (required if IAM_USER_ID set) |
| `TOKEN_REFRESH_MARGIN_SECONDS` | Number | `60` | Refresh token this many seconds before expiry |

## IAM Auth Setup

### 1. Create an ElastiCache User with IAM Auth

```bash
aws elasticache create-user \
  --user-id my-iam-user \
  --user-name my-iam-user \
  --engine redis \
  --authentication-mode Type=iam \
  --no-password-required
```

The `user-id` and `user-name` must be identical for IAM auth.

### 2. Create an IAM Policy

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "elasticache:Connect",
      "Resource": "arn:aws:elasticache:us-east-1:123456789012:serverlesscache:my-cluster"
    }
  ]
}
```

### 3. Attach the Policy to Your IAM User/Role

Attach the policy to the IAM identity whose credentials you pass as `AWS_KEY`/`AWS_SECRET`.

### 4. Configure the Module

```javascript
const KV = require('@superloomdev/js-server-helper-kv-aws-elasticache')(Lib, {
  HOST: 'my-cluster.xxxxxx.cache.amazonaws.com',
  PORT: 6379,
  TLS: true,
  IAM_USER_ID: 'my-iam-user',
  CACHE_NAME: 'my-cluster',
  AWS_KEY: 'AKIA...',
  AWS_SECRET: 'secret...',
  AWS_REGION: 'us-east-1'
});
```

## Token Refresh

IAM tokens expire after 900 seconds (15 minutes). The module:

1. Generates a token on first connection
2. Caches the token with its expiry time
3. Checks the cache on every operation
4. Refreshes the token `TOKEN_REFRESH_MARGIN_SECONDS` (default 60) before expiry

Long-lived connections auto-disconnect after 12 hours per AWS policy. A reconnect generates a fresh token automatically.

## ElastiCache Limitations

| Configuration | Supported |
|---|---|
| Cluster mode disabled + IAM auth | Yes |
| Cluster mode disabled + password auth | Use `kv-valkey` directly |
| Cluster mode enabled | No (D11) |
| MULTI/EXEC with IAM auth | No (AWS limitation) |

## When to Use This Module vs kv-valkey

| Scenario | Use |
|---|---|
| Self-hosted Valkey | `kv-valkey` |
| ElastiCache with password auth (AUTH token) | `kv-valkey` (set TLS + PASSWORD) |
| ElastiCache with IAM auth | `kv-aws-elasticache` (this module) |
| ElastiCache with cluster mode enabled | Neither (not supported) |

## Peer Dependencies

| Injection | Package | Alias |
|---|---|---|
| `Utils` | `@superloomdev/js-helper-utils` | `helper-utils` |
| `Debug` | `@superloomdev/js-helper-debug` | `helper-debug` |
| `Instance` | `@superloomdev/js-server-helper-instance` | `helper-instance` |
| `KV` (valkey) | `@superloomdev/js-server-helper-kv-valkey` | `helper-kv-valkey` |

## Direct Dependencies

- `aws4` - SigV4 query signing
- `ioredis` - Redis/Valkey client
