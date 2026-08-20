# Configuration

## Loader Pattern

### With IAM Auth (ElastiCache Production)

```javascript
const KV = require('@superloomdev/js-server-helper-kv-aws-elasticache')(Lib, {
  HOST: 'your-cluster.xxxxxx.cache.amazonaws.com',
  PORT: 6379,
  TLS: true,
  REGION: 'us-east-1',
  KEY: process.env.AWS_ACCESS_KEY_ID,
  SECRET: process.env.AWS_SECRET_ACCESS_KEY,
  IAM_USER_ID: 'your-elasticache-user-id',
  CACHE_NAME: 'your-cluster-name'
});
```

### Without IAM Auth (Local Testing)

```javascript
const KV = require('@superloomdev/js-server-helper-kv-aws-elasticache')(Lib, {
  HOST: 'localhost',
  PORT: 6379,
  TLS: false
});
```

When `IAM_USER_ID` is not set, the module connects with a plain ioredis client. This is used for local testing against a Valkey container.

## Config Keys

### Connection

| Key | Type | Default | Description |
|---|---|---|---|
| `HOST` | String | `'localhost'` | ElastiCache endpoint hostname |
| `PORT` | Number | `6379` | ElastiCache endpoint port |
| `DB` | Number | `0` | Logical database (0-15) |
| `TLS` | Boolean | `true` | Enable TLS (required for ElastiCache) |
| `TLS_CONFIG` | Object | - | Additional TLS options |
| `CONNECT_TIMEOUT_MS` | Number | `5000` | Connection timeout (ms) |
| `COMMAND_TIMEOUT_MS` | Number | `3000` | Command timeout (ms) |

### AWS Credentials

| Key | Type | Default | Description |
|---|---|---|---|
| `REGION` | String | `'us-east-1'` | AWS region for SigV4 signing |
| `KEY` | String | - | AWS access key ID (required if IAM_USER_ID set) |
| `SECRET` | String | - | AWS secret access key (required if IAM_USER_ID set) |
| `ENDPOINT` | String | - | Custom endpoint for local testing (skips IAM auth) |

### IAM Auth

| Key | Type | Default | Description |
|---|---|---|---|
| `IAM_USER_ID` | String | - | ElastiCache user ID with IAM auth mode |
| `CACHE_NAME` | String | - | ElastiCache cluster/replication group name (required if IAM_USER_ID set) |
| `SERVERLESS` | Boolean | `false` | Serverless cache (adds ResourceType=ServerlessCache to token) |
| `TOKEN_REFRESH_MARGIN_SECONDS` | Number | `60` | Refresh token this many seconds before expiry |

### Isolation and Serialization

| Key | Type | Default | Description |
|---|---|---|---|
| `KEY_PREFIX` | String | `''` | Key prefix for isolation |
| `SERIALIZE_JSON` | Boolean | `true` | JSON serialization on set/get |
| `SCAN_PAGE_SIZE` | Number | `100` | SCAN COUNT hint |

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

Attach the policy to the IAM identity whose credentials you pass as `KEY`/`SECRET`.

### 4. Configure the Module

```javascript
const KV = require('@superloomdev/js-server-helper-kv-aws-elasticache')(Lib, {
  HOST: 'my-cluster.xxxxxx.cache.amazonaws.com',
  PORT: 6379,
  TLS: true,
  REGION: 'us-east-1',
  KEY: 'AKIA...',
  SECRET: 'secret...',
  IAM_USER_ID: 'my-iam-user',
  CACHE_NAME: 'my-cluster'
});
```

## Token Refresh

IAM tokens expire after 900 seconds (15 minutes). The module:

1. Generates a token on first connection using `@smithy/signature-v4` `SignatureV4.presign()`
2. Caches the token with its expiry time
3. Checks the cache on every operation
4. Refreshes the token `TOKEN_REFRESH_MARGIN_SECONDS` (default 60) before expiry

Long-lived connections auto-disconnect after 12 hours per AWS policy. A reconnect generates a fresh token automatically.

## ElastiCache Limitations

| Configuration | Supported |
|---|---|
| Cluster mode disabled + IAM auth | Yes |
| Cluster mode disabled + password auth | Use `kv-valkey` instead |
| Cluster mode enabled | No |
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

## Direct Dependencies

- `ioredis` - Redis/Valkey client
- `@smithy/signature-v4` - AWS SDK v3 SigV4 signing
- `@aws-crypto/sha256-js` - SHA-256 hash for SigV4
