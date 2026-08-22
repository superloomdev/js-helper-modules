# THOUGHTS.md  -  helper-cache

Engineering decision journal. Documents the thinking process, alternatives
considered, and dead ends avoided so future contributors do not re-litigate
solved problems.

---

## Problem 1  -  Cache stampede

When a cached value expires, multiple concurrent requests for the same key
all miss the cache and all call the source database. Under load this can
overwhelm the source - the cache exists to protect it, but the stampede
defeats that purpose.

**Decision:** `getOrFetchCache` with opt-in distributed locking. When
`GET_OR_FETCH_LOCK_ENABLED` is true, only one concurrent caller fetches;
the rest wait and retry the cache read until the value appears.

**Why opt-in, not default:** locking adds round trips (setCacheLock, releaseCacheLock)
and retry latency. For low-concurrency workloads the stampede is not a
problem and the extra round trips are pure overhead. The caller decides
based on their concurrency profile.

**Why a distributed lock, not a local mutex:** Lambda runs each invocation
in a separate process. A local mutex only protects within one process, which
is useless when the stampede is across processes. The lock must live in the
shared store.

---

## Problem 2  -  Lock primitive: SET NX vs INCR + EXPIRE

The lock needs to be atomic: "set this key only if it does not exist, with
a TTL." Two approaches were considered.

**Option A: `SET key value NX EX ttl`** (single command). Atomic. The key
is set only if it does not exist, and the TTL is set in the same command.
If the process crashes, the TTL expires the key automatically.

**Option B: `INCR key` + `EXPIRE key ttl`** (two commands). Not atomic
between the two. If the process crashes after INCR but before EXPIRE, the
lock key exists with no TTL and never expires. The next caller can never
acquire it. This is the exact failure the TTL exists to prevent.

**Decision:** Option A. The kv-valkey driver was extended with
`setIfNotExists` to expose this primitive. The two-command approach was
rejected because it creates a window where the lock is permanent.

---

## Problem 3  -  Lock key separate from cache entry key

The lock key could have been the same as the cache entry key with a special
value, or a separate key with a different prefix.

**Decision:** separate key (`LOCK_KEY_PREFIX` instead of `KEY_PREFIX`).
Reasons:

1. Deleting a cache entry (via `deleteCache` or `deleteCacheByPrefix`) must not release a
   lock. If they shared a key, `deleteCache` would release the lock.
2. The lock's TTL is in milliseconds (short, for crash recovery); the
   cached value's TTL is in seconds (long, for cache freshness). They
   serve different purposes and should not interfere.
3. `deleteCacheByPrefix` uses SCAN with a glob pattern. If lock keys shared the cache
   prefix, `deleteCacheByPrefix` would delete active locks, breaking stampede protection
   mid-fetch.

---

## Problem 4  -  Serialization responsibility

Originally the cache module owned JSON serialization: `setCache` stringified
before delegating to the store, `getCache` parsed after. This was changed.

**Decision:** the store adapter owns serialization. The cache module passes
raw JavaScript objects to the store; the store serializes before handing to
the driver and deserializes before returning.

**Why:** different backends may serialize differently. A MongoDB adapter
might use BSON; a future adapter might use MessagePack. If the cache module
owns serialization, every adapter is forced into JSON. Moving serialization
to the adapter gives each backend the freedom to choose its encoding while
keeping the cache module's contract simple: raw objects in, raw objects out.

**Consequence:** `CACHE_SERIALIZATION_FAILED` was removed from the cache
module's error catalog. Serialization errors are now `CACHE_VALKEY_SERIALIZATION_FAILED`
in the Valkey adapter's catalog. Each adapter owns its own serialization error.

---

## Problem 5  -  `getCacheExists` return shape

`getCacheExists` could return a bare Boolean (like `is*` functions) or an
envelope (like `getCache`).

**Decision:** envelope `{ success, exists, error }`. The store call can fail
(driver unavailable), so `success: false` must be distinguishable from
`exists: false`. A bare Boolean cannot represent a failure. This matches
`getKeyExists` in the kv-valkey driver, which returns `{ success, exists, error }`.

The function-naming doctrine is explicit: a `has` that checks existence
against an engine that can be unavailable is not a predicate. It is a `get`
operation that checks existence, and it keeps its envelope under the name
`getCacheExists`. The `has` verb is reserved for pure functions that return
a bare Boolean and cannot fail.
