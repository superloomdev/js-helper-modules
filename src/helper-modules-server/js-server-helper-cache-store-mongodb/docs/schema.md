# Schema - helper-cache-store-mongodb

## Collection Design

A single MongoDB collection with a composite string `_id`:

```
_id = namespace + '\u001F' + cache_code
```

The `\u001F` (ASCII Unit Separator) is a fixed, non-configurable separator that cannot appear in any human-readable identifier. This design gives O(1) `getCache`, `setCache`, and `deleteCache` (direct index hits on `_id`) and O(K) `deleteCacheByPrefix`, `clearCache`, and `listCacheCodes` (left-anchored regex on `_id`, which MongoDB converts to an index range scan).

Worked example:

```
namespace:  ProductCatalog
cache_code: electronics:laptop-x1
full _id:   ProductCatalog\u001Felectronics:laptop-x1
```

The separator is fixed at `\u001F` and is not configurable. A `cache_code` containing any character round-trips correctly because the separator itself cannot appear in a human-readable identifier.

## Value Encoding

The cache module passes raw JavaScript objects to the store. This adapter stores the value as a native BSON object field (`VALUE_FIELD`, default: `cache_value`). On `getCache`, the adapter returns the stored BSON object directly. No `JSON.stringify` or `JSON.parse` is needed - MongoDB stores JavaScript objects natively.

## TTL

TTL is handled via a MongoDB TTL index on the `EXPIRY_FIELD` attribute (default: `expires_at`). When `setCache` is called with a `ttl_seconds` value, the adapter writes a BSON Date to `EXPIRY_FIELD`. MongoDB's background sweeper deletes expired documents automatically, typically within 60 seconds.

For immediate expiry correctness, the adapter also checks `EXPIRY_FIELD` on read: if the Date has passed, the document is treated as a miss and the stale document is deleted. This ensures expired documents are not returned even before the sweeper runs.

When `ttl_seconds` is omitted, no `EXPIRY_FIELD` is written and the document persists until explicitly deleted.

The TTL index must be created on the `EXPIRY_FIELD` attribute at the collection level:

```
db.<collection>.createIndex({ expires_at: 1 }, { expireAfterSeconds: 0 })
```

This is done out-of-band via IaC, `mongosh`, or an admin script.

## Lock Keys

Distributed lock documents share the same collection as cache entries but use a distinct `_id` prefix (`LOCK_ID_PREFIX`, default: `\u001Flock\u001F`). The lock `_id` is `LOCK_ID_PREFIX + namespace + '\u001F' + cache_code`. This ensures:

- Lock documents do not collide with cache entry documents (the prefix uses the non-printable `\u001F` Unit Separator character)
- `deleteCacheByPrefix` and `listCacheCodes` with a cache_code prefix will not match lock documents (unless the prefix starts with `\u001Flock\u001F`, which no cache_code should)
- Lock documents can be queried independently if needed

Lock documents also carry an `EXPIRY_FIELD` Date for auto-expiry via the MongoDB TTL index.

## No Secondary Index

The default `_id` index is the only index. `deleteCacheByPrefix`, `clearCache`, and `listCacheCodes` use left-anchored regex on `_id`, which MongoDB converts to an index range scan on the `_id` B-tree. No secondary index is required.

## Expiry Visibility in listCacheCodes

`listCacheCodes` filters expired documents before returning the list. A document whose `EXPIRY_FIELD` Date has passed but which the MongoDB TTL sweeper has not yet deleted is excluded from the results. This ensures the list agrees with `getCache`: if `getCache` would return a miss for a document, `listCacheCodes` will not include its `cache_code`.

This is the opposite of `deleteCacheByPrefix` and `clearCache`, which count all physically deleted documents including expired-but-unswept ones. See [Cleanup](cleanup.md) for details.
