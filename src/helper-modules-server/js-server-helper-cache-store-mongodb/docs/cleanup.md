# Cleanup - helper-cache-store-mongodb

## Native TTL (Automatic)

MongoDB handles expiry natively via the TTL index feature. When `setCache` is called with a `ttl_seconds` value, the adapter writes a BSON Date to the `EXPIRY_FIELD` attribute. MongoDB's background sweeper deletes expired documents automatically, typically within 60 seconds.

The TTL index must be created on the `EXPIRY_FIELD` attribute at the collection level:

```
db.<collection>.createIndex({ expires_at: 1 }, { expireAfterSeconds: 0 })
```

This is done out-of-band via IaC, `mongosh`, or an admin script.

## Application-Side Expiry Check

Because the MongoDB TTL sweeper may take up to 60 seconds to delete expired documents, the adapter also checks `EXPIRY_FIELD` on read. If the Date has passed, the document is treated as a miss and the stale document is deleted immediately. This ensures expired documents are never returned to the caller, even before the sweeper runs.

## No Scheduled Sweep Needed

There is no `cleanupExpiredRecords` method in the store contract and no scheduled sweep to run. The combination of the MongoDB TTL index (for storage reclamation) and the application-side expiry check (for read correctness) covers all cases.

## Explicit Invalidation

| Operation | Scope | Complexity |
|---|---|---|
| `deleteCache(instance, namespace, cache_code)` | One entry | O(1) |
| `deleteCacheByPrefix(instance, namespace, cache_code_prefix)` | All entries matching prefix in namespace | O(K) where K = matching documents |
| `clearCache(instance, namespace)` | All entries in namespace | O(K) where K = matching documents |

Prefer targeted `deleteCache` calls for routine invalidation. Use `deleteCacheByPrefix` and `clearCache` for administrative mass invalidation (deployments, cache warmups, namespace resets).

### What deleted_count counts

`deleted_count` is the number of documents physically removed from the collection, which can exceed the number of entries a caller would have considered live. The MongoDB TTL sweeper may lag by up to 60 seconds, so a prefix delete can remove documents whose TTL had already passed and which `getCache` would already have reported as misses.

This is deliberate. The count reports work actually done against the collection, not a logical live-entry count. `listCacheCodes` takes the opposite view and filters expired documents, because its answer is consumed as "what is in the cache" rather than "what was removed".
