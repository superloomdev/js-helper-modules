# Schema - helper-cache-store-dynamodb

## Table Design

A single DynamoDB table with a composite primary key:

```
Partition Key:  namespace   (type S)
Sort Key:       cache_code  (type S)
```

This design gives O(1) `getCache`, `setCache`, and `deleteCache` (direct index hits on the composite key) and O(N)-over-partition `deleteCacheByPrefix`, `clearCache`, and `listCacheCodes` (Query with `begins_with` on the sort key, scoped to one partition).

Worked example:

```
namespace:  ProductCatalog
cache_code: electronics:laptop-x1
full key:   PK=ProductCatalog, SK=electronics:laptop-x1
```

No flattening or separator is needed because DynamoDB has a native composite key. A `cache_code` containing any character round-trips correctly.

## Value Encoding

The cache module passes raw JavaScript objects to the store. This adapter JSON-stringifies the value and stores it as a single string attribute (`VALUE_FIELD`, default: `cache_value`). On `getCache`, the adapter JSON-parses the stored string before returning it to the cache module.

## TTL

TTL is handled via DynamoDB native TTL on the `EXPIRY_FIELD` attribute (default: `expiry_ttl`). When `setCache` is called with a `ttl_seconds` value, the adapter writes a Unix epoch timestamp (seconds) to `EXPIRY_FIELD`. DynamoDB's background sweeper deletes expired items automatically, typically within 48 hours.

For immediate expiry correctness, the adapter also checks `EXPIRY_FIELD` on read: if the timestamp has passed, the item is treated as a miss and the stale item is deleted. This ensures expired items are not returned even before the sweeper runs.

When `ttl_seconds` is omitted, no `EXPIRY_FIELD` is written and the item persists until explicitly deleted.

DynamoDB native TTL must be enabled on the `EXPIRY_FIELD` attribute at the table level. This is done out-of-band via IaC, AWS Console, or the `helper-nosql-aws-dynamodb-admin` module.

## Lock Keys

Distributed lock items share the same partition key (namespace) as cache entries but use a distinct sort-key prefix (`LOCK_SORT_KEY_PREFIX`, default: `\u001Flock\u001F`). This ensures:

- Lock items do not collide with cache_code values (the prefix uses the non-printable `\u001F` Unit Separator character)
- `deleteCacheByPrefix` and `listCacheCodes` with a cache_code prefix will not match lock items (unless the prefix starts with `\u001Flock\u001F`, which no cache_code should)
- Lock items can be queried independently if needed

Lock items also carry an `EXPIRY_FIELD` timestamp for auto-expiry via DynamoDB native TTL.

## No Secondary Index

The composite primary key (partition + sort) is the only index. `deleteCacheByPrefix`, `clearCache`, and `listCacheCodes` use `Query` with `begins_with` on the sort key, which is served from the primary index. No GSI is required.
