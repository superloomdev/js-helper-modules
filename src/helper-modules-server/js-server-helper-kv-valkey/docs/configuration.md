# Configuration

## Loader Pattern

```javascript
const KV = require('@superloomdev/js-server-helper-kv-valkey')(Lib, {
  HOST: process.env.KV_HOST || 'localhost',
  PORT: 6379,
  KEY_PREFIX: 'myapp:'
});
```

Each loader call returns an independent interface with its own ioredis client. Connection is lazy: the first operation connects.

## Config Keys

| Key | Type | Default | Description |
|---|---|---|---|
| `HOST` | String | `'localhost'` | Server hostname |
| `PORT` | Number | `6379` | Server port |
| `PASSWORD` | String | - | AUTH password or ElastiCache AUTH token |
| `USERNAME` | String | - | Valkey/Redis 6+ ACL username |
| `KEY_PREFIX` | String | `''` | Key prefix for isolation (applied on write, stripped on read) |
| `DB` | Number | `0` | Logical database (0-15). Functional, but prefer KEY_PREFIX |
| `TLS` | Boolean | `false` | Enable TLS |
| `TLS_CONFIG` | Object | - | Additional TLS options |
| `CONNECT_TIMEOUT_MS` | Number | `5000` | Connection timeout in milliseconds |
| `COMMAND_TIMEOUT_MS` | Number | `3000` | Command timeout in milliseconds |
| `SERIALIZE_JSON` | Boolean | `true` | JSON-serialize values on set, parse on get |
| `SCAN_PAGE_SIZE` | Number | `100` | COUNT hint for SCAN operations |

## KEY_PREFIX versus DB

Both provide multi-application isolation. `KEY_PREFIX` is the recommended mechanism.

**Why KEY_PREFIX is preferred even though DB works:**

1. **DB is capped.** A server exposes a fixed number of logical databases, 16 by default. KEY_PREFIX has no ceiling.
2. **Managed services may restrict it.** A hosted provider can cap or disable the database count independently of the engine. KEY_PREFIX is unaffected because it is purely client-side.
3. **DB is a migration trap.** If a deployment ever moves to a sharded topology, SELECT stops working and every DB-isolated application breaks at once. Prefix-isolated applications migrate unchanged.

## ElastiCache

ElastiCache with cluster mode disabled is supported by this module with no additional code.

| ElastiCache configuration | Supported? |
|---|---|
| Cluster mode disabled (single primary endpoint, optional replicas, automatic failover) | Yes |
| Cluster mode enabled (sharded, configuration endpoint) | No |

To connect to ElastiCache with cluster mode disabled:

```javascript
const KV = require('@superloomdev/js-server-helper-kv-valkey')(Lib, {
  HOST: 'your-elasticache-primary.xxxxxx.cache.amazonaws.com',
  PORT: 6379,
  TLS: true,
  PASSWORD: 'your-auth-token'
});
```

**IAM authentication is not supported.** ElastiCache IAM auth requires generating a signed, short-lived token using the AWS SDK. That dependency must not leak into a module a self-hoster installs. If IAM auth is required, a separate `kv-aws-elasticache` package would be built. That package is not built in this plan.

**ElastiCache is verified by the local Valkey suite** and is not tested against AWS directly. A Valkey container is the same engine, so if the suite passes locally, ElastiCache works with the exception of two cloud-only behaviors: TLS enforcement and IAM auth. Both are configuration-verified, not logic-verified.

## TLS

Set `TLS: true` to enable TLS. Pass additional TLS options via `TLS_CONFIG`:

```javascript
const KV = require('@superloomdev/js-server-helper-kv-valkey')(Lib, {
  HOST: 'your-server.com',
  PORT: 6379,
  TLS: true,
  TLS_CONFIG: { ca: fs.readFileSync('ca.pem') }
});
```

## Alternative Client

This module uses `ioredis` as its client library. The documented alternative is [`@valkey/valkey-glide`](https://github.com/valkey-io/valkey-glide), which has a Rust core with Node bindings and the most actively developed reliability feature set.

The wrapper pattern means swapping to GLIDE is one file (the `loadAdapter` function in `kv-valkey.js`) and no consumer change. This comparison does not need to be re-run.

## Peer Dependencies

The module receives these through the `Lib` container, not through `dependencies` in `package.json`. The project loader is responsible for loading them and passing them in.

| Peer | Package | Role |
|---|---|---|
| `Lib.Utils` | `@superloomdev/js-helper-utils` | Type checks, validation, data manipulation |
| `Lib.Debug` | `@superloomdev/js-helper-debug` | Structured logging plus `performanceAuditLog` for per-operation timing |
| `Lib.Instance` | `@superloomdev/js-server-helper-instance` | Process cleanup registration. The module registers its connection teardown with `Lib.Instance.addProcessCleanupRoutine` on first client creation. The deployment's `CLOSE_ON_CLEANUP` config on `helper-instance` controls when teardown runs, not this module |

The `Lib.Instance` peer is required. The module registers its connection teardown with `Lib.Instance.addProcessCleanupRoutine` on first client creation. The deployment's `CLOSE_ON_CLEANUP` config lives on `helper-instance`, not on this module.

## Direct Dependencies

- `ioredis` - Pure JavaScript Redis/Valkey client

## Environment Variables

The `_test/loader.js` reads these environment variables:

| Variable | Default | Description |
|---|---|---|
| `VALKEY_HOST` | `localhost` | Server hostname for testing |
| `VALKEY_PORT` | `6379` | Server port for testing |

## Testing Tiers

| Tier | Runtime | Description |
|---|---|---|
| Emulated | Valkey in Docker (`valkey/valkey:latest`) | `pretest` starts the container, `test` runs the suite, `posttest` tears it down |
| Integration | Real Valkey or Redis OSS server | Set `VALKEY_HOST` and `VALKEY_PORT`, run `node --test test.js` directly |
