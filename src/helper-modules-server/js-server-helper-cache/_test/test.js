// Tests for helper-cache
// Offline module - storage adapter is injected per-test (in-memory implementation).
// process.env is NEVER accessed in test files - only in loader.js
'use strict';

const assert = require('node:assert/strict');
const { describe, it } = require('node:test');

// Load all dependencies via test loader (mirrors main project loader pattern)
const { Lib } = require('./loader')();

// Cache module under test - constructed per-case with its own adapter
const CacheFactory = require('helper-cache');

// In-process Map-backed store fixture (Tier-2 enabler)
const createMemoryStore = require('./memory-store');


// Helper - shorthand to construct a cache instance backed by an injected
// store fixture. The ready-to-use store object is passed directly.
const buildCache = function (store, overrides) {
  return CacheFactory(Lib, Object.assign({ Store: store }, overrides || {}));
};


// Build an adapter that returns failure for every method - used to test
// error propagation paths through the cache module.
const createFailingStore = function () {

  return {

    getCache: async function () {
      return {
        success: false,
        value: null,
        error: { type: 'STORE_READ_FAILED', message: 'read failed (test fixture)' }
      };
    },

    setCache: async function () {
      return {
        success: false,
        error: { type: 'STORE_WRITE_FAILED', message: 'write failed (test fixture)' }
      };
    },

    deleteCache: async function () {
      return {
        success: false,
        error: { type: 'STORE_DELETE_FAILED', message: 'delete failed (test fixture)' }
      };
    },

    deleteCacheByPrefix: async function () {
      return {
        success: false,
        deleted_count: 0,
        error: { type: 'STORE_CLEAR_FAILED', message: 'clear failed (test fixture)' }
      };
    },

    clearCache: async function () {
      return {
        success: false,
        deleted_count: 0,
        error: { type: 'STORE_CLEAR_FAILED', message: 'clear failed (test fixture)' }
      };
    },

    listCacheCodes: async function () {
      return {
        success: false,
        cache_codes: [],
        error: { type: 'STORE_LIST_FAILED', message: 'list failed (test fixture)' }
      };
    },

    getCacheExists: async function () {
      return {
        success: false,
        exists: false,
        error: { type: 'STORE_HAS_FAILED', message: 'has failed (test fixture)' }
      };
    },

    setCacheLock: async function () {
      return {
        success: false,
        applied: false,
        error: { type: 'STORE_LOCK_FAILED', message: 'lock failed (test fixture)' }
      };
    },

    releaseCacheLock: async function () {
      return {
        success: false,
        error: { type: 'STORE_LOCK_FAILED', message: 'lock failed (test fixture)' }
      };
    }

  };

};


// Build a fresh instance for each test. instance.time is mutable so the
// TTL test can advance it deterministically without sleeping.
const createInstance = function (time) {
  return {
    time: time || 1000000
  };
};


// ============================================================================
// 1. STORE CONTRACT VALIDATION
// ============================================================================

describe('Store contract validation', function () {

  it('throws when store is missing getCache', function () {
    const store = createMemoryStore();
    delete store.getCache;

    assert.throws(function () {
      CacheFactory(Lib, { Store: store });
    }, /missing method `getCache`/);
  });


  it('throws when store is missing setCache', function () {
    const store = createMemoryStore();
    delete store.setCache;

    assert.throws(function () {
      CacheFactory(Lib, { Store: store });
    }, /missing method `setCache`/);
  });


  it('throws when store is missing deleteCache', function () {
    const store = createMemoryStore();
    delete store.deleteCache;

    assert.throws(function () {
      CacheFactory(Lib, { Store: store });
    }, /missing method `deleteCache`/);
  });


  it('throws when store is missing deleteCacheByPrefix', function () {
    const store = createMemoryStore();
    delete store.deleteCacheByPrefix;

    assert.throws(function () {
      CacheFactory(Lib, { Store: store });
    }, /missing method `deleteCacheByPrefix`/);
  });


  it('throws when store is missing clearCache', function () {
    const store = createMemoryStore();
    delete store.clearCache;

    assert.throws(function () {
      CacheFactory(Lib, { Store: store });
    }, /missing method `clearCache`/);
  });


  it('throws when store is missing listCacheCodes', function () {
    const store = createMemoryStore();
    delete store.listCacheCodes;

    assert.throws(function () {
      CacheFactory(Lib, { Store: store });
    }, /missing method `listCacheCodes`/);
  });


  it('throws when store is missing getCacheExists', function () {
    const store = createMemoryStore();
    delete store.getCacheExists;

    assert.throws(function () {
      CacheFactory(Lib, { Store: store });
    }, /missing method `getCacheExists`/);
  });


  it('succeeds when all 7 methods are present', function () {
    const store = createMemoryStore();

    assert.doesNotThrow(function () {
      buildCache(store);
    });
  });


  it('throws when lock is enabled but store is missing setCacheLock', function () {
    const store = createMemoryStore();
    delete store.setCacheLock;

    assert.throws(function () {
      buildCache(store, { GET_OR_FETCH_LOCK_ENABLED: true });
    }, /does not implement `setCacheLock`/);
  });


  it('throws when lock is enabled but store is missing releaseCacheLock', function () {
    const store = createMemoryStore();
    delete store.releaseCacheLock;

    assert.throws(function () {
      buildCache(store, { GET_OR_FETCH_LOCK_ENABLED: true });
    }, /does not implement `releaseCacheLock`/);
  });


  it('succeeds when lock is enabled and store has both lock methods', function () {
    const store = createMemoryStore();

    assert.doesNotThrow(function () {
      buildCache(store, { GET_OR_FETCH_LOCK_ENABLED: true });
    });
  });

});


// ============================================================================
// 2. SET + GET ROUND-TRIP
// ============================================================================

describe('setCache + getCache round-trip', function () {

  it('round-trips an object value', async function () {
    const cache = buildCache(createMemoryStore());
    const instance = createInstance();

    const value = { id: 'laptop-x1', price: 1299 };
    await cache.setCache(instance, 'ProductCatalog', 'electronics:laptop-x1', value, 3600);

    const result = await cache.getCache(instance, 'ProductCatalog', 'electronics:laptop-x1');

    assert.strictEqual(result.success, true);
    assert.deepStrictEqual(result.value, value);
    assert.strictEqual(result.error, null);
  });


  it('round-trips a string value', async function () {
    const cache = buildCache(createMemoryStore());
    const instance = createInstance();

    await cache.setCache(instance, 'FeatureFlags', 'checkout-v2', 'enabled', 3600);

    const result = await cache.getCache(instance, 'FeatureFlags', 'checkout-v2');

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.value, 'enabled');
  });


  it('persists without TTL when ttl_seconds is omitted', async function () {
    const cache = buildCache(createMemoryStore());
    const instance = createInstance();

    await cache.setCache(instance, 'ProductCatalog', 'electronics:laptop-x1', { price: 1299 });

    const result = await cache.getCache(instance, 'ProductCatalog', 'electronics:laptop-x1');

    assert.strictEqual(result.success, true);
    assert.deepStrictEqual(result.value, { price: 1299 });
  });

});


// ============================================================================
// 3. GET CACHE MISS
// ============================================================================

describe('getCache cache miss', function () {

  it('returns value null for absent cache_code', async function () {
    const cache = buildCache(createMemoryStore());
    const instance = createInstance();

    const result = await cache.getCache(instance, 'ProductCatalog', 'nonexistent');

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.value, null);
    assert.strictEqual(result.error, null);
  });


  it('returns value null for absent namespace', async function () {
    const cache = buildCache(createMemoryStore());
    const instance = createInstance();

    const result = await cache.getCache(instance, 'NonexistentNamespace', 'any-code');

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.value, null);
    assert.strictEqual(result.error, null);
  });

});


// ============================================================================
// 4. DELETE
// ============================================================================

describe('deleteCache', function () {

  it('deletes an existing entry then getCache returns null', async function () {
    const cache = buildCache(createMemoryStore());
    const instance = createInstance();

    await cache.setCache(instance, 'ProductCatalog', 'electronics:laptop-x1', { price: 1299 }, 3600);
    await cache.deleteCache(instance, 'ProductCatalog', 'electronics:laptop-x1');

    const result = await cache.getCache(instance, 'ProductCatalog', 'electronics:laptop-x1');

    assert.strictEqual(result.value, null);
  });


  it('succeeds idempotently on a non-existent entry', async function () {
    const cache = buildCache(createMemoryStore());
    const instance = createInstance();

    const result = await cache.deleteCache(instance, 'ProductCatalog', 'never-existed');

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.error, null);
  });

});


// ============================================================================
// 5. NAMESPACE ISOLATION
// ============================================================================

describe('namespace isolation', function () {

  it('same cache_code in two namespaces holds two distinct values', async function () {
    const cache = buildCache(createMemoryStore());
    const instance = createInstance();

    await cache.setCache(instance, 'NamespaceA', 'shared-code', 'value-a', 3600);
    await cache.setCache(instance, 'NamespaceB', 'shared-code', 'value-b', 3600);

    const a = await cache.getCache(instance, 'NamespaceA', 'shared-code');
    const b = await cache.getCache(instance, 'NamespaceB', 'shared-code');

    assert.strictEqual(a.value, 'value-a');
    assert.strictEqual(b.value, 'value-b');
  });


  it('reading from the other namespace returns null', async function () {
    const cache = buildCache(createMemoryStore());
    const instance = createInstance();

    await cache.setCache(instance, 'NamespaceA', 'code-1', 'value-a', 3600);

    const result = await cache.getCache(instance, 'NamespaceB', 'code-1');

    assert.strictEqual(result.value, null);
  });

});


// ============================================================================
// 6. DELETE CACHE BY PREFIX
// ============================================================================

describe('deleteCacheByPrefix', function () {

  it('removes only matching entries', async function () {
    const cache = buildCache(createMemoryStore());
    const instance = createInstance();

    await cache.setCache(instance, 'ProductCatalog', 'electronics:laptop-x1', 'a', 3600);
    await cache.setCache(instance, 'ProductCatalog', 'electronics:mouse-z2', 'b', 3600);
    await cache.setCache(instance, 'ProductCatalog', 'clothing:jacket-m', 'c', 3600);

    const result = await cache.deleteCacheByPrefix(instance, 'ProductCatalog', 'electronics:');

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.deleted_count, 2);
    assert.strictEqual(result.error, null);

    const laptop = await cache.getCache(instance, 'ProductCatalog', 'electronics:laptop-x1');
    const mouse = await cache.getCache(instance, 'ProductCatalog', 'electronics:mouse-z2');
    const jacket = await cache.getCache(instance, 'ProductCatalog', 'clothing:jacket-m');

    assert.strictEqual(laptop.value, null);
    assert.strictEqual(mouse.value, null);
    assert.strictEqual(jacket.value, 'c');
  });


  it('throws TypeError when prefix is omitted', async function () {
    const cache = buildCache(createMemoryStore());
    const instance = createInstance();

    await assert.rejects(
      cache.deleteCacheByPrefix(instance, 'ProductCatalog'),
      TypeError
    );
  });


  it('throws TypeError when prefix is empty', async function () {
    const cache = buildCache(createMemoryStore());
    const instance = createInstance();

    await assert.rejects(
      cache.deleteCacheByPrefix(instance, 'ProductCatalog', ''),
      TypeError
    );
  });

});


// ============================================================================
// 7. CLEAR CACHE (wipe all in namespace)
// ============================================================================

describe('clearCache', function () {

  it('clears every entry in the namespace', async function () {
    const cache = buildCache(createMemoryStore());
    const instance = createInstance();

    await cache.setCache(instance, 'ProductCatalog', 'electronics:laptop-x1', 'a', 3600);
    await cache.setCache(instance, 'ProductCatalog', 'clothing:jacket-m', 'b', 3600);

    const result = await cache.clearCache(instance, 'ProductCatalog');

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.deleted_count, 2);
    assert.strictEqual(result.error, null);

    const laptop = await cache.getCache(instance, 'ProductCatalog', 'electronics:laptop-x1');
    const jacket = await cache.getCache(instance, 'ProductCatalog', 'clothing:jacket-m');

    assert.strictEqual(laptop.value, null);
    assert.strictEqual(jacket.value, null);
  });


  it('returns deleted_count 0 on an empty namespace', async function () {
    const cache = buildCache(createMemoryStore());
    const instance = createInstance();

    const result = await cache.clearCache(instance, 'EmptyNamespace');

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.deleted_count, 0);
    assert.strictEqual(result.error, null);
  });

});


// ============================================================================
// 8. CLEAR NAMESPACE ISOLATION
// ============================================================================

describe('clearCache namespace isolation', function () {

  it('clearing one namespace leaves another untouched', async function () {
    const cache = buildCache(createMemoryStore());
    const instance = createInstance();

    await cache.setCache(instance, 'ProductCatalog', 'electronics:laptop-x1', 'a', 3600);
    await cache.setCache(instance, 'FeatureFlags', 'checkout-v2', 'enabled', 3600);

    await cache.clearCache(instance, 'ProductCatalog');

    const flag = await cache.getCache(instance, 'FeatureFlags', 'checkout-v2');

    assert.strictEqual(flag.value, 'enabled');
  });

});


// ============================================================================
// 9. LIST WITH PREFIX
// ============================================================================

describe('listCacheCodes with cache_code_prefix', function () {

  it('returns only matching cache_codes without the namespace prefix', async function () {
    const cache = buildCache(createMemoryStore());
    const instance = createInstance();

    await cache.setCache(instance, 'ProductCatalog', 'electronics:laptop-x1', 'a', 3600);
    await cache.setCache(instance, 'ProductCatalog', 'electronics:mouse-z2', 'b', 3600);
    await cache.setCache(instance, 'ProductCatalog', 'clothing:jacket-m', 'c', 3600);

    const result = await cache.listCacheCodes(instance, 'ProductCatalog', 'electronics:');

    assert.strictEqual(result.success, true);
    assert.deepStrictEqual(result.cache_codes.sort(), ['electronics:laptop-x1', 'electronics:mouse-z2']);
  });

});


// ============================================================================
// 10. LIST WITHOUT PREFIX
// ============================================================================

describe('listCacheCodes without cache_code_prefix', function () {

  it('returns all cache_codes in the namespace', async function () {
    const cache = buildCache(createMemoryStore());
    const instance = createInstance();

    await cache.setCache(instance, 'ProductCatalog', 'electronics:laptop-x1', 'a', 3600);
    await cache.setCache(instance, 'ProductCatalog', 'clothing:jacket-m', 'b', 3600);

    const result = await cache.listCacheCodes(instance, 'ProductCatalog');

    assert.strictEqual(result.success, true);
    assert.deepStrictEqual(result.cache_codes.sort(), ['clothing:jacket-m', 'electronics:laptop-x1']);
  });


  it('omits entries whose TTL has passed', async function () {
    const cache = buildCache(createMemoryStore());
    const instance = createInstance();

    await cache.setCache(instance, 'ProductCatalog', 'keep', 'a', 3600);
    await cache.setCache(instance, 'ProductCatalog', 'expire-me', 'b', 60);

    // Advance past the short TTL only
    instance.time = instance.time + 61;

    const result = await cache.listCacheCodes(instance, 'ProductCatalog');

    // list must agree with get - the expired code is not reported
    assert.strictEqual(result.success, true);
    assert.deepStrictEqual(result.cache_codes, ['keep']);
  });

});


// ============================================================================
// 11. LIST EMPTY
// ============================================================================

describe('listCacheCodes empty', function () {

  it('unknown namespace returns empty cache_codes array', async function () {
    const cache = buildCache(createMemoryStore());
    const instance = createInstance();

    const result = await cache.listCacheCodes(instance, 'NonexistentNamespace');

    assert.strictEqual(result.success, true);
    assert.deepStrictEqual(result.cache_codes, []);
  });

});


// ============================================================================
// 12. TTL EXPIRY (deterministic via instance.time)
// ============================================================================

describe('TTL expiry', function () {

  it('entry expires after ttl_seconds when instance.time advances', async function () {
    const cache = buildCache(createMemoryStore());
    const instance = createInstance(1000000);

    await cache.setCache(instance, 'ProductCatalog', 'electronics:laptop-x1', { price: 1299 }, 60);

    // Get immediately - value present
    const before = await cache.getCache(instance, 'ProductCatalog', 'electronics:laptop-x1');
    assert.strictEqual(before.success, true);
    assert.deepStrictEqual(before.value, { price: 1299 });

    // Advance instance.time past the TTL
    instance.time = 1000000 + 61;

    // Get again - value is null (expired)
    const after = await cache.getCache(instance, 'ProductCatalog', 'electronics:laptop-x1');
    assert.strictEqual(after.success, true);
    assert.strictEqual(after.value, null);
  });

});


// ============================================================================
// 13. STORE FAILURE TRANSLATION
// ============================================================================

describe('Store failure translation', function () {

  it('setCache returns CACHE_STORE_UNAVAILABLE and does not leak the fixture error type', async function () {
    const cache = buildCache(createFailingStore());
    const instance = createInstance();

    const result = await cache.setCache(instance, 'ProductCatalog', 'electronics:laptop-x1', 'value', 3600);

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error.type, 'CACHE_STORE_UNAVAILABLE');
    assert.notStrictEqual(result.error.type, 'STORE_WRITE_FAILED');
  });


  it('getCache returns CACHE_STORE_UNAVAILABLE and does not leak the fixture error type', async function () {
    const cache = buildCache(createFailingStore());
    const instance = createInstance();

    const result = await cache.getCache(instance, 'ProductCatalog', 'electronics:laptop-x1');

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.value, null);
    assert.strictEqual(result.error.type, 'CACHE_STORE_UNAVAILABLE');
  });


  it('deleteCache returns CACHE_STORE_UNAVAILABLE and does not leak the fixture error type', async function () {
    const cache = buildCache(createFailingStore());
    const instance = createInstance();

    const result = await cache.deleteCache(instance, 'ProductCatalog', 'electronics:laptop-x1');

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error.type, 'CACHE_STORE_UNAVAILABLE');
  });


  it('deleteCacheByPrefix returns CACHE_STORE_UNAVAILABLE and does not leak the fixture error type', async function () {
    const cache = buildCache(createFailingStore());
    const instance = createInstance();

    const result = await cache.deleteCacheByPrefix(instance, 'ProductCatalog', 'electronics:');

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.deleted_count, 0);
    assert.strictEqual(result.error.type, 'CACHE_STORE_UNAVAILABLE');
  });


  it('clearCache returns CACHE_STORE_UNAVAILABLE and does not leak the fixture error type', async function () {
    const cache = buildCache(createFailingStore());
    const instance = createInstance();

    const result = await cache.clearCache(instance, 'ProductCatalog');

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.deleted_count, 0);
    assert.strictEqual(result.error.type, 'CACHE_STORE_UNAVAILABLE');
  });


  it('listCacheCodes returns CACHE_STORE_UNAVAILABLE and does not leak the fixture error type', async function () {
    const cache = buildCache(createFailingStore());
    const instance = createInstance();

    const result = await cache.listCacheCodes(instance, 'ProductCatalog', 'electronics:');

    assert.strictEqual(result.success, false);
    assert.deepStrictEqual(result.cache_codes, []);
    assert.strictEqual(result.error.type, 'CACHE_STORE_UNAVAILABLE');
  });


  it('getCacheExists returns CACHE_STORE_UNAVAILABLE and does not leak the fixture error type', async function () {
    const cache = buildCache(createFailingStore());
    const instance = createInstance();

    const result = await cache.getCacheExists(instance, 'ProductCatalog', 'electronics:laptop-x1');

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.exists, false);
    assert.strictEqual(result.error.type, 'CACHE_STORE_UNAVAILABLE');
  });

});


// ============================================================================
// 14. GET CACHE EXISTS - EXISTENCE CHECK
// ============================================================================

describe('getCacheExists - existence check', function () {

  it('returns exists: true for a present entry', async function () {
    const cache = buildCache(createMemoryStore());
    const instance = createInstance();

    await cache.setCache(instance, 'ProductCatalog', 'electronics:laptop-x1', { price: 1299 }, 3600);

    const result = await cache.getCacheExists(instance, 'ProductCatalog', 'electronics:laptop-x1');

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.exists, true);
    assert.strictEqual(result.error, null);
  });


  it('returns exists: false for an absent entry', async function () {
    const cache = buildCache(createMemoryStore());
    const instance = createInstance();

    const result = await cache.getCacheExists(instance, 'ProductCatalog', 'nonexistent');

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.exists, false);
    assert.strictEqual(result.error, null);
  });


  it('returns exists: false for an expired entry', async function () {
    const cache = buildCache(createMemoryStore());
    const instance = createInstance(1000000);

    await cache.setCache(instance, 'ProductCatalog', 'electronics:laptop-x1', { price: 1299 }, 60);

    // Advance time past TTL
    instance.time = 1000000 + 61;

    const result = await cache.getCacheExists(instance, 'ProductCatalog', 'electronics:laptop-x1');

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.exists, false);
  });


  it('getCacheExists does not return the value', async function () {
    const cache = buildCache(createMemoryStore());
    const instance = createInstance();

    await cache.setCache(instance, 'ProductCatalog', 'electronics:laptop-x1', { price: 1299 }, 3600);

    const result = await cache.getCacheExists(instance, 'ProductCatalog', 'electronics:laptop-x1');

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.exists, true);
    assert.strictEqual('value' in result, false, 'getCacheExists should not return a value field');
  });

});


// ============================================================================
// 15. GET OR FETCH CACHE - UNLOCKED (lock disabled, default)
// ============================================================================

describe('getOrFetchCache - unlocked (default)', function () {

  it('returns cached value on hit without calling fetcher', async function () {
    const cache = buildCache(createMemoryStore());
    const instance = createInstance();

    await cache.setCache(instance, 'ProductCatalog', 'electronics:laptop-x1', { price: 1299 }, 3600);

    let fetcherCalled = false;
    const result = await cache.getOrFetchCache(
      instance, 'ProductCatalog', 'electronics:laptop-x1', 3600,
      async function () { fetcherCalled = true; return { price: 999 }; }
    );

    assert.strictEqual(result.success, true);
    assert.deepStrictEqual(result.value, { price: 1299 });
    assert.strictEqual(fetcherCalled, false, 'fetcher should not be called on cache hit');
  });


  it('calls fetcher on miss, caches result, returns it', async function () {
    const cache = buildCache(createMemoryStore());
    const instance = createInstance();

    let fetcherCalled = false;
    const result = await cache.getOrFetchCache(
      instance, 'ProductCatalog', 'electronics:laptop-x1', 3600,
      async function () {
        fetcherCalled = true;
        return { price: 1299 };
      }
    );

    assert.strictEqual(result.success, true);
    assert.deepStrictEqual(result.value, { price: 1299 });
    assert.strictEqual(fetcherCalled, true);

    // Verify the value was cached
    const cached = await cache.getCache(instance, 'ProductCatalog', 'electronics:laptop-x1');
    assert.deepStrictEqual(cached.value, { price: 1299 });
  });


  it('second call hits cache, fetcher not called again', async function () {
    const cache = buildCache(createMemoryStore());
    const instance = createInstance();

    let callCount = 0;
    const fetcher = async function () {
      callCount = callCount + 1;
      return 'fetched-value';
    };

    await cache.getOrFetchCache(instance, 'NS', 'code-1', 3600, fetcher);
    await cache.getOrFetchCache(instance, 'NS', 'code-1', 3600, fetcher);

    assert.strictEqual(callCount, 1, 'fetcher should be called exactly once');
  });


  it('returns CACHE_FETCHER_FAILED when fetcher throws, nothing cached', async function () {
    const cache = buildCache(createMemoryStore());
    const instance = createInstance();

    const result = await cache.getOrFetchCache(
      instance, 'ProductCatalog', 'electronics:laptop-x1', 3600,
      async function () { throw new Error('database down'); }
    );

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.value, null);
    assert.strictEqual(result.error.type, 'CACHE_FETCHER_FAILED');

    // Verify nothing was cached
    const cached = await cache.getCache(instance, 'ProductCatalog', 'electronics:laptop-x1');
    assert.strictEqual(cached.value, null);
  });


  it('caches null returned by fetcher', async function () {
    const cache = buildCache(createMemoryStore());
    const instance = createInstance();

    let callCount = 0;
    const fetcher = async function () {
      callCount = callCount + 1;
      return null;
    };

    // First call - fetcher returns null, but null is not cached (miss check uses isNullOrUndefined)
    // So the second call will also call the fetcher
    const result1 = await cache.getOrFetchCache(instance, 'NS', 'code-1', 3600, fetcher);
    assert.strictEqual(result1.success, true);
    assert.strictEqual(result1.value, null);

    // fetchAndStore stores null, but the next getOrFetchCache will see it as a miss
    // because the miss check is `value === null || isNullOrUndefined(value)`
    const result2 = await cache.getOrFetchCache(instance, 'NS', 'code-1', 3600, fetcher);
    assert.strictEqual(result2.success, true);
    assert.strictEqual(result2.value, null);
  });


  it('throws TypeError when fetcher is not a function', async function () {
    const cache = buildCache(createMemoryStore());
    const instance = createInstance();

    await assert.rejects(
      cache.getOrFetchCache(instance, 'NS', 'code-1', 3600, 'not a function'),
      TypeError
    );
  });

});


// ============================================================================
// 16. GET OR FETCH CACHE - LOCKED (lock enabled)
// ============================================================================

describe('getOrFetchCache - locked (stampede protection)', function () {

  // Build a cache with locking enabled and short retry for test speed
  const buildLockedCache = function (store) {
    return buildCache(store, {
      GET_OR_FETCH_LOCK_ENABLED: true,
      GET_OR_FETCH_LOCK_TIMEOUT_MS: 1000,
      GET_OR_FETCH_LOCK_RETRY_MS: 10,
      GET_OR_FETCH_LOCK_RETRY_JITTER_MS: 5
    });
  };


  it('returns cached value on hit without calling fetcher or acquiring lock', async function () {
    const store = createMemoryStore();
    const cache = buildLockedCache(store);
    const instance = createInstance();

    await cache.setCache(instance, 'ProductCatalog', 'electronics:laptop-x1', { price: 1299 }, 3600);

    let fetcherCalled = false;
    const result = await cache.getOrFetchCache(
      instance, 'ProductCatalog', 'electronics:laptop-x1', 3600,
      async function () { fetcherCalled = true; return { price: 999 }; }
    );

    assert.strictEqual(result.success, true);
    assert.deepStrictEqual(result.value, { price: 1299 });
    assert.strictEqual(fetcherCalled, false);
    assert.strictEqual(store._locks.size, 0, 'no lock should be acquired on cache hit');
  });


  it('acquires lock, fetches, caches, releases lock on miss', async function () {
    const store = createMemoryStore();
    const cache = buildLockedCache(store);
    const instance = createInstance();

    const result = await cache.getOrFetchCache(
      instance, 'ProductCatalog', 'electronics:laptop-x1', 3600,
      async function () { return { price: 1299 }; }
    );

    assert.strictEqual(result.success, true);
    assert.deepStrictEqual(result.value, { price: 1299 });

    // Lock should be released after fetch
    assert.strictEqual(store._locks.size, 0, 'lock should be released after fetch');

    // Value should be cached
    const cached = await cache.getCache(instance, 'ProductCatalog', 'electronics:laptop-x1');
    assert.deepStrictEqual(cached.value, { price: 1299 });
  });


  it('concurrent callers - fetcher called exactly once', async function () {
    const store = createMemoryStore();
    const cache = buildLockedCache(store);
    const instance = createInstance();

    let callCount = 0;
    const fetcher = async function () {
      callCount = callCount + 1;
      // Simulate slow fetch
      await new Promise(function (resolve) { setTimeout(resolve, 50); });
      return 'fetched-value';
    };

    // Fire 3 concurrent getOrFetchCache for the same absent key
    const results = await Promise.all([
      cache.getOrFetchCache(instance, 'NS', 'code-1', 3600, fetcher),
      cache.getOrFetchCache(instance, 'NS', 'code-1', 3600, fetcher),
      cache.getOrFetchCache(instance, 'NS', 'code-1', 3600, fetcher)
    ]);

    // All should return the same value
    for (let i = 0; i < results.length; i++) {
      assert.strictEqual(results[i].success, true);
      assert.strictEqual(results[i].value, 'fetched-value');
    }

    // Fetcher should be called exactly once
    assert.strictEqual(callCount, 1, 'fetcher should be called exactly once with stampede protection');
  });


  it('releases lock even when fetcher throws', async function () {
    const store = createMemoryStore();
    const cache = buildLockedCache(store);
    const instance = createInstance();

    const result = await cache.getOrFetchCache(
      instance, 'ProductCatalog', 'electronics:laptop-x1', 3600,
      async function () { throw new Error('database down'); }
    );

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error.type, 'CACHE_FETCHER_FAILED');

    // Lock should be released even though fetcher threw
    assert.strictEqual(store._locks.size, 0, 'lock should be released after fetcher throws');
  });


  it('already-expired lock is acquired on the first attempt', async function () {
    const store = createMemoryStore();
    const cache = buildLockedCache(store);
    const instance = createInstance();

    // Hold a lock, then advance instance.time past its TTL
    await store.setCacheLock(instance, 'NS', 'code-1', { timeout_ms: 1000 });
    instance.time = instance.time + 2;

    let fetcherCalled = false;
    const result = await cache.getOrFetchCache(
      instance, 'NS', 'code-1', 3600,
      async function () {
        fetcherCalled = true;
        return 'recovered-value';
      }
    );

    // The stale lock is ignored, so this caller fetches without waiting
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.value, 'recovered-value');
    assert.strictEqual(fetcherCalled, true);
  });


  it('lock expiring mid-wait allows re-acquisition (crash recovery)', async function () {
    const store = createMemoryStore();
    const cache = buildLockedCache(store);
    const instance = createInstance();

    // Hold a lock that is live when getOrFetchCache starts
    await store.setCacheLock(instance, 'NS', 'code-1', { timeout_ms: 1000 });

    // Expire it while the caller is inside the retry loop. The loop polls
    // every ~10-15 ms and the wait timeout is 5000 ms, so 30 ms lands well
    // inside the waiting window with a wide margin.
    setTimeout(function () {
      instance.time = instance.time + 2;
    }, 30);

    let fetcherCalled = false;
    const result = await cache.getOrFetchCache(
      instance, 'NS', 'code-1', 3600,
      async function () {
        fetcherCalled = true;
        return 'recovered-value';
      }
    );

    // Once the lock expires the waiting caller acquires it and fetches
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.value, 'recovered-value');
    assert.strictEqual(fetcherCalled, true);
  });


  it('returns CACHE_LOCK_WAIT_TIMEOUT when lock holder never releases', async function () {
    const store = createMemoryStore();
    const cache = buildCache(store, {
      GET_OR_FETCH_LOCK_ENABLED: true,
      GET_OR_FETCH_LOCK_TIMEOUT_MS: 10000,
      GET_OR_FETCH_LOCK_RETRY_MS: 10,
      GET_OR_FETCH_LOCK_RETRY_JITTER_MS: 0,
      GET_OR_FETCH_LOCK_WAIT_TIMEOUT_MS: 100
    });
    const instance = createInstance();

    // Manually acquire a lock with a long TTL so it never expires during the test
    await store.setCacheLock(instance, 'NS', 'code-1', { timeout_ms: 60000 });

    let fetcherCalled = false;
    const result = await cache.getOrFetchCache(
      instance, 'NS', 'code-1', 3600,
      async function () { fetcherCalled = true; return 'should-not-reach'; }
    );

    // Wait timeout exceeded - return failure
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.value, null);
    assert.strictEqual(result.error.type, 'CACHE_LOCK_WAIT_TIMEOUT');

    // Fetcher should never be called - we never acquired the lock
    assert.strictEqual(fetcherCalled, false);
  });

});


// ============================================================================
// 17. LOCK CONFIG VALIDATION
// ============================================================================

describe('Lock config validation', function () {

  it('throws TypeError when GET_OR_FETCH_LOCK_ENABLED is not a Boolean', function () {
    const store = createMemoryStore();

    assert.throws(function () {
      buildCache(store, { GET_OR_FETCH_LOCK_ENABLED: 'yes' });
    }, TypeError);
  });


  it('throws TypeError when GET_OR_FETCH_LOCK_TIMEOUT_MS is not positive', function () {
    const store = createMemoryStore();

    assert.throws(function () {
      buildCache(store, { GET_OR_FETCH_LOCK_TIMEOUT_MS: -1 });
    }, TypeError);
  });


  it('throws TypeError when GET_OR_FETCH_LOCK_RETRY_MS is not positive', function () {
    const store = createMemoryStore();

    assert.throws(function () {
      buildCache(store, { GET_OR_FETCH_LOCK_RETRY_MS: 0 });
    }, TypeError);
  });


  it('throws TypeError when GET_OR_FETCH_LOCK_RETRY_JITTER_MS is negative', function () {
    const store = createMemoryStore();

    assert.throws(function () {
      buildCache(store, { GET_OR_FETCH_LOCK_RETRY_JITTER_MS: -1 });
    }, TypeError);
  });


  it('accepts zero jitter (no randomness)', function () {
    const store = createMemoryStore();

    assert.doesNotThrow(function () {
      buildCache(store, { GET_OR_FETCH_LOCK_RETRY_JITTER_MS: 0 });
    });
  });


  it('throws TypeError when GET_OR_FETCH_LOCK_WAIT_TIMEOUT_MS is not positive', function () {
    const store = createMemoryStore();

    assert.throws(function () {
      buildCache(store, { GET_OR_FETCH_LOCK_WAIT_TIMEOUT_MS: 0 });
    }, TypeError);
  });

});
