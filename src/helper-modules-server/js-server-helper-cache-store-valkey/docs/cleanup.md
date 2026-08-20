# Cleanup - helper-cache-store-valkey

## Native TTL (Automatic)

Valkey handles expiry natively. When `set` is called with a `ttl_seconds` value, the key is stored with `SET key value EX ttl_seconds`. Valkey deletes the key automatically when the TTL expires - no application-side scheduling is required.

When `ttl_seconds` is omitted, the key has no expiry and persists until explicitly deleted via `delete` or `clear`.

## No Sweep Needed

Unlike SQL-backed stores or MongoDB (which has a ~60-second TTL sweeper lag), Valkey expiry is immediate and automatic. There is no `cleanupExpiredRecords` method in the store contract and no scheduled sweep to run.

Expired keys are simply absent on the next `get` - the adapter returns `value: null` (a cache miss) without any special handling.

## Explicit Invalidation

| Operation | Scope | Complexity |
|---|---|---|
| `delete(instance, namespace, cache_code)` | One entry | O(1) |
| `clear(instance, namespace, cache_code_prefix)` | All entries matching prefix | O(N) over entire keyspace |
| `clear(instance, namespace)` | All entries in namespace | O(N) over entire keyspace |

Prefer targeted `delete` calls for routine invalidation. Use `clear` for administrative mass invalidation (deployments, cache warmups, namespace resets). See [Configuration](configuration.md#clear-and-list-complexity) for the cost analysis.
