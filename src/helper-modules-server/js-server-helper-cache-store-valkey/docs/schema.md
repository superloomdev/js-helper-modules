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

The cache module JSON-serializes every value before handing it to the store. This adapter passes the string straight through to Valkey as-is. No additional encoding or transformation happens at the adapter level.

## TTL

TTL is native to Valkey. `set` with a `ttl_seconds` value issues `SET key value EX ttl_seconds` under the hood (via `Lib.KV.set`). Valkey deletes the key automatically when the TTL expires - no application-side sweep is needed.

When `ttl_seconds` is omitted, the key has no expiry and persists until explicitly deleted.

## No Secondary Index

Valkey has no partition key or sort key concept. The only index is the keyspace itself. `clear` and `list` use `SCAN MATCH prefix*`, which iterates every key in the database and filters after retrieval. See [Configuration](configuration.md#clear-and-list-complexity) for the O(N) cost analysis.

A SET-based secondary index (tracking cache_codes per namespace via `SADD`) was considered and rejected: it would add a `SADD` to every `set` call, need its own cleanup on `delete`, and double the write cost. O(N) `clear` is the accepted trade.
