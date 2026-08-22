# Data Model. `helper-cache`

Every cache entry is identified by two values: a namespace and a cache_code. This document explains what each field means, why it exists, and how to use it correctly. For the function reference see [API Reference](api.md). For configuration keys see [Configuration](configuration.md).

## On This Page

- [Core Concepts](#core-concepts)
- [Entry Shape](#entry-shape)
- [Namespace and Cache Code Design Guide](#namespace-and-cache-code-design-guide)
- [TTL and Expiry](#ttl-and-expiry)
- [Design Decisions](#design-decisions)

---

## Core Concepts

**Namespace.** The group that owns a set of cache entries. It carries no domain meaning - it is a composite-key segment that isolates one cache category from another. All store queries are scoped on `namespace` first.

```
namespace: 'ProductCatalog'     // one application cache category
namespace: 'UserSession'        // another, fully isolated
namespace: 'FeatureFlags'       // a third
```

The word `namespace` is used instead of `key` because `key` already means three different things across the target backends: a flat string in Valkey, a partition plus sort pair in DynamoDB, and `_id` in MongoDB. `namespace` is unambiguous.

**Cache code.** The specific entry identifier within a namespace. The application composes this as a hierarchical string. The cache module does not know or care about the cache_code's internal structure.

```
cache_code: 'electronics:laptop-x1'      // a product in the electronics category
cache_code: 'electronics:mouse-z2'       // another product in the same category
cache_code: 'clothing:jacket-m'          // a product in a different category
```

The colon in `electronics:laptop-x1` is part of the cache_code, not a separator the module interprets. The application owns the structure; the module treats `cache_code` as an opaque string.

**Cache-aside pattern.** The cache module never reads the source database. On a cache miss, the application fetches from the source and populates the cache:

```javascript
// 1. Try cache
let result = await Lib.Cache.getCache(instance, 'ProductCatalog', 'electronics:laptop-x1');

// 2. Cache miss - fetch from source
if (result.value === null) {
  result.value = await fetchProductFromDB(instance, 'electronics:laptop-x1');

  // 3. Populate cache (1 hour TTL)
  await Lib.Cache.setCache(instance, 'ProductCatalog', 'electronics:laptop-x1', result.value, 3600);
}
```

---

## Entry Shape

The cache module stores a JSON-serialized string. The store adapter handles backend-specific encoding. The logical entry shape is:

| Field | Type | Set by | Description |
|---|---|---|---|
| `namespace` | String | caller | Logical group. Maps to DynamoDB partition key, MongoDB `_id` prefix, Valkey key segment |
| `cache_code` | String | caller | Entry identifier within the namespace. Maps to DynamoDB sort key, MongoDB `_id` suffix, Valkey key suffix |
| `value` | String | cache module | JSON-serialized value. The cache module stringifies before delegating to the store |
| `expires_at` | Number/Date | store adapter | Expiry timestamp. Set by the adapter from `ttl_seconds`. Format is backend-specific (epoch seconds for DynamoDB, BSON Date for MongoDB, native EX for Valkey) |

---

## Namespace and Cache Code Design Guide

The two values together answer "what cache category does this entry belong to, and which entry is it?"

```javascript
// Product catalog cache. Namespace is the category, cache_code is the product path.
namespace: 'ProductCatalog'
cache_code: 'electronics:laptop-x1'

// User session cache. Namespace is the session type, cache_code is the user ID.
namespace: 'UserSession'
cache_code: 'user-42'

// Feature flags. Namespace is the environment, cache_code is the flag name.
namespace: 'FeatureFlags'
cache_code: 'production:checkout-v2'
```

The hierarchical structure of `cache_code` enables prefix invalidation. `deleteCacheByPrefix(instance, 'ProductCatalog', 'electronics:')` removes every electronics entry in one call, while `clothing:jacket-m` survives.

---

## TTL and Expiry

TTL is per-call via `ttl_seconds`. When omitted, the entry has no expiry and persists until explicitly deleted.

| Backend | TTL mechanism | Expiry timing | Adapter must filter on read? |
|---|---|---|---|
| Valkey/Redis | `SET key value EX ttl_seconds` | Immediate | No |
| ElastiCache | Same as Valkey | Immediate | No |
| DynamoDB | Native TTL attribute `expires_at` | ~48 hours | Yes |
| MongoDB | TTL index on `expires_at` | ~60 seconds | Yes |

DynamoDB and MongoDB adapters MUST filter expired entries on read, because the backend's deletion is asynchronous and an expired item may still be returned before the sweep runs.

---

## Design Decisions

### Why namespace and cache_code instead of cache_code and key?

The word "key" is overloaded. In Redis it means a string, in DynamoDB it means a partition plus sort pair, in MongoDB it means `_id`. Using `namespace` for the group and `cache_code` for the entry identifier is unambiguous. Neither name collides with backend-specific terminology.

### Why cache-aside instead of cache-through?

Cache-through (the cache fetches from the source on a miss) couples the cache module to the source database schema. Cache-aside keeps the cache module a dumb store with TTL and namespacing. The application owns the fetch logic, which varies per use case.

### Why prefix match only for deleteCacheByPrefix, clearCache, and listCacheCodes?

Range operators (`gt`, `lt`, `between`) are database queries, not cache operations. A cache invalidation is always "remove everything under this prefix" - the hierarchical structure of `cache_code` makes prefix match sufficient.

### Why does the store adapter own JSON serialization?

Each store adapter owns its own serialization. The Valkey and ElastiCache adapters JSON-stringify on setCache and JSON-parse on getCache because the underlying KV drivers store strings. The DynamoDB adapter also JSON-stringifies because it stores the value as a single string attribute. The cache module passes raw JavaScript objects to all adapters and receives raw JavaScript objects back; each adapter handles its own serialization needs. This gives each backend the freedom to choose its encoding (JSON string, native Map, BSON) without forcing every adapter into the same format.
