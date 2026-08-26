# @superloomdev/js-server-helper-kv-aws-elasticache

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![Node.js 24+](https://img.shields.io/badge/Node.js-24%2B-brightgreen.svg)](https://nodejs.org)

An AWS ElastiCache key-value driver with IAM authentication for Node.js. Standalone module using `ioredis` directly with AWS SDK v3 SigV4 signing. Part of [Superloom](https://superloom.dev).

**Use this module when** you need ElastiCache IAM authentication (short-lived signed tokens instead of static passwords). If you are using ElastiCache with password auth or self-hosted Valkey, use `js-server-helper-kv-valkey` instead.

## What This Is

A Class D cloud service wrapper that provides the same 17 key-value functions as `kv-valkey`, but as a fully standalone module with its own `ioredis` client and AWS SDK v3 SigV4 token generation. The module does **not** depend on `kv-valkey` - it owns its entire implementation.

The module:

1. Generates SigV4-signed auth tokens using `@smithy/signature-v4` (official AWS SDK v3)
2. Caches tokens and refreshes them before expiry (max 15-minute TTL)
3. Passes the token as the password to `ioredis`
4. Exposes 17 key-value functions: set, get, delete, scan, hash operations, TTL, counter

## Connection Lifecycle

The ioredis client is created lazily on the first call and shared for the process lifetime. Its teardown is registered with `helper-instance` so the deployment decides when it closes: at `SIGTERM` on a persistent server, or after every request on a serverless runtime. The module never decides when to close the connection.

## ElastiCache Requirements

- Valkey 7.2+ or Redis OSS 7.0+
- Cluster mode **disabled** (single primary endpoint)
- TLS enabled (in-transit encryption)
- ElastiCache user with `authentication-mode Type=iam`
- IAM policy granting `elasticache:Connect` on the cluster

## Adding to Your Project

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

## Dependencies

- `ioredis` - Redis/Valkey client
- `@smithy/signature-v4` - Official AWS SDK v3 SigV4 signing
- `@aws-crypto/sha256-js` - SHA-256 hash for SigV4
- Peer: `helper-utils`, `helper-debug`, `helper-instance`

## Extended Documentation

- [API reference](https://github.com/superloomdev/superloom/blob/main/src/helper-modules-server/js-server-helper-kv-aws-elasticache/docs/api.md) - 17 functions
- [Configuration](https://github.com/superloomdev/superloom/blob/main/src/helper-modules-server/js-server-helper-kv-aws-elasticache/docs/configuration.md) - IAM auth setup, ACL, TLS, token refresh
- [Superloom](https://superloom.dev)

## License

MIT
