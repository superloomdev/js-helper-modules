// Tests for helper-cache-store-aws-elasticache
// Integration tests against a real ElastiCache instance via Docker Compose.
// process.env is NEVER accessed in test files - only in loader.js.
//
// Two tiers are exercised:
//   1. The store adapter directly (store contract methods)
//   2. The parent cache module composed with this store (real composition)
'use strict';

const assert = require('node:assert/strict');
const { describe, it, before, after, beforeEach } = require('node:test');

// Load all dependencies via test loader (mirrors main project loader pattern)
const { Lib } = require('./loader')();

// Store adapter under test
const StoreFactory = require('helper-cache-store-aws-elasticache');

// Parent cache module - proves the store contract lines up with the real
// composition the application will use.
const CacheFactory = require('helper-cache');

// Build a store with a test-specific prefix so we never collide with
// real data if the ElastiCache instance is shared.
const KEY_PREFIX = 'test-cache:';

const store = StoreFactory(Lib, {
  KEY_PREFIX: KEY_PREFIX,
  KEY_SEPARATOR: ':'
});

const Cache = CacheFactory(Lib, {
  Store: store
});

// Locked cache instance for getOrFetchCache stampede protection tests
const LockedCache = CacheFactory(Lib, {
  Store: store,
  GET_OR_FETCH_LOCK_ENABLED: true,
  GET_OR_FETCH_LOCK_TIMEOUT_MS: 2000,
  GET_OR_FETCH_LOCK_RETRY_MS: 20,
  GET_OR_FETCH_LOCK_RETRY_JITTER_MS: 10
});


// Build a fresh instance for each test. instance.time is not used by the
// ElastiCache adapter (TTL is native), but the parent cache module expects it.
const createInstance = function () {
  return Lib.Instance.initialize();
};


// Helper - flush all test-cache: keys (including lock keys) between tests
// so suites stay independent.
const flushTestKeys = async function (instance) {
  const patterns = [KEY_PREFIX + '*', 'test-cache:lock:*'];
  for (let i = 0; i < patterns.length; i++) {
    const scan_result = await Lib.KV.scan(instance, patterns[i]);
    if (scan_result.success && scan_result.keys.length > 0) {
      await Lib.KV.deleteMany(instance, scan_result.keys);
    }
  }
};


// ============================================================================
// SETUP / TEARDOWN
// ============================================================================

before(async function () {
  const instance = createInstance();
  await flushTestKeys(instance);
});

// Flush all test-cache: keys before each test group so suites stay independent.
beforeEach(async function () {
  const instance = createInstance();
  await flushTestKeys(instance);
});

after(async function () {
  const instance = createInstance();
  await flushTestKeys(instance);
  await Lib.KV.close(instance);
});


// ============================================================================
// 1. SET + GET ROUND-TRIP (store tier)
// ============================================================================

describe('Store tier: setCache + getCache round-trip', function () {

  it('round-trips an object value through the store (store owns serialization)', async function () {
    const instance = createInstance();

    await store.setCache(instance, 'ProductCatalog', 'electronics:laptop-x1', { price: 1299 }, 3600);
    const result = await store.getCache(instance, 'ProductCatalog', 'electronics:laptop-x1');

    assert.strictEqual(result.success, true);
    assert.deepStrictEqual(result.value, { price: 1299 });
    assert.strictEqual(result.error, null);
  });

  it('round-trips a string value through the store', async function () {
    const instance = createInstance();

    await store.setCache(instance, 'FeatureFlags', 'checkout-v2', 'enabled', 3600);
    const result = await store.getCache(instance, 'FeatureFlags', 'checkout-v2');

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.value, 'enabled');
  });

});


// ============================================================================
// 2. SET + GET ROUND-TRIP (parent cache tier)
// ============================================================================

describe('Cache tier: setCache + getCache round-trip', function () {

  it('round-trips an object value through the full cache composition', async function () {
    const instance = createInstance();

    const value = { id: 'laptop-x1', price: 1299 };
    await Cache.setCache(instance, 'ProductCatalog', 'electronics:laptop-x1', value, 3600);
    const result = await Cache.getCache(instance, 'ProductCatalog', 'electronics:laptop-x1');

    assert.strictEqual(result.success, true);
    assert.deepStrictEqual(result.value, value);
  });

});


// ============================================================================
// 3. GET CACHE MISS
// ============================================================================

describe('getCache cache miss', function () {

  it('returns value null for absent cache_code', async function () {
    const instance = createInstance();

    const result = await store.getCache(instance, 'ProductCatalog', 'nonexistent');

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.value, null);
  });

});


// ============================================================================
// 4. DELETE
// ============================================================================

describe('deleteCache', function () {

  it('deletes an existing entry then getCache returns null', async function () {
    const instance = createInstance();

    await store.setCache(instance, 'ProductCatalog', 'electronics:laptop-x1', 'value', 3600);
    await store.deleteCache(instance, 'ProductCatalog', 'electronics:laptop-x1');

    const result = await store.getCache(instance, 'ProductCatalog', 'electronics:laptop-x1');

    assert.strictEqual(result.value, null);
  });


  it('succeeds idempotently on a non-existent entry', async function () {
    const instance = createInstance();

    const result = await store.deleteCache(instance, 'ProductCatalog', 'never-existed');

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.error, null);
  });

});


// ============================================================================
// 5. NAMESPACE ISOLATION
// ============================================================================

describe('namespace isolation', function () {

  it('same cache_code in two namespaces holds two distinct values', async function () {
    const instance = createInstance();

    await store.setCache(instance, 'NamespaceA', 'shared-code', 'value-a', 3600);
    await store.setCache(instance, 'NamespaceB', 'shared-code', 'value-b', 3600);

    const a = await store.getCache(instance, 'NamespaceA', 'shared-code');
    const b = await store.getCache(instance, 'NamespaceB', 'shared-code');

    assert.strictEqual(a.value, 'value-a');
    assert.strictEqual(b.value, 'value-b');
  });

});


// ============================================================================
// 6. DELETE CACHE BY PREFIX
// ============================================================================

describe('deleteCacheByPrefix', function () {

  it('removes only matching entries', async function () {
    const instance = createInstance();

    await store.setCache(instance, 'ProductCatalog', 'electronics:laptop-x1', 'a', 3600);
    await store.setCache(instance, 'ProductCatalog', 'electronics:mouse-z2', 'b', 3600);
    await store.setCache(instance, 'ProductCatalog', 'clothing:jacket-m', 'c', 3600);

    const result = await store.deleteCacheByPrefix(instance, 'ProductCatalog', 'electronics:');

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.deleted_count, 2);

    const laptop = await store.getCache(instance, 'ProductCatalog', 'electronics:laptop-x1');
    const mouse = await store.getCache(instance, 'ProductCatalog', 'electronics:mouse-z2');
    const jacket = await store.getCache(instance, 'ProductCatalog', 'clothing:jacket-m');

    assert.strictEqual(laptop.value, null);
    assert.strictEqual(mouse.value, null);
    assert.strictEqual(jacket.value, 'c');
  });

});


// ============================================================================
// 7. CLEAR CACHE (wipe all in namespace)
// ============================================================================

describe('clearCache', function () {

  it('clears every entry in the namespace', async function () {
    const instance = createInstance();

    await store.setCache(instance, 'ProductCatalog', 'electronics:laptop-x1', 'a', 3600);
    await store.setCache(instance, 'ProductCatalog', 'clothing:jacket-m', 'b', 3600);

    const result = await store.clearCache(instance, 'ProductCatalog');

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.deleted_count, 2);

    const laptop = await store.getCache(instance, 'ProductCatalog', 'electronics:laptop-x1');
    const jacket = await store.getCache(instance, 'ProductCatalog', 'clothing:jacket-m');

    assert.strictEqual(laptop.value, null);
    assert.strictEqual(jacket.value, null);
  });


  it('clearing one namespace leaves another untouched', async function () {
    const instance = createInstance();

    await store.setCache(instance, 'ProductCatalog', 'electronics:laptop-x1', 'a', 3600);
    await store.setCache(instance, 'FeatureFlags', 'checkout-v2', 'enabled', 3600);

    await store.clearCache(instance, 'ProductCatalog');

    const flag = await store.getCache(instance, 'FeatureFlags', 'checkout-v2');

    assert.strictEqual(flag.value, 'enabled');
  });

});


// ============================================================================
// 8. CLEAR ON EMPTY NAMESPACE
// ============================================================================

describe('clearCache on empty namespace', function () {

  it('returns deleted_count 0 without error', async function () {
    const instance = createInstance();

    const result = await store.clearCache(instance, 'EmptyNamespace');

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.deleted_count, 0);
    assert.strictEqual(result.error, null);
  });

});


// ============================================================================
// 9. LIST WITH PREFIX
// ============================================================================

describe('listCacheCodes with cache_code_prefix', function () {

  it('returns only matching cache_codes without the namespace prefix', async function () {
    const instance = createInstance();

    await store.setCache(instance, 'ProductCatalog', 'electronics:laptop-x1', 'a', 3600);
    await store.setCache(instance, 'ProductCatalog', 'electronics:mouse-z2', 'b', 3600);
    await store.setCache(instance, 'ProductCatalog', 'clothing:jacket-m', 'c', 3600);

    const result = await store.listCacheCodes(instance, 'ProductCatalog', 'electronics:');

    assert.strictEqual(result.success, true);
    assert.deepStrictEqual(result.cache_codes.sort(), ['electronics:laptop-x1', 'electronics:mouse-z2']);
  });

});


// ============================================================================
// 10. LIST WITHOUT PREFIX
// ============================================================================

describe('listCacheCodes without cache_code_prefix', function () {

  it('returns all cache_codes in the namespace', async function () {
    const instance = createInstance();

    await store.setCache(instance, 'ProductCatalog', 'electronics:laptop-x1', 'a', 3600);
    await store.setCache(instance, 'ProductCatalog', 'clothing:jacket-m', 'b', 3600);

    const result = await store.listCacheCodes(instance, 'ProductCatalog');

    assert.strictEqual(result.success, true);
    assert.deepStrictEqual(result.cache_codes.sort(), ['clothing:jacket-m', 'electronics:laptop-x1']);
  });

});


// ============================================================================
// 11. TTL EXPIRY (real timing)
// ============================================================================

describe('TTL expiry (real timing)', function () {

  it('entry expires after ttl_seconds', async function () {
    const instance = createInstance();

    await store.setCache(instance, 'ProductCatalog', 'electronics:laptop-x1', 'value', 1);

    // Get immediately - value present
    const before = await store.getCache(instance, 'ProductCatalog', 'electronics:laptop-x1');
    assert.strictEqual(before.value, 'value');

    // Wait past the TTL
    await new Promise(function (resolve) { setTimeout(resolve, 1500); });

    // Get again - value is null (expired)
    const after = await store.getCache(instance, 'ProductCatalog', 'electronics:laptop-x1');
    assert.strictEqual(after.success, true);
    assert.strictEqual(after.value, null);
  });

});


// ============================================================================
// 12. KEY_PREFIX ISOLATION
// ============================================================================

describe('KEY_PREFIX isolation', function () {

  it('clearCache on a namespace does not touch unrelated keys outside the prefix', async function () {
    const instance = createInstance();

    // Write a raw key through Lib.KV that is outside the cache prefix
    await Lib.KV.set(instance, 'unrelated:key', 'should-survive', 3600);

    // Seed and clear a cache namespace
    await store.setCache(instance, 'ProductCatalog', 'electronics:laptop-x1', 'a', 3600);
    await store.clearCache(instance, 'ProductCatalog');

    // The unrelated key must survive
    const unrelated = await Lib.KV.get(instance, 'unrelated:key');
    assert.strictEqual(unrelated.value, 'should-survive');

    // Cleanup the unrelated key
    await Lib.KV.delete(instance, 'unrelated:key');
  });

});


// ============================================================================
// 13. GET CACHE EXISTS - EXISTENCE CHECK (store tier)
// ============================================================================

describe('Store tier: getCacheExists', function () {

  it('returns exists: true for a present entry', async function () {
    const instance = createInstance();

    await store.setCache(instance, 'ProductCatalog', 'electronics:laptop-x1', { price: 1299 }, 3600);

    const result = await store.getCacheExists(instance, 'ProductCatalog', 'electronics:laptop-x1');

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.exists, true);
    assert.strictEqual(result.error, null);
  });


  it('returns exists: false for an absent entry', async function () {
    const instance = createInstance();

    const result = await store.getCacheExists(instance, 'ProductCatalog', 'nonexistent');

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.exists, false);
  });


  it('returns exists: false after TTL expiry', async function () {
    const instance = createInstance();

    await store.setCache(instance, 'ProductCatalog', 'electronics:laptop-x1', 'value', 1);

    // Wait past the TTL
    await new Promise(function (resolve) { setTimeout(resolve, 1500); });

    const result = await store.getCacheExists(instance, 'ProductCatalog', 'electronics:laptop-x1');

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.exists, false);
  });

});


// ============================================================================
// 14. GET CACHE EXISTS - EXISTENCE CHECK (cache tier)
// ============================================================================

describe('Cache tier: getCacheExists', function () {

  it('returns exists: true for a present entry', async function () {
    const instance = createInstance();

    await Cache.setCache(instance, 'ProductCatalog', 'electronics:laptop-x1', { price: 1299 }, 3600);

    const result = await Cache.getCacheExists(instance, 'ProductCatalog', 'electronics:laptop-x1');

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.exists, true);
  });


  it('returns exists: false for an absent entry', async function () {
    const instance = createInstance();

    const result = await Cache.getCacheExists(instance, 'ProductCatalog', 'nonexistent');

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.exists, false);
  });

});


// ============================================================================
// 15. SET CACHE LOCK / RELEASE CACHE LOCK (store tier)
// ============================================================================

describe('Store tier: setCacheLock / releaseCacheLock', function () {

  it('first setCacheLock on absent key applies', async function () {
    const instance = createInstance();

    const result = await store.setCacheLock(instance, 'NS', 'code-1', { timeout_ms: 3000 });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.applied, true);
    assert.strictEqual(result.error, null);
  });


  it('second setCacheLock on same key does not apply', async function () {
    const instance = createInstance();

    await store.setCacheLock(instance, 'NS', 'code-1', { timeout_ms: 3000 });
    const result = await store.setCacheLock(instance, 'NS', 'code-1', { timeout_ms: 3000 });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.applied, false);
  });


  it('releaseCacheLock allows re-acquisition', async function () {
    const instance = createInstance();

    await store.setCacheLock(instance, 'NS', 'code-1', { timeout_ms: 3000 });
    await store.releaseCacheLock(instance, 'NS', 'code-1');

    const result = await store.setCacheLock(instance, 'NS', 'code-1', { timeout_ms: 3000 });

    assert.strictEqual(result.applied, true);
  });


  it('releaseCacheLock is idempotent', async function () {
    const instance = createInstance();

    const result = await store.releaseCacheLock(instance, 'NS', 'never-locked');

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.error, null);
  });


  it('lock key is separate from cache entry key', async function () {
    const instance = createInstance();

    // Set a cache entry
    await store.setCache(instance, 'NS', 'code-1', 'value', 3600);

    // Acquire a lock for the same namespace+cache_code
    await store.setCacheLock(instance, 'NS', 'code-1', { timeout_ms: 3000 });

    // Delete the cache entry
    await store.deleteCache(instance, 'NS', 'code-1');

    // The lock should still exist - deleting the cache entry did not release the lock
    const lock_result = await store.setCacheLock(instance, 'NS', 'code-1', { timeout_ms: 3000 });
    assert.strictEqual(lock_result.applied, false, 'lock should survive cache entry deletion');

    // Cleanup
    await store.releaseCacheLock(instance, 'NS', 'code-1');
  });


  it('expired lock allows re-acquisition (crash recovery)', async function () {
    const instance = createInstance();

    // Acquire a lock with a 1 second TTL
    await store.setCacheLock(instance, 'NS', 'code-1', { timeout_ms: 1000 });

    // Wait for the lock to expire
    await new Promise(function (resolve) { setTimeout(resolve, 1500); });

    // Should be able to acquire again
    const result = await store.setCacheLock(instance, 'NS', 'code-1', { timeout_ms: 3000 });

    assert.strictEqual(result.applied, true);

    // Cleanup
    await store.releaseCacheLock(instance, 'NS', 'code-1');
  });

});


// ============================================================================
// 16. GET OR FETCH CACHE - UNLOCKED (cache tier, real ElastiCache)
// ============================================================================

describe('Cache tier: getOrFetchCache - unlocked (real ElastiCache)', function () {

  it('returns cached value on hit without calling fetcher', async function () {
    const instance = createInstance();

    await Cache.setCache(instance, 'ProductCatalog', 'electronics:laptop-x1', { price: 1299 }, 3600);

    let fetcherCalled = false;
    const result = await Cache.getOrFetchCache(
      instance, 'ProductCatalog', 'electronics:laptop-x1', 3600,
      async function () { fetcherCalled = true; return { price: 999 }; }
    );

    assert.strictEqual(result.success, true);
    assert.deepStrictEqual(result.value, { price: 1299 });
    assert.strictEqual(fetcherCalled, false);
  });


  it('calls fetcher on miss, caches result, returns it', async function () {
    const instance = createInstance();

    const result = await Cache.getOrFetchCache(
      instance, 'ProductCatalog', 'electronics:laptop-x1', 3600,
      async function () { return { price: 1299 }; }
    );

    assert.strictEqual(result.success, true);
    assert.deepStrictEqual(result.value, { price: 1299 });

    // Verify it was cached
    const cached = await Cache.getCache(instance, 'ProductCatalog', 'electronics:laptop-x1');
    assert.deepStrictEqual(cached.value, { price: 1299 });
  });


  it('returns CACHE_FETCHER_FAILED when fetcher throws', async function () {
    const instance = createInstance();

    const result = await Cache.getOrFetchCache(
      instance, 'ProductCatalog', 'electronics:laptop-x1', 3600,
      async function () { throw new Error('database down'); }
    );

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error.type, 'CACHE_FETCHER_FAILED');
  });

});


// ============================================================================
// 17. GET OR FETCH CACHE - LOCKED (cache tier, real ElastiCache, stampede protection)
// ============================================================================

describe('Cache tier: getOrFetchCache - locked (real ElastiCache, stampede protection)', function () {

  it('acquires lock, fetches, caches, releases lock on miss', async function () {
    const instance = createInstance();

    const result = await LockedCache.getOrFetchCache(
      instance, 'ProductCatalog', 'electronics:laptop-x1', 3600,
      async function () { return { price: 1299 }; }
    );

    assert.strictEqual(result.success, true);
    assert.deepStrictEqual(result.value, { price: 1299 });

    // Verify it was cached
    const cached = await LockedCache.getCache(instance, 'ProductCatalog', 'electronics:laptop-x1');
    assert.deepStrictEqual(cached.value, { price: 1299 });
  });


  it('concurrent callers - fetcher called exactly once', async function () {
    const instance = createInstance();

    let callCount = 0;
    const fetcher = async function () {
      callCount = callCount + 1;
      // Simulate slow fetch
      await new Promise(function (resolve) { setTimeout(resolve, 100); });
      return 'fetched-value';
    };

    // Fire 5 concurrent getOrFetchCache for the same absent key
    const results = await Promise.all([
      LockedCache.getOrFetchCache(instance, 'NS', 'concurrent-1', 3600, fetcher),
      LockedCache.getOrFetchCache(instance, 'NS', 'concurrent-1', 3600, fetcher),
      LockedCache.getOrFetchCache(instance, 'NS', 'concurrent-1', 3600, fetcher),
      LockedCache.getOrFetchCache(instance, 'NS', 'concurrent-1', 3600, fetcher),
      LockedCache.getOrFetchCache(instance, 'NS', 'concurrent-1', 3600, fetcher)
    ]);

    // All should return the same value
    for (let i = 0; i < results.length; i++) {
      assert.strictEqual(results[i].success, true);
      assert.strictEqual(results[i].value, 'fetched-value');
    }

    // Fetcher should be called exactly once - stampede protection works
    assert.strictEqual(callCount, 1, 'fetcher should be called exactly once with real ElastiCache lock');
  });


  it('releases lock even when fetcher throws', async function () {
    const instance = createInstance();

    const result = await LockedCache.getOrFetchCache(
      instance, 'ProductCatalog', 'electronics:laptop-x1', 3600,
      async function () { throw new Error('database down'); }
    );

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error.type, 'CACHE_FETCHER_FAILED');

    // Verify the lock was released - we can acquire it manually
    const lock_result = await store.setCacheLock(instance, 'ProductCatalog', 'electronics:laptop-x1', { timeout_ms: 1000 });
    assert.strictEqual(lock_result.applied, true, 'lock should be released after fetcher throws');

    // Cleanup
    await store.releaseCacheLock(instance, 'ProductCatalog', 'electronics:laptop-x1');
  });

});


// ============================================================================
// 18. SERIALIZATION (store tier)
// ============================================================================

describe('Store tier: serialization', function () {

  it('setCache serializes and getCache deserializes an object', async function () {
    const instance = createInstance();

    const value = { nested: { object: true }, array: [1, 2, 3] };
    await store.setCache(instance, 'NS', 'code-1', value, 3600);
    const result = await store.getCache(instance, 'NS', 'code-1');

    assert.strictEqual(result.success, true);
    assert.deepStrictEqual(result.value, value);
  });


  it('setCache returns SERIALIZATION_FAILED for a circular object', async function () {
    const instance = createInstance();

    const circular = { name: 'circular' };
    circular.self = circular;

    const result = await store.setCache(instance, 'NS', 'code-1', circular, 3600);

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error.type, 'CACHE_ELASTICACHE_SERIALIZATION_FAILED');
  });

});
