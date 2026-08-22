# THOUGHTS - helper-cache-store-mongodb

## Design Decisions

### Composite _id vs Separate namespace and cache_code fields

MongoDB does not have a native composite key like DynamoDB's partition + sort. The two options are: (a) store `namespace` and `cache_code` as separate fields with a compound index, or (b) join them into a single composite string `_id`.

The adapter uses option (b): `_id = namespace + '\u001F' + cache_code`. The `\u001F` (ASCII Unit Separator) is a fixed, non-configurable separator that cannot appear in any human-readable identifier. This gives several advantages:

- The default `_id` index serves all queries - no secondary compound index to create or maintain
- `getCache`, `setCache`, and `deleteCache` are O(1) direct index hits on `_id`
- `deleteCacheByPrefix`, `clearCache`, and `listCacheCodes` use left-anchored regex on `_id`, which MongoDB converts to an index range scan
- No risk of a `cache_code` containing the separator, because `\u001F` cannot appear in a human-readable identifier

A separate-field design would require a compound index on `{ namespace: 1, cache_code: 1 }` and would not use the default `_id` index at all. The composite `_id` is simpler and uses the index MongoDB creates automatically.

### Left-anchored regex on _id index

`deleteCacheByPrefix`, `clearCache`, and `listCacheCodes` use left-anchored regex (`/^namespace\u001Fprefix/`) on the `_id` field. MongoDB's query optimizer converts a left-anchored regex to an index range scan on the `_id` B-tree, so this is O(K) where K = matching documents, not O(N) over the entire collection.

The adapter escapes regex special characters in the namespace and prefix before building the RegExp, to prevent regex injection. This is important because `namespace` and `cache_code_prefix` come from application code and could contain characters like `.`, `*`, or `(` that have special meaning in a regex.

### TTL: Native TTL Index + Application-Side Check

A MongoDB TTL index is created on the `EXPIRY_FIELD` attribute with `expireAfterSeconds: 0`. The adapter writes a BSON Date to `EXPIRY_FIELD` when `ttl_seconds` is provided. MongoDB's background sweeper deletes expired documents within ~60 seconds.

Because the sweeper is not immediate, the adapter also checks `EXPIRY_FIELD` on read. If the Date has passed, the document is treated as a miss and the stale document is deleted immediately. This ensures expired documents are never returned to the caller, even before the sweeper runs.

MongoDB's TTL sweeper runs approximately every 60 seconds, which is much faster than DynamoDB's TTL sweeper (up to 48 hours). The application-side check is still necessary for immediate correctness, but the storage reclamation lag is shorter.

### Lock Key Design

Lock documents share the same collection as cache entries but use a distinct `_id` prefix (`LOCK_ID_PREFIX`, default: `\u001Flock\u001F`). The lock `_id` is `LOCK_ID_PREFIX + namespace + '\u001F' + cache_code`. The `\u001F` (ASCII Unit Separator) is a non-printable control character that cannot appear in any human-readable `cache_code`, so lock documents and cache entry documents never collide.

This is preferable to a separate collection because:
- No additional collection provisioning
- `clearCache` on a namespace can optionally include lock documents by adjusting the prefix
- Lock documents benefit from the same TTL index configuration

### Stale Lock Reclamation

MongoDB's TTL sweeper may take up to 60 seconds to delete expired documents. An expired lock document still physically exists, so `insertRecordIfNotExists` (which catches the E11000 duplicate key error) will return `applied: false` for an expired lock.

The adapter handles this by checking the existing lock's expiry when `insertRecordIfNotExists` returns `applied: false`. If the lock has expired, the stale document is deleted and the atomic insert is retried. This introduces a small race window (between the check and the retry), but the worst case is two callers fetching instead of one - the stampede protection degrades gracefully, it does not fail.

An alternative would be a conditional update with `upsert` and a filter that checks `_id` does not exist OR `EXPIRY_FIELD` has passed, which is fully atomic. This was rejected because the driver's `insertRecordIfNotExists` does not support conditional upserts with expiry checks, and the race window in the check-and-retry approach is acceptable for cache stampede protection.

### Native BSON Storage (no JSON serialization)

MongoDB stores native BSON, so the adapter passes the raw JavaScript object straight through to `Lib.MongoDB` as the `VALUE_FIELD`. No `JSON.stringify` or `JSON.parse` is needed. This is simpler than the DynamoDB and Valkey adapters, which both JSON-serialize the value into a string field.

The advantage is that the value retains its native types (Date, ObjectId, Binary, etc.) through the round trip. The trade-off is that the value is not opaque to the database - field names in the value could theoretically conflict with `EXPIRY_FIELD` or other metadata fields. In practice this is not a problem because the value is stored under a single `VALUE_FIELD` key, so nested fields are namespaced under that key and cannot collide with top-level document fields.

There is no `SERIALIZATION_FAILED` error in this adapter's error catalog because there is no serialization step that can fail.

### getCacheExists Uses getRecord

MongoDB does not have a native "exists" check without fetching the document. The adapter uses `getRecord` and checks for document presence and expiry. The value is not returned to the caller. A projection could reduce the data transfer, but the overhead of fetching the full document is acceptable for a cache, and the driver's `getRecord` does not support projections.

### clearCache and listCacheCodes Without Prefix

When `cache_code_prefix` is omitted, the adapter uses a left-anchored regex matching only the namespace prefix (`/^namespace\u001F/`). This returns all documents in the namespace, which is the intended behavior. The regex naturally matches any `cache_code` because it only anchors on the namespace and separator, not on a cache_code prefix.
