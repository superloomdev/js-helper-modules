# THOUGHTS - helper-cache-store-dynamodb

## Design Decisions

### Single-Table Composite Key vs Flat Key

The Valkey adapter uses a flat key (`KEY_PREFIX + namespace + KEY_SEPARATOR + cache_code`) because Valkey has a flat keyspace. DynamoDB has a native composite primary key (partition + sort), so the adapter maps `namespace` to the partition key and `cache_code` to the sort key directly. No flattening, no separator, no prefix stripping. A `cache_code` containing any character round-trips correctly.

### Partition-Scoped deleteCacheByPrefix, clearCache, and listCacheCodes

The composite key design gives a significant advantage for `deleteCacheByPrefix`, `clearCache`, and `listCacheCodes`: they use `Query` with `begins_with` on the sort key, scoped to one partition key (namespace). This is O(N) over the partition, not O(N) over the entire table. The Valkey adapter's `SCAN` is O(N) over every key in the database.

### TTL: Native + Application-Side Check

DynamoDB native TTL is enabled on the `EXPIRY_FIELD` attribute. The adapter writes a Unix epoch timestamp (seconds) when `ttl_seconds` is provided. DynamoDB's background sweeper deletes expired items within ~48 hours.

Because the sweeper is not immediate, the adapter also checks `EXPIRY_FIELD` on read. If the timestamp has passed, the item is treated as a miss and the stale item is deleted immediately. This ensures expired items are never returned to the caller, even before the sweeper runs.

### Lock Key Design

Lock items share the same partition key (namespace) as cache entries but use a distinct sort-key prefix (`LOCK_SORT_KEY_PREFIX`, default: `\u001Flock\u001F`). The `\u001F` (ASCII Unit Separator) is a non-printable control character that cannot appear in any human-readable `cache_code`, so lock items and cache entries never collide.

This is preferable to a separate table because:
- No additional table provisioning
- `clearCache` on a namespace can optionally include lock items by adjusting the prefix
- Lock items benefit from the same TTL configuration

### Stale Lock Reclamation

DynamoDB's TTL sweeper may take up to 48 hours to delete expired items. An expired lock item still physically exists, so `writeRecordIfNotExists` (which uses `attribute_not_exists(pk)`) will return `applied: false` for an expired lock.

The adapter handles this by checking the existing lock's expiry when `writeRecordIfNotExists` returns `applied: false`. If the lock has expired, the stale item is deleted and the atomic write is retried. This introduces a small race window (between the check and the retry), but the worst case is two callers fetching instead of one - the stampede protection degrades gracefully, it does not fail.

An alternative would be a conditional `PutItem` with `ConditionExpression: attribute_not_exists(#pk) OR #expiry < :now`, which is fully atomic. This was rejected because it would require a new driver function (`writeRecordIfNotExistsOrExpired`) and the race window in the check-and-retry approach is acceptable for cache stampede protection.

### Serialization

DynamoDB's Document Client can store native JavaScript objects as nested attributes, but the adapter stores the value as a JSON string in a single `VALUE_FIELD` attribute. This matches the Valkey adapter's approach and keeps the value opaque to the database - no attribute name conflicts, no reserved word issues, no type marshalling surprises. The adapter owns `JSON.stringify` on `setCache` and `JSON.parse` on `getCache`.

### getCacheExists Uses getRecord

DynamoDB does not have a native "exists" check without fetching the item. The adapter uses `getRecord` and checks for item presence and expiry. The value is not deserialized. A projection expression could reduce data transfer, but the driver's `getRecord` does not support projections, and the full item is typically small (one JSON string + one timestamp).

### Strongly Consistent Reads

DynamoDB `GetItem` defaults to eventually consistent reads. The adapter passes `consistentRead: true` on `getCache`, `getCacheExists`, and `setCacheLock`'s stale-lock check. This is required for the cache's double-check locking pattern in `getOrFetchCache`: when a retrying caller acquires the lock after the previous holder released it, the recheck read must see the value the previous holder just stored. An eventually consistent read might return a stale miss, causing a redundant fetch and breaking the "fetcher called exactly once" stampede protection guarantee.

### clearCache and listCacheCodes Without Prefix

When `cache_code_prefix` is omitted, the adapter queries by partition key only (no `begins_with` condition on the sort key). DynamoDB rejects empty string values for key attributes in `begins_with`, so the sort key condition is omitted entirely rather than passing an empty string. This returns all items in the partition, which is the intended behavior.
