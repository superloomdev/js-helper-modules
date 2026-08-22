# Configuration - helper-cache-store-aws-elasticache

## Loader Pattern

```js
const Store = require('@superloomdev/js-server-helper-cache-store-aws-elasticache')(Lib, {
  KEY_PREFIX: 'cache:',
  KEY_SEPARATOR: ':',
  LOCK_KEY_PREFIX: 'cache:lock:'
});

Lib.Cache = require('@superloomdev/js-server-helper-cache')(Lib, {
  Store: Store
});
```

## Configuration Keys

| Key | Type | Required | Default | Description |
|-----|------|----------|---------|-------------|
| `KEY_PREFIX` | `String` | Yes | `'cache:'` | Prefix prepended to every composed ElastiCache key. Keeps cache entries isolated from non-cache keys in the same instance |
| `KEY_SEPARATOR` | `String` | Yes | `':'` | Separator between namespace and cache_code in the composed key. The adapter strips a known-length prefix (it does not split on this character), so a cache_code containing the separator round-trips correctly |
| `LOCK_KEY_PREFIX` | `String` | Yes | `'cache:lock:'` | Prefix for distributed lock keys. Lock keys are separate from cache entry keys so deleting a cache entry never releases a lock, and a lock's TTL is independent of the cached value's TTL |

All three keys live on this adapter, not on the cache module. The cache module composes no backend key - it forwards `namespace` and `cache_code` to the store as separate parameters.

## Dependencies

| Package | Type | Purpose |
|---------|------|---------|
| `helper-utils` | Injected via `shared_libs.Utils` | Type checks |
| `helper-debug` | Injected via `shared_libs.Debug` | Structured debug logging |
| `helper-kv-aws-elasticache` | Injected via `shared_libs.KV` | ElastiCache driver wrapper |

The driver slot is named `KV` (the capability), never `ElastiCache` or `Redis` (the vendor). A vendor-named slot re-couples the module to that vendor through its own source text even though no import exists.

## Environment Variables

Consumed only by `_test/loader.js` - never read by the adapter itself.

| Variable | Default | Description |
|----------|---------|-------------|
| `ELASTICACHE_HOST` | `localhost` | ElastiCache host |
| `ELASTICACHE_PORT` | `6382` | ElastiCache port (6382 to avoid collision with kv-aws-elasticache tests on 6379) |

## deleteCacheByPrefix, clearCache, and listCacheCodes Complexity

`deleteCacheByPrefix`, `clearCache`, and `listCacheCodes` use `Lib.KV.scan`, which wraps ElastiCache's `SCAN` command with a `MATCH` glob pattern. **`SCAN` is O(N) over the entire keyspace.** It iterates every key in the database and filters after retrieval; the `MATCH` pattern does not narrow the scan scope.

ElastiCache exposes a flat keyspace with no partition or sort key concept, so no prefix-scoped index exists. A SET-based secondary index was considered and rejected: it would add a `SADD` to every `setCache` call and need its own cleanup. O(N) `deleteCacheByPrefix`/`clearCache` is the accepted trade.

### Cost by deployment model

| Deployment | Cost of O(N) scan |
|---|---|
| ElastiCache node-based | CPU only, no additional money (fixed instance cost) |
| ElastiCache serverless | **ECUs (ElastiCache Compute Units) charged per data scanned** - can be expensive |

### Serverless ECU cost warning

On ElastiCache Serverless, SCAN-based operations (`deleteCacheByPrefix`, `clearCache`, `listCacheCodes`) incur ECU charges proportional to the amount of data scanned. Unlike node-based ElastiCache where SCAN costs only CPU cycles, serverless billing converts every scanned key into a measurable cost. A `clearCache` on a namespace with millions of entries can generate significant ECU charges.

**Mitigation strategies:**
- Use targeted `deleteCache` calls for routine invalidation instead of `deleteCacheByPrefix`
- Reserve `clearCache` for administrative operations (deployments, namespace resets)
- Avoid calling `listCacheCodes` on the request path - it scans the entire keyspace
- Consider whether cache entries with short TTLs can expire naturally instead of being explicitly deleted

### Recommendation

Prefer targeted `deleteCache` calls for routine invalidation. Treat `deleteCacheByPrefix` and `clearCache` as administrative operations used during deployments, cache warmups, or namespace resets - not on the request path.

## Testing Tier

| Tier | Runtime | Notes |
|------|---------|-------|
| Contract + Integration | ElastiCache via Docker Compose (Valkey stand-in) | `pretest`/`posttest` manage the Docker lifecycle |

```bash
npm install && npm test  # run from _test/
```

The `pretest` script runs `docker compose down -v` then `docker compose up -d --wait`. Never start Docker manually before running tests.
