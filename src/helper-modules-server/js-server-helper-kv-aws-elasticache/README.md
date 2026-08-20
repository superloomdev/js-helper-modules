# @superloomdev/js-server-helper-kv-aws-elasticache

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![Node.js 24+](https://img.shields.io/badge/Node.js-24%2B-brightgreen.svg)](https://nodejs.org)

An AWS ElastiCache key-value driver with IAM authentication for Node.js. Wraps [`js-server-helper-kv-valkey`](https://github.com/superloomdev/superloom/blob/main/src/helper-modules-server/js-server-helper-kv-valkey) with SigV4 token generation, token caching, and auto-refresh. Part of [Superloom](https://superloom.dev).

**Use this module when** you need ElastiCache IAM authentication (short-lived signed tokens instead of static passwords). If you are using ElastiCache with password auth or self-hosted Valkey, use `js-server-helper-kv-valkey` directly - it supports ElastiCache with TLS and AUTH tokens out of the box.

## What This Is

A Class D cloud service wrapper that extends `kv-valkey` with ElastiCache-specific IAM authentication. The module:

1. Generates SigV4-signed auth tokens using AWS credentials (`aws4` library)
2. Caches tokens and refreshes them before expiry (max 15-minute TTL)
3. Passes the token as the `PASSWORD` to the underlying `ioredis` client
4. Exposes the same 17 functions as `kv-valkey` - consumers see no difference

The AWS SDK dependency (`aws4`) lives in this module only, not in `kv-valkey`. Self-hosters who run Valkey on their own infrastructure never install this package and never download AWS SDK code.

## ElastiCache Requirements

- Valkey 7.2+ or Redis OSS 7.0+
- Cluster mode **disabled** (single primary endpoint, replicas, failover)
- TLS enabled (in-transit encryption)
- ElastiCache user with `authentication-mode Type=iam`
- IAM policy granting `elasticache:Connect` on the cluster

## Adding to Your Project

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

## Dependencies

- `aws4` - SigV4 query signing (lightweight, no full AWS SDK needed)
- `ioredis` - Redis/Valkey client (same as kv-valkey)
- Peer: `helper-utils`, `helper-debug`, `helper-instance`, `helper-kv-valkey`

## Extended Documentation

- [API reference](https://github.com/superloomdev/superloom/blob/main/src/helper-modules-server/js-server-helper-kv-aws-elasticache/docs/api.md) - same 17 functions as kv-valkey
- [Configuration](https://github.com/superloomdev/superloom/blob/main/src/helper-modules-server/js-server-helper-kv-aws-elasticache/docs/configuration.md) - IAM auth setup, ACL, TLS, token refresh
- [Superloom](https://superloom.dev)

## License

MIT
