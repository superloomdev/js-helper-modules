# THOUGHTS - helper-cache-store-aws-elasticache

## Design Decisions

### Functional Identity with the Valkey Adapter

AWS ElastiCache is a managed caching service that runs either the Redis or Valkey engine. The wire protocol, command set, data model, and TTL behavior are identical to a self-hosted Valkey or Redis instance. The adapter communicates with ElastiCache using the same Redis-compatible API as the Valkey adapter, so the store contract implementation is functionally identical: same key composition, same JSON serialization, same SCAN-based prefix matching, same atomic `SET NX` locking.

The only meaningful difference is operational, not functional: ElastiCache Serverless charges per ECU (ElastiCache Compute Unit) for data processed, which makes SCAN-based operations (`deleteCacheByPrefix`, `clearCache`, `listCacheCodes`) measurably more expensive than on a node-based deployment where SCAN costs only CPU. The adapter code does not change, but the cost profile does, and the documentation calls this out explicitly.

A separate adapter exists (rather than reusing the Valkey adapter directly) so that the module name, peer dependency (`helper-kv-aws-elasticache`), error types, and documentation all reflect the ElastiCache deployment context. This lets consumers reason about cost and operational characteristics without reading the Valkey adapter's source.

### Key Composition: Flat Keyspace

ElastiCache exposes a flat keyspace with no partition or sort key concept. The adapter composes a single string key from `KEY_PREFIX + namespace + KEY_SEPARATOR + cache_code`, matching the Valkey adapter's approach. The adapter strips a known-length prefix to recover the cache_code, so a cache_code containing the separator round-trips correctly.

### Serialization: JSON String

The adapter stores the value as a JSON string, not as native data structures. This keeps the value opaque to the database - no attribute name conflicts, no type marshalling surprises. The adapter owns `JSON.stringify` on `setCache` and `JSON.parse` on `getCache`. A serialization failure returns `CACHE_ELASTICACHE_SERIALIZATION_FAILED`.

This matches the Valkey adapter's approach. The MongoDB adapter, by contrast, stores native BSON and has no serialization step.

### TTL: Native, No Application-Side Check

ElastiCache handles TTL natively via `SET key value EX ttl_seconds`. Expired keys are deleted automatically and are simply absent on the next access. Unlike the DynamoDB adapter (up to 48-hour sweeper lag) and the MongoDB adapter (~60-second sweeper lag), no application-side expiry check is needed. The adapter returns `value: null` on a miss without any special handling.

### Lock Key Design

Lock keys use a separate prefix (`LOCK_KEY_PREFIX`, default: `cache:lock:`) from cache entry keys (`KEY_PREFIX`, default: `cache:`). This ensures that deleting a cache entry never releases a lock, and a lock's TTL is independent of the cached value's TTL. The lock is acquired via `Lib.KV.setIfNotExists` (atomic `SET NX`) with a TTL derived from `options.timeout_ms`.

This matches the Valkey adapter's approach. The DynamoDB and MongoDB adapters use a `\u001F` (ASCII Unit Separator) prefix within the same partition/collection, which is unnecessary here because ElastiCache has a flat keyspace and a distinct string prefix is sufficient.

### No SET-Based Secondary Index

A SET-based secondary index (tracking cache_codes per namespace via `SADD`) was considered and rejected. It would add a `SADD` to every `setCache` call, need its own cleanup on `deleteCache`, and double the write cost. O(N) `deleteCacheByPrefix`/`clearCache` via `SCAN` is the accepted trade.

On ElastiCache Serverless, this trade has an additional dimension: the `SADD`/`SREM` overhead on every write would also consume ECUs, so avoiding the secondary index is doubly justified.

### SCAN Cost on Serverless ElastiCache

The key operational difference from the Valkey adapter is cost. On node-based ElastiCache (self-managed or provisioned), `SCAN` costs CPU only. On ElastiCache Serverless, `SCAN` incurs ECU charges proportional to the amount of data scanned. This makes `deleteCacheByPrefix`, `clearCache`, and `listCacheCodes` potentially expensive operations on serverless deployments.

The adapter does not attempt to mitigate this at the code level. The same `SCAN` implementation is correct for both deployment models. Instead, the documentation explicitly warns about serverless ECU costs and recommends targeted `deleteCache` calls for routine invalidation.
