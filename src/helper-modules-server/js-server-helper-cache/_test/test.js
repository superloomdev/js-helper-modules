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
const buildCache = function (store) {
  return CacheFactory(Lib, {
    Store: store
  });
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


  it('succeeds when all 5 methods are present', function () {
    const store = createMemoryStore();

    assert.doesNotThrow(function () {
      buildCache(store);
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

});
