# Configuration - helper-cache-store-valkey

## Loader Pattern

```js
const Store = require('@superloomdev/js-server-helper-cache-store-valkey')(Lib, {
  KEY_PREFIX: 'cache:',
  KEY_SEPARATOR: ':'
});

Lib.Cache = require('@superloomdev/js-server-helper-cache')(Lib, {
  Store: Store
});
```

## Configuration Keys

| Key | Type | Required | Default | Description |
|-----|------|----------|---------|-------------|
| `KEY_PREFIX` | `String` | Yes | `'cache:'` | Prefix prepended to every composed Valkey key. Keeps cache entries isolated from non-cache keys in the same instance |
| `KEY_SEPARATOR` | `String` | Yes | `':'` | Separator between namespace and cache_code in the composed key. The adapter strips a known-length prefix (it does not split on this character), so a cache_code containing the separator round-trips correctly |

Both keys live on this adapter, not on the cache module. The cache module composes no backend key - it forwards `namespace` and `cache_code` to the store as separate parameters.

## Dependencies

| Package | Type | Purpose |
|---------|------|---------|
| `helper-utils` | Injected via `shared_libs.Utils` | Type checks |
| `helper-debug` | Injected via `shared_libs.Debug` | Structured debug logging |
| `helper-kv-valkey` | Injected via `shared_libs.KV` | Valkey/Redis driver wrapper |

The driver slot is named `KV` (the capability), never `Valkey` or `Redis` (the vendor). A vendor-named slot re-couples the module to that vendor through its own source text even though no import exists.

## Environment Variables

Consumed only by `_test/loader.js` - never read by the adapter itself.

| Variable | Default | Description |
|----------|---------|-------------|
| `VALKEY_HOST` | `localhost` | Valkey host |
| `VALKEY_PORT` | `6381` | Valkey port (6381 to avoid collision with kv-valkey tests on 6379) |

## clear and list Complexity

`clear` and `list` use `Lib.KV.scan`, which wraps Valkey's `SCAN` command with a `MATCH` glob pattern. **`SCAN` is O(N) over the entire keyspace.** It iterates every key in the database and filters after retrieval; the `MATCH` pattern does not narrow the scan scope.

Redis and Valkey expose a flat keyspace with no partition or sort key concept, so no prefix-scoped index exists. A SET-based secondary index was considered and rejected: it would add a `SADD` to every `set` call and need its own cleanup. O(N) `clear` is the accepted trade.

### Cost by deployment model

| Deployment | Cost of O(N) scan |
|---|---|
| Self-hosted Valkey | CPU only, no additional money |
| ElastiCache node-based | CPU only, no additional money (fixed instance cost) |
| ElastiCache serverless | **ECPUs charged per data scanned** - can be expensive |

### Recommendation

Prefer targeted `delete` calls for routine invalidation. Treat `clear` as an administrative operation used during deployments, cache warmups, or namespace resets - not on the request path.

## Testing Tier

| Tier | Runtime | Notes |
|------|---------|-------|
| Contract + Integration | Valkey via Docker Compose | `pretest`/`posttest` manage the Docker lifecycle |

```bash
npm install && npm test  # run from _test/
```

The `pretest` script runs `docker compose down -v` then `docker compose up -d --wait`. Never start Docker manually before running tests.
