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

    get: async function () {
      return {
        success: false,
        value: null,
        error: { type: 'STORE_READ_FAILED', message: 'read failed (test fixture)' }
      };
    },

    set: async function () {
      return {
        success: false,
        error: { type: 'STORE_WRITE_FAILED', message: 'write failed (test fixture)' }
      };
    },

    delete: async function () {
      return {
        success: false,
        error: { type: 'STORE_DELETE_FAILED', message: 'delete failed (test fixture)' }
      };
    },

    clear: async function () {
      return {
        success: false,
        deleted_count: 0,
        error: { type: 'STORE_CLEAR_FAILED', message: 'clear failed (test fixture)' }
      };
    },

    list: async function () {
      return {
        success: false,
        cache_codes: [],
        error: { type: 'STORE_LIST_FAILED', message: 'list failed (test fixture)' }
      };
    },

    has: async function () {
      return {
        success: false,
        exists: false,
        error: { type: 'STORE_HAS_FAILED', message: 'has failed (test fixture)' }
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

  it('throws when store is missing get', function () {
    const store = createMemoryStore();
    delete store.get;

    assert.throws(function () {
      CacheFactory(Lib, { Store: store });
    }, /missing method `get`/);
  });


  it('throws when store is missing set', function () {
    const store = createMemoryStore();
    delete store.set;

    assert.throws(function () {
      CacheFactory(Lib, { Store: store });
    }, /missing method `set`/);
  });


  it('throws when store is missing delete', function () {
    const store = createMemoryStore();
    delete store.delete;

    assert.throws(function () {
      CacheFactory(Lib, { Store: store });
    }, /missing method `delete`/);
  });


  it('throws when store is missing clear', function () {
    const store = createMemoryStore();
    delete store.clear;

    assert.throws(function () {
      CacheFactory(Lib, { Store: store });
    }, /missing method `clear`/);
  });


  it('throws when store is missing list', function () {
    const store = createMemoryStore();
    delete store.list;

    assert.throws(function () {
      CacheFactory(Lib, { Store: store });
    }, /missing method `list`/);
  });


  it('throws when store is missing has', function () {
    const store = createMemoryStore();
    delete store.has;

    assert.throws(function () {
      CacheFactory(Lib, { Store: store });
    }, /missing method `has`/);
  });


  it('succeeds when all 6 methods are present', function () {
    const store = createMemoryStore();

    assert.doesNotThrow(function () {
      buildCache(store);
    });
  });


  it('throws when lock is enabled but store is missing setLock', function () {
    const store = createMemoryStore();
    delete store.setLock;

    assert.throws(function () {
      buildCache(store, { GET_OR_FETCH_LOCK_ENABLED: true });
    }, /does not implement `setLock`/);
  });


  it('throws when lock is enabled but store is missing releaseLock', function () {
    const store = createMemoryStore();
    delete store.releaseLock;

    assert.throws(function () {
      buildCache(store, { GET_OR_FETCH_LOCK_ENABLED: true });
    }, /does not implement `releaseLock`/);
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

describe('set + get round-trip', function () {

  it('round-trips an object value', async function () {
    const cache = buildCache(createMemoryStore());
    const instance = createInstance();

    const value = { id: 'laptop-x1', price: 1299 };
    await cache.set(instance, 'ProductCatalog', 'electronics:laptop-x1', value, 3600);

    const result = await cache.get(instance, 'ProductCatalog', 'electronics:laptop-x1');

    assert.strictEqual(result.success, true);
    assert.deepStrictEqual(result.value, value);
    assert.strictEqual(result.error, null);
  });


  it('round-trips a string value', async function () {
    const cache = buildCache(createMemoryStore());
    const instance = createInstance();

    await cache.set(instance, 'FeatureFlags', 'checkout-v2', 'enabled', 3600);

    const result = await cache.get(instance, 'FeatureFlags', 'checkout-v2');

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.value, 'enabled');
  });


  it('persists without TTL when ttl_seconds is omitted', async function () {
    const cache = buildCache(createMemoryStore());
    const instance = createInstance();

    await cache.set(instance, 'ProductCatalog', 'electronics:laptop-x1', { price: 1299 });

    const result = await cache.get(instance, 'ProductCatalog', 'electronics:laptop-x1');

    assert.strictEqual(result.success, true);
    assert.deepStrictEqual(result.value, { price: 1299 });
  });

});


// ============================================================================
// 3. GET CACHE MISS
// ============================================================================

describe('get cache miss', function () {

  it('returns value null for absent cache_code', async function () {
    const cache = buildCache(createMemoryStore());
    const instance = createInstance();

    const result = await cache.get(instance, 'ProductCatalog', 'nonexistent');

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.value, null);
    assert.strictEqual(result.error, null);
  });


  it('returns value null for absent namespace', async function () {
    const cache = buildCache(createMemoryStore());
    const instance = createInstance();

    const result = await cache.get(instance, 'NonexistentNamespace', 'any-code');

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.value, null);
    assert.strictEqual(result.error, null);
  });

});


// ============================================================================
// 4. DELETE
// ============================================================================

describe('delete', function () {

  it('deletes an existing entry then get returns null', async function () {
    const cache = buildCache(createMemoryStore());
    const instance = createInstance();

    await cache.set(instance, 'ProductCatalog', 'electronics:laptop-x1', { price: 1299 }, 3600);
    await cache.delete(instance, 'ProductCatalog', 'electronics:laptop-x1');

    const result = await cache.get(instance, 'ProductCatalog', 'electronics:laptop-x1');

    assert.strictEqual(result.value, null);
  });


  it('succeeds idempotently on a non-existent entry', async function () {
    const cache = buildCache(createMemoryStore());
    const instance = createInstance();

    const result = await cache.delete(instance, 'ProductCatalog', 'never-existed');

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

    await cache.set(instance, 'NamespaceA', 'shared-code', 'value-a', 3600);
    await cache.set(instance, 'NamespaceB', 'shared-code', 'value-b', 3600);

    const a = await cache.get(instance, 'NamespaceA', 'shared-code');
    const b = await cache.get(instance, 'NamespaceB', 'shared-code');

    assert.strictEqual(a.value, 'value-a');
    assert.strictEqual(b.value, 'value-b');
  });


  it('reading from the other namespace returns null', async function () {
    const cache = buildCache(createMemoryStore());
    const instance = createInstance();

    await cache.set(instance, 'NamespaceA', 'code-1', 'value-a', 3600);

    const result = await cache.get(instance, 'NamespaceB', 'code-1');

    assert.strictEqual(result.value, null);
  });

});


// ============================================================================
// 6. CLEAR WITH PREFIX
// ============================================================================

describe('clear with cache_code_prefix', function () {

  it('removes only matching entries', async function () {
    const cache = buildCache(createMemoryStore());
    const instance = createInstance();

    await cache.set(instance, 'ProductCatalog', 'electronics:laptop-x1', 'a', 3600);
    await cache.set(instance, 'ProductCatalog', 'electronics:mouse-z2', 'b', 3600);
    await cache.set(instance, 'ProductCatalog', 'clothing:jacket-m', 'c', 3600);

    const result = await cache.clear(instance, 'ProductCatalog', 'electronics:');

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.deleted_count, 2);
    assert.strictEqual(result.error, null);

    const laptop = await cache.get(instance, 'ProductCatalog', 'electronics:laptop-x1');
    const mouse = await cache.get(instance, 'ProductCatalog', 'electronics:mouse-z2');
    const jacket = await cache.get(instance, 'ProductCatalog', 'clothing:jacket-m');

    assert.strictEqual(laptop.value, null);
    assert.strictEqual(mouse.value, null);
    assert.strictEqual(jacket.value, 'c');
  });

});


// ============================================================================
// 7. CLEAR WITHOUT PREFIX
// ============================================================================

describe('clear without cache_code_prefix', function () {

  it('clears every entry in the namespace', async function () {
    const cache = buildCache(createMemoryStore());
    const instance = createInstance();

    await cache.set(instance, 'ProductCatalog', 'electronics:laptop-x1', 'a', 3600);
    await cache.set(instance, 'ProductCatalog', 'clothing:jacket-m', 'b', 3600);

    const result = await cache.clear(instance, 'ProductCatalog');

    assert.strictEqual(result.deleted_count, 2);

    const laptop = await cache.get(instance, 'ProductCatalog', 'electronics:laptop-x1');
    const jacket = await cache.get(instance, 'ProductCatalog', 'clothing:jacket-m');

    assert.strictEqual(laptop.value, null);
    assert.strictEqual(jacket.value, null);
  });

});


// ============================================================================
// 8. CLEAR NAMESPACE ISOLATION
// ============================================================================

describe('clear namespace isolation', function () {

  it('clearing one namespace leaves another untouched', async function () {
    const cache = buildCache(createMemoryStore());
    const instance = createInstance();

    await cache.set(instance, 'ProductCatalog', 'electronics:laptop-x1', 'a', 3600);
    await cache.set(instance, 'FeatureFlags', 'checkout-v2', 'enabled', 3600);

    await cache.clear(instance, 'ProductCatalog');

    const flag = await cache.get(instance, 'FeatureFlags', 'checkout-v2');

    assert.strictEqual(flag.value, 'enabled');
  });

});


// ============================================================================
// 9. LIST WITH PREFIX
// ============================================================================

describe('list with cache_code_prefix', function () {

  it('returns only matching cache_codes without the namespace prefix', async function () {
    const cache = buildCache(createMemoryStore());
    const instance = createInstance();

    await cache.set(instance, 'ProductCatalog', 'electronics:laptop-x1', 'a', 3600);
    await cache.set(instance, 'ProductCatalog', 'electronics:mouse-z2', 'b', 3600);
    await cache.set(instance, 'ProductCatalog', 'clothing:jacket-m', 'c', 3600);

    const result = await cache.list(instance, 'ProductCatalog', 'electronics:');

    assert.strictEqual(result.success, true);
    assert.deepStrictEqual(result.cache_codes.sort(), ['electronics:laptop-x1', 'electronics:mouse-z2']);
  });

});


// ============================================================================
// 10. LIST WITHOUT PREFIX
// ============================================================================

describe('list without cache_code_prefix', function () {

  it('returns all cache_codes in the namespace', async function () {
    const cache = buildCache(createMemoryStore());
    const instance = createInstance();

    await cache.set(instance, 'ProductCatalog', 'electronics:laptop-x1', 'a', 3600);
    await cache.set(instance, 'ProductCatalog', 'clothing:jacket-m', 'b', 3600);

    const result = await cache.list(instance, 'ProductCatalog');

    assert.strictEqual(result.success, true);
    assert.deepStrictEqual(result.cache_codes.sort(), ['clothing:jacket-m', 'electronics:laptop-x1']);
  });

});


// ============================================================================
// 11. LIST EMPTY
// ============================================================================

describe('list empty', function () {

  it('unknown namespace returns empty cache_codes array', async function () {
    const cache = buildCache(createMemoryStore());
    const instance = createInstance();

    const result = await cache.list(instance, 'NonexistentNamespace');

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

    await cache.set(instance, 'ProductCatalog', 'electronics:laptop-x1', { price: 1299 }, 60);

    // Get immediately - value present
    const before = await cache.get(instance, 'ProductCatalog', 'electronics:laptop-x1');
    assert.strictEqual(before.success, true);
    assert.deepStrictEqual(before.value, { price: 1299 });

    // Advance instance.time past the TTL
    instance.time = 1000000 + 61;

    // Get again - value is null (expired)
    const after = await cache.get(instance, 'ProductCatalog', 'electronics:laptop-x1');
    assert.strictEqual(after.success, true);
    assert.strictEqual(after.value, null);
  });

});


// ============================================================================
// 13. STORE FAILURE TRANSLATION
// ============================================================================

describe('Store failure translation', function () {

  it('set returns CACHE_STORE_UNAVAILABLE and does not leak the fixture error type', async function () {
    const cache = buildCache(createFailingStore());
    const instance = createInstance();

    const result = await cache.set(instance, 'ProductCatalog', 'electronics:laptop-x1', 'value', 3600);

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error.type, 'CACHE_STORE_UNAVAILABLE');
    assert.notStrictEqual(result.error.type, 'STORE_WRITE_FAILED');
  });


  it('get returns CACHE_STORE_UNAVAILABLE and does not leak the fixture error type', async function () {
    const cache = buildCache(createFailingStore());
    const instance = createInstance();

    const result = await cache.get(instance, 'ProductCatalog', 'electronics:laptop-x1');

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.value, null);
    assert.strictEqual(result.error.type, 'CACHE_STORE_UNAVAILABLE');
  });


  it('delete returns CACHE_STORE_UNAVAILABLE and does not leak the fixture error type', async function () {
    const cache = buildCache(createFailingStore());
    const instance = createInstance();

    const result = await cache.delete(instance, 'ProductCatalog', 'electronics:laptop-x1');

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error.type, 'CACHE_STORE_UNAVAILABLE');
  });


  it('clear returns CACHE_STORE_UNAVAILABLE and does not leak the fixture error type', async function () {
    const cache = buildCache(createFailingStore());
    const instance = createInstance();

    const result = await cache.clear(instance, 'ProductCatalog', 'electronics:');

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.deleted_count, 0);
    assert.strictEqual(result.error.type, 'CACHE_STORE_UNAVAILABLE');
  });


  it('list returns CACHE_STORE_UNAVAILABLE and does not leak the fixture error type', async function () {
    const cache = buildCache(createFailingStore());
    const instance = createInstance();

    const result = await cache.list(instance, 'ProductCatalog', 'electronics:');

    assert.strictEqual(result.success, false);
    assert.deepStrictEqual(result.cache_codes, []);
    assert.strictEqual(result.error.type, 'CACHE_STORE_UNAVAILABLE');
  });


  it('has returns CACHE_STORE_UNAVAILABLE and does not leak the fixture error type', async function () {
    const cache = buildCache(createFailingStore());
    const instance = createInstance();

    const result = await cache.has(instance, 'ProductCatalog', 'electronics:laptop-x1');

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.exists, false);
    assert.strictEqual(result.error.type, 'CACHE_STORE_UNAVAILABLE');
  });

});


// ============================================================================
// 14. HAS - EXISTENCE CHECK
// ============================================================================

describe('has - existence check', function () {

  it('returns exists: true for a present entry', async function () {
    const cache = buildCache(createMemoryStore());
    const instance = createInstance();

    await cache.set(instance, 'ProductCatalog', 'electronics:laptop-x1', { price: 1299 }, 3600);

    const result = await cache.has(instance, 'ProductCatalog', 'electronics:laptop-x1');

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.exists, true);
    assert.strictEqual(result.error, null);
  });


  it('returns exists: false for an absent entry', async function () {
    const cache = buildCache(createMemoryStore());
    const instance = createInstance();

    const result = await cache.has(instance, 'ProductCatalog', 'nonexistent');

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.exists, false);
    assert.strictEqual(result.error, null);
  });


  it('returns exists: false for an expired entry', async function () {
    const cache = buildCache(createMemoryStore());
    const instance = createInstance(1000000);

    await cache.set(instance, 'ProductCatalog', 'electronics:laptop-x1', { price: 1299 }, 60);

    // Advance time past TTL
    instance.time = 1000000 + 61;

    const result = await cache.has(instance, 'ProductCatalog', 'electronics:laptop-x1');

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.exists, false);
  });


  it('has does not return the value', async function () {
    const cache = buildCache(createMemoryStore());
    const instance = createInstance();

    await cache.set(instance, 'ProductCatalog', 'electronics:laptop-x1', { price: 1299 }, 3600);

    const result = await cache.has(instance, 'ProductCatalog', 'electronics:laptop-x1');

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.exists, true);
    assert.strictEqual('value' in result, false, 'has should not return a value field');
  });

});


// ============================================================================
// 15. GET OR FETCH - UNLOCKED (lock disabled, default)
// ============================================================================

describe('getOrFetch - unlocked (default)', function () {

  it('returns cached value on hit without calling fetcher', async function () {
    const cache = buildCache(createMemoryStore());
    const instance = createInstance();

    await cache.set(instance, 'ProductCatalog', 'electronics:laptop-x1', { price: 1299 }, 3600);

    let fetcherCalled = false;
    const result = await cache.getOrFetch(
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
    const result = await cache.getOrFetch(
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
    const cached = await cache.get(instance, 'ProductCatalog', 'electronics:laptop-x1');
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

    await cache.getOrFetch(instance, 'NS', 'code-1', 3600, fetcher);
    await cache.getOrFetch(instance, 'NS', 'code-1', 3600, fetcher);

    assert.strictEqual(callCount, 1, 'fetcher should be called exactly once');
  });


  it('returns CACHE_FETCHER_FAILED when fetcher throws, nothing cached', async function () {
    const cache = buildCache(createMemoryStore());
    const instance = createInstance();

    const result = await cache.getOrFetch(
      instance, 'ProductCatalog', 'electronics:laptop-x1', 3600,
      async function () { throw new Error('database down'); }
    );

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.value, null);
    assert.strictEqual(result.error.type, 'CACHE_FETCHER_FAILED');

    // Verify nothing was cached
    const cached = await cache.get(instance, 'ProductCatalog', 'electronics:laptop-x1');
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
    const result1 = await cache.getOrFetch(instance, 'NS', 'code-1', 3600, fetcher);
    assert.strictEqual(result1.success, true);
    assert.strictEqual(result1.value, null);

    // fetchAndStore stores null, but the next getOrFetch will see it as a miss
    // because the miss check is `value === null || isNullOrUndefined(value)`
    const result2 = await cache.getOrFetch(instance, 'NS', 'code-1', 3600, fetcher);
    assert.strictEqual(result2.success, true);
    assert.strictEqual(result2.value, null);
  });


  it('throws TypeError when fetcher is not a function', async function () {
    const cache = buildCache(createMemoryStore());
    const instance = createInstance();

    await assert.rejects(
      cache.getOrFetch(instance, 'NS', 'code-1', 3600, 'not a function'),
      TypeError
    );
  });

});


// ============================================================================
// 16. GET OR FETCH - LOCKED (lock enabled)
// ============================================================================

describe('getOrFetch - locked (stampede protection)', function () {

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

    await cache.set(instance, 'ProductCatalog', 'electronics:laptop-x1', { price: 1299 }, 3600);

    let fetcherCalled = false;
    const result = await cache.getOrFetch(
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

    const result = await cache.getOrFetch(
      instance, 'ProductCatalog', 'electronics:laptop-x1', 3600,
      async function () { return { price: 1299 }; }
    );

    assert.strictEqual(result.success, true);
    assert.deepStrictEqual(result.value, { price: 1299 });

    // Lock should be released after fetch
    assert.strictEqual(store._locks.size, 0, 'lock should be released after fetch');

    // Value should be cached
    const cached = await cache.get(instance, 'ProductCatalog', 'electronics:laptop-x1');
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

    // Fire 3 concurrent getOrFetch for the same absent key
    const results = await Promise.all([
      cache.getOrFetch(instance, 'NS', 'code-1', 3600, fetcher),
      cache.getOrFetch(instance, 'NS', 'code-1', 3600, fetcher),
      cache.getOrFetch(instance, 'NS', 'code-1', 3600, fetcher)
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

    const result = await cache.getOrFetch(
      instance, 'ProductCatalog', 'electronics:laptop-x1', 3600,
      async function () { throw new Error('database down'); }
    );

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error.type, 'CACHE_FETCHER_FAILED');

    // Lock should be released even though fetcher threw
    assert.strictEqual(store._locks.size, 0, 'lock should be released after fetcher throws');
  });


  it('expired lock allows re-acquisition (crash recovery)', async function () {
    const store = createMemoryStore();
    const cache = buildLockedCache(store);
    const instance = createInstance();

    // Manually acquire a lock that will expire quickly
    await store.setLock(instance, 'NS', 'code-1', { timeout_ms: 50 });

    let fetcherCalled = false;
    const result = await cache.getOrFetch(
      instance, 'NS', 'code-1', 3600,
      async function () {
        fetcherCalled = true;
        return 'recovered-value';
      }
    );

    // After the lock expires, the waiting caller should acquire it and fetch
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.value, 'recovered-value');
    assert.strictEqual(fetcherCalled, true);
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

});
