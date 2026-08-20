// Tests for helper-cache-store-valkey
// Integration tests against a real Valkey instance via Docker Compose.
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
const StoreFactory = require('helper-cache-store-valkey');

// Parent cache module - proves the store contract lines up with the real
// composition the application will use.
const CacheFactory = require('helper-cache');

// Build a store with a test-specific prefix so we never collide with
// real data if the Valkey instance is shared.
const KEY_PREFIX = 'test-cache:';

const store = StoreFactory(Lib, {
  KEY_PREFIX: KEY_PREFIX,
  KEY_SEPARATOR: ':'
});

const Cache = CacheFactory(Lib, {
  Store: store
});


// Build a fresh instance for each test. instance.time is not used by the
// Valkey adapter (TTL is native), but the parent cache module expects it.
const createInstance = function () {
  return Lib.Instance.initialize();
};


// Helper - flush all test-cache: keys between tests so suites stay independent.
const flushTestKeys = async function (instance) {
  const scan_result = await Lib.KV.scan(instance, KEY_PREFIX + '*');
  if (scan_result.success && scan_result.keys.length > 0) {
    await Lib.KV.deleteMany(instance, scan_result.keys);
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

describe('Store tier: set + get round-trip', function () {

  it('round-trips a string value through the store', async function () {
    const instance = createInstance();

    await store.set(instance, 'ProductCatalog', 'electronics:laptop-x1', '{"price":1299}', 3600);
    const result = await store.get(instance, 'ProductCatalog', 'electronics:laptop-x1');

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.value, '{"price":1299}');
    assert.strictEqual(result.error, null);
  });

});


// ============================================================================
// 2. SET + GET ROUND-TRIP (parent cache tier)
// ============================================================================

describe('Cache tier: set + get round-trip', function () {

  it('round-trips an object value through the full cache composition', async function () {
    const instance = createInstance();

    const value = { id: 'laptop-x1', price: 1299 };
    await Cache.set(instance, 'ProductCatalog', 'electronics:laptop-x1', value, 3600);
    const result = await Cache.get(instance, 'ProductCatalog', 'electronics:laptop-x1');

    assert.strictEqual(result.success, true);
    assert.deepStrictEqual(result.value, value);
  });

});


// ============================================================================
// 3. GET CACHE MISS
// ============================================================================

describe('get cache miss', function () {

  it('returns value null for absent cache_code', async function () {
    const instance = createInstance();

    const result = await store.get(instance, 'ProductCatalog', 'nonexistent');

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.value, null);
  });

});


// ============================================================================
// 4. DELETE
// ============================================================================

describe('delete', function () {

  it('deletes an existing entry then get returns null', async function () {
    const instance = createInstance();

    await store.set(instance, 'ProductCatalog', 'electronics:laptop-x1', 'value', 3600);
    await store.delete(instance, 'ProductCatalog', 'electronics:laptop-x1');

    const result = await store.get(instance, 'ProductCatalog', 'electronics:laptop-x1');

    assert.strictEqual(result.value, null);
  });


  it('succeeds idempotently on a non-existent entry', async function () {
    const instance = createInstance();

    const result = await store.delete(instance, 'ProductCatalog', 'never-existed');

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

    await store.set(instance, 'NamespaceA', 'shared-code', 'value-a', 3600);
    await store.set(instance, 'NamespaceB', 'shared-code', 'value-b', 3600);

    const a = await store.get(instance, 'NamespaceA', 'shared-code');
    const b = await store.get(instance, 'NamespaceB', 'shared-code');

    assert.strictEqual(a.value, 'value-a');
    assert.strictEqual(b.value, 'value-b');
  });

});


// ============================================================================
// 6. CLEAR WITH PREFIX
// ============================================================================

describe('clear with cache_code_prefix', function () {

  it('removes only matching entries', async function () {
    const instance = createInstance();

    await store.set(instance, 'ProductCatalog', 'electronics:laptop-x1', 'a', 3600);
    await store.set(instance, 'ProductCatalog', 'electronics:mouse-z2', 'b', 3600);
    await store.set(instance, 'ProductCatalog', 'clothing:jacket-m', 'c', 3600);

    const result = await store.clear(instance, 'ProductCatalog', 'electronics:');

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.deleted_count, 2);

    const laptop = await store.get(instance, 'ProductCatalog', 'electronics:laptop-x1');
    const mouse = await store.get(instance, 'ProductCatalog', 'electronics:mouse-z2');
    const jacket = await store.get(instance, 'ProductCatalog', 'clothing:jacket-m');

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
    const instance = createInstance();

    await store.set(instance, 'ProductCatalog', 'electronics:laptop-x1', 'a', 3600);
    await store.set(instance, 'ProductCatalog', 'clothing:jacket-m', 'b', 3600);

    const result = await store.clear(instance, 'ProductCatalog');

    assert.strictEqual(result.deleted_count, 2);

    const laptop = await store.get(instance, 'ProductCatalog', 'electronics:laptop-x1');
    const jacket = await store.get(instance, 'ProductCatalog', 'clothing:jacket-m');

    assert.strictEqual(laptop.value, null);
    assert.strictEqual(jacket.value, null);
  });

});


// ============================================================================
// 8. CLEAR ON EMPTY NAMESPACE
// ============================================================================

describe('clear on empty namespace', function () {

  it('returns deleted_count 0 without error', async function () {
    const instance = createInstance();

    const result = await store.clear(instance, 'EmptyNamespace', 'some-prefix:');

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.deleted_count, 0);
    assert.strictEqual(result.error, null);
  });

});


// ============================================================================
// 9. LIST WITH PREFIX
// ============================================================================

describe('list with cache_code_prefix', function () {

  it('returns only matching cache_codes without the namespace prefix', async function () {
    const instance = createInstance();

    await store.set(instance, 'ProductCatalog', 'electronics:laptop-x1', 'a', 3600);
    await store.set(instance, 'ProductCatalog', 'electronics:mouse-z2', 'b', 3600);
    await store.set(instance, 'ProductCatalog', 'clothing:jacket-m', 'c', 3600);

    const result = await store.list(instance, 'ProductCatalog', 'electronics:');

    assert.strictEqual(result.success, true);
    assert.deepStrictEqual(result.cache_codes.sort(), ['electronics:laptop-x1', 'electronics:mouse-z2']);
  });

});


// ============================================================================
// 10. LIST WITHOUT PREFIX
// ============================================================================

describe('list without cache_code_prefix', function () {

  it('returns all cache_codes in the namespace', async function () {
    const instance = createInstance();

    await store.set(instance, 'ProductCatalog', 'electronics:laptop-x1', 'a', 3600);
    await store.set(instance, 'ProductCatalog', 'clothing:jacket-m', 'b', 3600);

    const result = await store.list(instance, 'ProductCatalog');

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

    await store.set(instance, 'ProductCatalog', 'electronics:laptop-x1', 'value', 1);

    // Get immediately - value present
    const before = await store.get(instance, 'ProductCatalog', 'electronics:laptop-x1');
    assert.strictEqual(before.value, 'value');

    // Wait past the TTL
    await new Promise(function (resolve) { setTimeout(resolve, 1500); });

    // Get again - value is null (expired)
    const after = await store.get(instance, 'ProductCatalog', 'electronics:laptop-x1');
    assert.strictEqual(after.success, true);
    assert.strictEqual(after.value, null);
  });

});


// ============================================================================
// 12. KEY_PREFIX ISOLATION
// ============================================================================

describe('KEY_PREFIX isolation', function () {

  it('clear on a namespace does not touch unrelated keys outside the prefix', async function () {
    const instance = createInstance();

    // Write a raw key through Lib.KV that is outside the cache prefix
    await Lib.KV.set(instance, 'unrelated:key', 'should-survive', 3600);

    // Seed and clear a cache namespace
    await store.set(instance, 'ProductCatalog', 'electronics:laptop-x1', 'a', 3600);
    await store.clear(instance, 'ProductCatalog');

    // The unrelated key must survive
    const unrelated = await Lib.KV.get(instance, 'unrelated:key');
    assert.strictEqual(unrelated.value, 'should-survive');

    // Cleanup the unrelated key
    await Lib.KV.delete(instance, 'unrelated:key');
  });

});
