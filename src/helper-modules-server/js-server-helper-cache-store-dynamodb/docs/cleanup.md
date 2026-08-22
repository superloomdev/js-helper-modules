# Cleanup - helper-cache-store-dynamodb

## Native TTL (Automatic)

DynamoDB handles expiry natively via the TTL feature. When `setCache` is called with a `ttl_seconds` value, the adapter writes a Unix epoch timestamp (seconds) to the `EXPIRY_FIELD` attribute. DynamoDB's background sweeper deletes expired items automatically, typically within 48 hours.

DynamoDB native TTL must be enabled on the `EXPIRY_FIELD` attribute at the table level. This is done out-of-band via IaC, AWS Console, or the `helper-nosql-aws-dynamodb-admin` module.

## Application-Side Expiry Check

Because the DynamoDB TTL sweeper may take up to 48 hours to delete expired items, the adapter also checks `EXPIRY_FIELD` on read. If the timestamp has passed, the item is treated as a miss and the stale item is deleted immediately. This ensures expired items are never returned to the caller, even before the sweeper runs.

## No Scheduled Sweep Needed

There is no `cleanupExpiredRecords` method in the store contract and no scheduled sweep to run. The combination of DynamoDB native TTL (for storage reclamation) and the application-side expiry check (for read correctness) covers all cases.

## Explicit Invalidation

| Operation | Scope | Complexity |
|---|---|---|
| `deleteCache(instance, namespace, cache_code)` | One entry | O(1) |
| `deleteCacheByPrefix(instance, namespace, cache_code_prefix)` | All entries matching prefix in namespace | O(N) over partition |
| `clearCache(instance, namespace)` | All entries in namespace | O(N) over partition |

Prefer targeted `deleteCache` calls for routine invalidation. Use `deleteCacheByPrefix` and `clearCache` for administrative mass invalidation (deployments, cache warmups, namespace resets).

### What deleted_count counts

`deleted_count` is the number of items physically removed from the table, which can exceed the number of entries a caller would have considered live. DynamoDB's TTL sweeper may lag by up to 48 hours, so a prefix delete can remove items whose TTL had already passed and which `getCache` would already have reported as misses.

This is deliberate. The count reports work actually done against the table, not a logical live-entry count. `listCacheCodes` takes the opposite view and filters expired items, because its answer is consumed as "what is in the cache" rather than "what was removed".
