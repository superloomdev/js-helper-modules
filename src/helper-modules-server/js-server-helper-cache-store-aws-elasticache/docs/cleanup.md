# Cleanup - helper-cache-store-aws-elasticache

## Native TTL (Automatic)

ElastiCache handles expiry natively. When `setCache` is called with a `ttl_seconds` value, the key is stored with `SET key value EX ttl_seconds`. ElastiCache deletes the key automatically when the TTL expires - no application-side scheduling is required.

When `ttl_seconds` is omitted, the key has no expiry and persists until explicitly deleted via `deleteCache`, `deleteCacheByPrefix`, or `clearCache`.

## No Sweep Needed

Unlike SQL-backed stores or MongoDB (which has a ~60-second TTL sweeper lag), ElastiCache expiry is immediate and automatic. There is no `cleanupExpiredRecords` method in the store contract and no scheduled sweep to run.

Expired keys are simply absent on the next `getCache` - the adapter returns `value: null` (a cache miss) without any special handling.

## Explicit Invalidation

| Operation | Scope | Complexity |
|---|---|---|
| `deleteCache(instance, namespace, cache_code)` | One entry | O(1) |
| `deleteCacheByPrefix(instance, namespace, cache_code_prefix)` | All entries matching prefix | O(N) over entire keyspace |
| `clearCache(instance, namespace)` | All entries in namespace | O(N) over entire keyspace |

Prefer targeted `deleteCache` calls for routine invalidation. Use `deleteCacheByPrefix` and `clearCache` for administrative mass invalidation (deployments, cache warmups, namespace resets). See [Configuration](configuration.md#deletecachebyprefix-clearcache-and-listcachecodes-complexity) for the cost analysis.
