# Schema - helper-cache-store-valkey

## Key Structure

Valkey is a flat keyspace. Every cache entry is stored under one string key composed from three parts:

```
KEY_PREFIX + namespace + KEY_SEPARATOR + cache_code
```

Worked example with defaults (`KEY_PREFIX: 'cache:'`, `KEY_SEPARATOR: ':'`):

```
namespace:  ProductCatalog
cache_code: electronics:laptop-x1
full key:   cache:ProductCatalog:electronics:laptop-x1
```

The colon inside `electronics:laptop-x1` is part of the cache_code, not a separator the adapter interprets. The adapter strips a known-length prefix (`KEY_PREFIX + namespace + KEY_SEPARATOR`) to recover the cache_code; it does not split on `KEY_SEPARATOR`. A cache_code containing the separator round-trips correctly.

## Value Encoding

This adapter JSON-serializes every value before handing it to Valkey. The cache module passes raw JavaScript objects; the adapter owns serialization. No additional encoding or transformation happens beyond JSON.stringify/parse.

## TTL

TTL is native to Valkey. `setCache` with a `ttl_seconds` value issues `SET key value EX ttl_seconds` under the hood (via `Lib.KV.set`). Valkey deletes the key automatically when the TTL expires - no application-side sweep is needed.

When `ttl_seconds` is omitted, the key has no expiry and persists until explicitly deleted.

## No Secondary Index

Valkey has no partition key or sort key concept. The only index is the keyspace itself. `deleteCacheByPrefix`, `clearCache`, and `listCacheCodes` use `SCAN MATCH prefix*`, which iterates every key in the database and filters after retrieval. See [Configuration](configuration.md#deletecachebyprefix-clearcache-and-listcachecodes-complexity) for the O(N) cost analysis.

A SET-based secondary index (tracking cache_codes per namespace via `SADD`) was considered and rejected: it would add a `SADD` to every `setCache` call, need its own cleanup on `deleteCache`, and double the write cost. O(N) `deleteCacheByPrefix`/`clearCache` is the accepted trade.

### Expiry visibility in listCacheCodes

Valkey deletes an expired key lazily, on access, and `SCAN` may still return a key whose TTL has passed but which has not yet been reclaimed. `listCacheCodes` can therefore report a `cache_code` that a following `getCache` reports as a miss.

This is accepted, not worked around. Filtering would cost one `GET` per scanned key, turning a single `SCAN` pass into N round trips. The window is bounded by Valkey's own reclamation and is small in practice. Callers that need list-then-get to agree must tolerate a miss on the get, which is the normal cache contract anyway.

The DynamoDB adapter does filter, because its query already returns each item's expiry attribute and the filter costs nothing there.
