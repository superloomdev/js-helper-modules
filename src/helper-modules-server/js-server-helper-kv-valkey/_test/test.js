// Tests for js-server-helper-kv-valkey
// Works with both emulated (local Valkey) and integration (real server) testing
// Config comes from environment variables via loader.js
'use strict';

const assert = require('node:assert/strict');
const { describe, it, before, after } = require('node:test');
const Redis = require('ioredis');
const ERRORS = require('../kv-valkey.errors');

// Load all dependencies and config via test loader (mirrors main project loader pattern)
// process.env is NEVER accessed in test files - only in loader.js
const { Lib, Config, instance, buildLib } = require('./loader')();
const KV = Lib.KV;
const Instance = Lib.Instance;

// Native client for admin operations (flush database between tests)
let adminClient = null;


describe('KV', { concurrency: false }, function () {


// ============================================================================
// 0. DATABASE SETUP / TEARDOWN
// ============================================================================

before(async function () {

  // Connect native client for admin operations
  adminClient = new Redis({
    host: Config.valkey_host,
    port: Config.valkey_port,
    lazyConnect: false
  });

  // Start with a clean database
  await adminClient.flushdb();

});

after(async function () {

  // Clean up
  await adminClient.flushdb();
  await adminClient.quit();
  await KV.close(instance);

});



// ============================================================================
// 1. FACTORY PATTERN
// ============================================================================

describe('Factory Pattern', function () {

  it('should create independent instances', function () {

    const { Lib: Lib2 } = require('./loader')();
    const KV2 = Lib2.KV;

    assert.notStrictEqual(KV, KV2, 'Instances should be independent');
    assert.strictEqual(typeof KV.set, 'function');
    assert.strictEqual(typeof KV2.set, 'function');
  });

  it('should expose all 18 public functions', function () {

    const expected = [
      'close', 'ping',
      'set', 'setIfNotExists', 'get', 'delete', 'getKeyExists',
      'setMany', 'getMany', 'deleteMany',
      'scan',
      'setHashField', 'getHashField', 'getHashFields', 'deleteHashField',
      'setExpire', 'getTtl',
      'increment'
    ];

    for (const name of expected) {
      assert.strictEqual(typeof KV[name], 'function', name + ' should be a function');
    }
  });

});



// ============================================================================
// 2. CONFIG VALIDATION (A3)
// ============================================================================

describe('Config Validation', function () {

  it('should throw TypeError on unknown config key', function () {

    assert.throws(function () {
      require('../kv-valkey')(Lib, { KEYPREFIX: 'test' });
    }, TypeError);
  });

  it('should throw TypeError on wrong PORT type', function () {

    assert.throws(function () {
      require('../kv-valkey')(Lib, { PORT: 'not a number' });
    }, TypeError);
  });

  it('should throw TypeError on PORT out of range', function () {

    assert.throws(function () {
      require('../kv-valkey')(Lib, { PORT: 99999 });
    }, TypeError);
  });

  it('should throw TypeError on wrong DB type', function () {

    assert.throws(function () {
      require('../kv-valkey')(Lib, { DB: 'not a number' });
    }, TypeError);
  });

  it('should throw TypeError on DB out of range', function () {

    assert.throws(function () {
      require('../kv-valkey')(Lib, { DB: 20 });
    }, TypeError);
  });

  it('should throw TypeError on wrong TLS type', function () {

    assert.throws(function () {
      require('../kv-valkey')(Lib, { TLS: 'not a boolean' });
    }, TypeError);
  });

  it('should throw TypeError on wrong SERIALIZE_JSON type', function () {

    assert.throws(function () {
      require('../kv-valkey')(Lib, { SERIALIZE_JSON: 'not a boolean' });
    }, TypeError);
  });

  it('should throw TypeError on negative CONNECT_TIMEOUT_MS', function () {

    assert.throws(function () {
      require('../kv-valkey')(Lib, { CONNECT_TIMEOUT_MS: -1 });
    }, TypeError);
  });

  it('should throw TypeError on wrong KEY_PREFIX type', function () {

    assert.throws(function () {
      require('../kv-valkey')(Lib, { KEY_PREFIX: 123 });
    }, TypeError);
  });

});



// ============================================================================
// 3. LIFECYCLE: close, ping
// ============================================================================

describe('Lifecycle', function () {

  it('should ping successfully', async function () {

    const result = await KV.ping(instance);

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.error, null);
  });

  it('should close idempotently - close twice', async function () {

    const { Lib: Lib2, Config: Config2 } = require('./loader')();
    const KV2 = Lib2.KV;
    const inst2 = Lib2.Instance.initialize();

    // Trigger a connection
    await KV2.ping(inst2);

    // First close
    const result1 = await KV2.close(inst2);
    assert.strictEqual(result1.success, true);
    assert.strictEqual(result1.error, null);

    // Second close (idempotent)
    const result2 = await KV2.close(inst2);
    assert.strictEqual(result2.success, true);
    assert.strictEqual(result2.error, null);
  });

  it('should close without ever connecting (idempotent)', async function () {

    const { Lib: Lib3 } = require('./loader')();
    const KV3 = Lib3.KV;
    const inst3 = Lib3.Instance.initialize();

    // Close without any prior operation
    const result = await KV3.close(inst3);
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.error, null);
  });

});



// ============================================================================
// 4. SINGLE KEY: set, get, delete, getKeyExists
// ============================================================================

describe('Single Key', function () {

  it('should set and get a value', async function () {

    await KV.set(instance, 'test_key', { name: 'alice' });

    const result = await KV.get(instance, 'test_key');

    assert.strictEqual(result.success, true);
    assert.deepStrictEqual(result.value, { name: 'alice' });
    assert.strictEqual(result.error, null);
  });

  it('should return null for absent key', async function () {

    const result = await KV.get(instance, 'nonexistent_key');

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.value, null);
    assert.strictEqual(result.error, null);
  });

  it('should delete a key and return deleted_count 1', async function () {

    await KV.set(instance, 'del_key', 'value');

    const result = await KV.delete(instance, 'del_key');

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.deleted_count, 1);
  });

  it('should return deleted_count 0 for absent key', async function () {

    const result = await KV.delete(instance, 'nonexistent_del');

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.deleted_count, 0);
  });

  it('should return exists: true for present key', async function () {

    await KV.set(instance, 'exists_key', 'value');

    const result = await KV.getKeyExists(instance, 'exists_key');

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.exists, true);
  });

  it('should return exists: false for absent key', async function () {

    const result = await KV.getKeyExists(instance, 'nonexistent_exists');

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.exists, false);
  });

  it('should set with TTL and the key should expire', async function () {

    await KV.set(instance, 'ttl_key', 'temp', 1);

    // Key should exist immediately
    const before = await KV.getKeyExists(instance, 'ttl_key');
    assert.strictEqual(before.exists, true);

    // Wait for expiry
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Key should be gone
    const after = await KV.get(instance, 'ttl_key');
    assert.strictEqual(after.value, null);
  });

  it('should store a string value without JSON wrapping when SERIALIZE_JSON is false', async function () {

    const { Lib: LibRaw } = require('./loader')();
    // Override config for raw mode
    const KVRaw = require('../kv-valkey')(LibRaw, {
      HOST: Config.valkey_host,
      PORT: Config.valkey_port,
      SERIALIZE_JSON: false
    });
    const rawInstance = LibRaw.Instance.initialize();

    await KVRaw.set(rawInstance, 'raw_key', 'raw_string_value');

    const result = await KVRaw.get(rawInstance, 'raw_key');

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.value, 'raw_string_value');

    await KVRaw.close(rawInstance);
  });

  it('should return KV_SERIALIZATION_FAILED for corrupt stored value', async function () {

    // Write a non-JSON value directly via admin client
    await adminClient.set('corrupt_key', 'not valid json {{{');

    const result = await KV.get(instance, 'corrupt_key');

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.value, null);
    assert.strictEqual(result.error.type, ERRORS.KV_SERIALIZATION_FAILED.type);
  });

  it('should return KV_SERIALIZATION_FAILED for non-serializable value', async function () {

    const circular = {};
    circular.self = circular;

    const result = await KV.set(instance, 'circular_key', circular);

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error.type, ERRORS.KV_SERIALIZATION_FAILED.type);
  });

});



// ============================================================================
// 4b. SET IF NOT EXISTS (atomic SET NX)
// ============================================================================

describe('setIfNotExists', function () {

  it('first call on absent key applies and stores the value', async function () {

    await adminClient.flushdb();

    const result = await KV.setIfNotExists(instance, 'sine:1', { name: 'alice' });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.applied, true);
    assert.strictEqual(result.error, null);

    const got = await KV.get(instance, 'sine:1');
    assert.deepStrictEqual(got.value, { name: 'alice' });
  });

  it('second call on same key does not apply and does not overwrite', async function () {

    const result = await KV.setIfNotExists(instance, 'sine:1', { name: 'bob' });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.applied, false);
    assert.strictEqual(result.error, null);

    // Original value survives
    const got = await KV.get(instance, 'sine:1');
    assert.deepStrictEqual(got.value, { name: 'alice' });
  });

  it('TTL is honored on the set key', async function () {

    await adminClient.flushdb();

    const result = await KV.setIfNotExists(instance, 'sine:ttl', 'temp', 1);

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.applied, true);

    const ttl = await KV.getTtl(instance, 'sine:ttl');
    assert.strictEqual(ttl.success, true);
    assert.ok(ttl.ttl_seconds > 0, 'TTL should be positive');

    // Wait for expiry
    await new Promise(function (resolve) { setTimeout(resolve, 1500); });

    const exists = await KV.getKeyExists(instance, 'sine:ttl');
    assert.strictEqual(exists.success, true);
    assert.strictEqual(exists.exists, false);
  });

  it('no TTL means no expiry', async function () {

    await adminClient.flushdb();

    const result = await KV.setIfNotExists(instance, 'sine:nottl', 'persist');

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.applied, true);

    const ttl = await KV.getTtl(instance, 'sine:nottl');
    assert.strictEqual(ttl.success, true);
    assert.strictEqual(ttl.ttl_seconds, null);
  });

  it('applies again after the key expires', async function () {

    await adminClient.flushdb();

    // Set with 1 second TTL
    await KV.setIfNotExists(instance, 'sine:reapply', 'first', 1);

    // Wait for expiry
    await new Promise(function (resolve) { setTimeout(resolve, 1500); });

    // Should apply again - this is the crash-recovery path the lock depends on
    const result = await KV.setIfNotExists(instance, 'sine:reapply', 'second');

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.applied, true);

    const got = await KV.get(instance, 'sine:reapply');
    assert.strictEqual(got.value, 'second');
  });

  it('concurrent callers - exactly one applies', async function () {

    await adminClient.flushdb();

    // Fire 5 concurrent setIfNotExists for the same absent key
    const results = await Promise.all([
      KV.setIfNotExists(instance, 'sine:concurrent', 'winner', 10),
      KV.setIfNotExists(instance, 'sine:concurrent', 'winner', 10),
      KV.setIfNotExists(instance, 'sine:concurrent', 'winner', 10),
      KV.setIfNotExists(instance, 'sine:concurrent', 'winner', 10),
      KV.setIfNotExists(instance, 'sine:concurrent', 'winner', 10)
    ]);

    const appliedCount = results.filter(function (r) { return r.applied === true; }).length;
    const notAppliedCount = results.filter(function (r) { return r.applied === false; }).length;

    assert.strictEqual(appliedCount, 1, 'exactly one caller should apply');
    assert.strictEqual(notAppliedCount, 4, 'four callers should not apply');
  });

});



// ============================================================================
// 5. MULTIPLE KEYS: setMany, getMany, deleteMany
// ============================================================================

describe('Multiple Keys', function () {

  it('should set and get many keys', async function () {

    await KV.setMany(instance, {
      'multi:1': { name: 'alice' },
      'multi:2': { name: 'bob' },
      'multi:3': { name: 'carol' }
    });

    const result = await KV.getMany(instance, ['multi:1', 'multi:2', 'multi:3']);

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.values.length, 3);
    assert.deepStrictEqual(result.values[0], { name: 'alice' });
    assert.deepStrictEqual(result.values[1], { name: 'bob' });
    assert.deepStrictEqual(result.values[2], { name: 'carol' });
  });

  it('should return null in position of absent keys with values.length === keys.length', async function () {

    await KV.setMany(instance, { 'present:1': 'val1' });

    const result = await KV.getMany(instance, ['present:1', 'absent:1', 'absent:2']);

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.values.length, 3);
    assert.strictEqual(result.values[0], 'val1');
    assert.strictEqual(result.values[1], null);
    assert.strictEqual(result.values[2], null);
  });

  it('should return values in caller key order for shuffled keys', async function () {

    await KV.setMany(instance, {
      'order:a': 'A',
      'order:b': 'B',
      'order:c': 'C'
    });

    // Deliberately shuffle the key order
    const result = await KV.getMany(instance, ['order:c', 'order:a', 'order:b']);

    // MGET returns values in the order of keys passed
    assert.strictEqual(result.values[0], 'C');
    assert.strictEqual(result.values[1], 'A');
    assert.strictEqual(result.values[2], 'B');
  });

  it('should be a no-op success for empty getMany', async function () {

    const result = await KV.getMany(instance, []);

    assert.strictEqual(result.success, true);
    assert.deepStrictEqual(result.values, []);
    assert.strictEqual(result.error, null);
  });

  it('should be a no-op success for empty setMany', async function () {

    const result = await KV.setMany(instance, {});

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.error, null);
  });

  it('should be a no-op success for empty deleteMany', async function () {

    const result = await KV.deleteMany(instance, []);

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.deleted_count, 0);
    assert.strictEqual(result.error, null);
  });

  it('should delete many keys and return exact deleted_count', async function () {

    await KV.setMany(instance, {
      'delmany:1': 'v1',
      'delmany:2': 'v2',
      'delmany:3': 'v3'
    });

    // Delete 3 present + 2 absent = deleted_count should be 3
    const result = await KV.deleteMany(instance, ['delmany:1', 'delmany:2', 'delmany:3', 'absent:a', 'absent:b']);

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.deleted_count, 3);
  });

  it('setMany atomicity: a non-serializable entry writes nothing', async function () {

    const circular = {};
    circular.self = circular;

    const result = await KV.setMany(instance, {
      'atomic:1': 'v1',
      'atomic:2': circular,
      'atomic:3': 'v3'
    });

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error.type, ERRORS.KV_SERIALIZATION_FAILED.type);

    // Verify nothing was written
    const check = await KV.getMany(instance, ['atomic:1', 'atomic:2', 'atomic:3']);
    assert.strictEqual(check.values[0], null);
    assert.strictEqual(check.values[1], null);
    assert.strictEqual(check.values[2], null);
  });

  it('getMany whole-call failure when one element is corrupt', async function () {

    // Set two valid keys via the module
    await KV.setMany(instance, { 'corruptmany:1': 'v1', 'corruptmany:2': 'v2' });

    // Corrupt one of them directly
    await adminClient.set('corruptmany:2', 'not json {{{');

    const result = await KV.getMany(instance, ['corruptmany:1', 'corruptmany:2']);

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.values, null);
    assert.strictEqual(result.error.type, ERRORS.KV_SERIALIZATION_FAILED.type);
  });

  it('setMany with TTL applies to all keys', async function () {

    await KV.setMany(instance, {
      'manytll:1': 'v1',
      'manytll:2': 'v2'
    }, 2);

    // Both should exist
    const before = await KV.getMany(instance, ['manytll:1', 'manytll:2']);
    assert.strictEqual(before.values[0], 'v1');
    assert.strictEqual(before.values[1], 'v2');

    // Wait for expiry
    await new Promise(resolve => setTimeout(resolve, 2500));

    const after = await KV.getMany(instance, ['manytll:1', 'manytll:2']);
    assert.strictEqual(after.values[0], null);
    assert.strictEqual(after.values[1], null);
  });

});



// ============================================================================
// 6. SCAN
// ============================================================================

describe('Scan', function () {

  it('should scan and return unprefixed keys', async function () {

    // Use a prefixed instance for this test
    const { Lib: LibP } = require('./loader')();
    const KVP = require('../kv-valkey')(LibP, {
      HOST: Config.valkey_host,
      PORT: Config.valkey_port,
      KEY_PREFIX: 'scanprefix:'
    });
    const instP = LibP.Instance.initialize();

    await KVP.set(instP, 'user:1', 'a');
    await KVP.set(instP, 'user:2', 'b');
    await KVP.set(instP, 'other:1', 'c');

    const result = await KVP.scan(instP, 'user:*');

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.keys.length, 2);
    // Keys should be unprefixed (Landmine 4 regression test)
    assert.ok(result.keys.indexOf('user:1') !== -1, 'should contain user:1 without prefix');
    assert.ok(result.keys.indexOf('user:2') !== -1, 'should contain user:2 without prefix');
    // Should NOT contain the prefix
    assert.ok(result.keys.indexOf('scanprefix:user:1') === -1, 'should not contain prefixed key');

    await KVP.close(instP);
  });

  it('should return empty array for no matches', async function () {

    const result = await KV.scan(instance, 'nonexistent_pattern:*');

    assert.strictEqual(result.success, true);
    assert.deepStrictEqual(result.keys, []);
  });

});



// ============================================================================
// 7. HASH
// ============================================================================

describe('Hash', function () {

  it('should set and get a hash field', async function () {

    await KV.setHashField(instance, 'myhash', 'field1', { data: 'value1' });

    const result = await KV.getHashField(instance, 'myhash', 'field1');

    assert.strictEqual(result.success, true);
    assert.deepStrictEqual(result.value, { data: 'value1' });
  });

  it('should return null for absent hash field', async function () {

    const result = await KV.getHashField(instance, 'myhash', 'nonexistent_field');

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.value, null);
  });

  it('should return null for absent hash key', async function () {

    const result = await KV.getHashField(instance, 'nonexistent_hash', 'field1');

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.value, null);
  });

  it('should get all fields from a hash', async function () {

    await KV.setHashField(instance, 'allhash', 'f1', 'v1');
    await KV.setHashField(instance, 'allhash', 'f2', 'v2');

    const result = await KV.getHashFields(instance, 'allhash');

    assert.strictEqual(result.success, true);
    assert.strictEqual(Object.keys(result.fields).length, 2);
    assert.strictEqual(result.fields.f1, 'v1');
    assert.strictEqual(result.fields.f2, 'v2');
  });

  it('should return empty object for absent hash key', async function () {

    const result = await KV.getHashFields(instance, 'absent_hash');

    assert.strictEqual(result.success, true);
    assert.deepStrictEqual(result.fields, {});
  });

  it('should delete a hash field and return deleted_count', async function () {

    await KV.setHashField(instance, 'delhash', 'field1', 'v1');

    const result = await KV.deleteHashField(instance, 'delhash', 'field1');

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.deleted_count, 1);

    // Verify it is gone
    const check = await KV.getHashField(instance, 'delhash', 'field1');
    assert.strictEqual(check.value, null);
  });

  it('should return deleted_count 0 for absent hash field', async function () {

    const result = await KV.deleteHashField(instance, 'somehash', 'nonexistent');

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.deleted_count, 0);
  });

});



// ============================================================================
// 8. TTL: setExpire, getTtl
// ============================================================================

describe('TTL', function () {

  it('should set expire on existing key with applied: true', async function () {

    await KV.set(instance, 'expire_key', 'value');

    const result = await KV.setExpire(instance, 'expire_key', 30);

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.applied, true);
  });

  it('should return applied: false for absent key', async function () {

    const result = await KV.setExpire(instance, 'nonexistent_expire', 30);

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.applied, false);
  });

  it('should get TTL for key with expiry', async function () {

    await KV.set(instance, 'ttl_check', 'value');
    await KV.setExpire(instance, 'ttl_check', 60);

    const result = await KV.getTtl(instance, 'ttl_check');

    assert.strictEqual(result.success, true);
    assert.ok(result.ttl_seconds > 0 && result.ttl_seconds <= 60, 'ttl_seconds should be between 0 and 60');
  });

  it('should return null TTL for key with no expiry (maps -1 to null)', async function () {

    await KV.set(instance, 'no_ttl', 'value');

    const result = await KV.getTtl(instance, 'no_ttl');

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.ttl_seconds, null);
  });

  it('should return null TTL for absent key (maps -2 to null)', async function () {

    const result = await KV.getTtl(instance, 'absent_ttl_key');

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.ttl_seconds, null);
  });

  it('should never return -1 or -2', async function () {

    // Key with no expiry
    await KV.set(instance, 'never_expires', 'value');
    const r1 = await KV.getTtl(instance, 'never_expires');
    assert.notStrictEqual(r1.ttl_seconds, -1);
    assert.notStrictEqual(r1.ttl_seconds, -2);

    // Absent key
    const r2 = await KV.getTtl(instance, 'totally_absent');
    assert.notStrictEqual(r2.ttl_seconds, -1);
    assert.notStrictEqual(r2.ttl_seconds, -2);
  });

});



// ============================================================================
// 9. COUNTER: increment
// ============================================================================

describe('Counter', function () {

  it('should increment by 1 by default', async function () {

    await KV.set(instance, 'counter:1', 0); // not needed, INCR treats absent as 0

    const result = await KV.increment(instance, 'counter:1');

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.value, 1);
  });

  it('should increment by a given amount', async function () {

    await KV.increment(instance, 'counter:2', 5);

    const result = await KV.increment(instance, 'counter:2', 5);

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.value, 10);
  });

  it('should treat absent key as 0', async function () {

    const result = await KV.increment(instance, 'counter:absent');

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.value, 1);
  });

  it('should increment atomically across concurrent calls', async function () {

    // Fire 10 concurrent increments
    const promises = [];
    for (let i = 0; i < 10; i++) {
      promises.push(KV.increment(instance, 'counter:concurrent'));
    }

    await Promise.all(promises);

    // Read the final value - should be exactly 10
    const check = await KV.get(instance, 'counter:concurrent');
    assert.strictEqual(check.value, 10);
  });

  it('should return KV_COMMAND_FAILED for non-integer value', async function () {

    // Set a string value that cannot be incremented
    await adminClient.set('not_a_number', 'string_value');

    const result = await KV.increment(instance, 'not_a_number');

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.value, null);
    assert.strictEqual(result.error.type, ERRORS.KV_COMMAND_FAILED.type);
  });

});



// ============================================================================
// 10. KEY_PREFIX ISOLATION
// ============================================================================

describe('Key Prefix Isolation', function () {

  it('two instances with different prefixes cannot see each other keys', async function () {

    const loadA = require('./loader')();
    const LibA = loadA.Lib;
    const loadB = require('./loader')();
    const LibB = loadB.Lib;

    const KVA = require('../kv-valkey')(LibA, {
      HOST: Config.valkey_host,
      PORT: Config.valkey_port,
      KEY_PREFIX: 'appA:'
    });
    const KVB = require('../kv-valkey')(LibB, {
      HOST: Config.valkey_host,
      PORT: Config.valkey_port,
      KEY_PREFIX: 'appB:'
    });

    const instA = LibA.Instance.initialize();
    const instB = LibB.Instance.initialize();

    // App A writes a key
    await KVA.set(instA, 'shared_key', 'from_app_a');

    // App B should not see it
    const resultB = await KVB.get(instB, 'shared_key');
    assert.strictEqual(resultB.value, null);

    // App B writes its own key with the same name
    await KVB.set(instB, 'shared_key', 'from_app_b');

    // App A should still see its own value
    const resultA = await KVA.get(instA, 'shared_key');
    assert.strictEqual(resultA.value, 'from_app_a');

    // App B should see its own value
    const resultB2 = await KVB.get(instB, 'shared_key');
    assert.strictEqual(resultB2.value, 'from_app_b');

    await KVA.close(instA);
    await KVB.close(instB);
  });

});



// ============================================================================
// 11. DB FUNCTIONALITY (C1 test)
// ============================================================================

describe('DB Functionality', function () {

  it('should connect and operate with non-zero DB', async function () {

    const { Lib: LibDB } = require('./loader')();
    const KVDB = require('../kv-valkey')(LibDB, {
      HOST: Config.valkey_host,
      PORT: Config.valkey_port,
      DB: 1
    });
    const instDB = LibDB.Instance.initialize();

    // Write to DB 1
    await KVDB.set(instDB, 'db1_key', 'db1_value');

    // Read it back
    const result = await KVDB.get(instDB, 'db1_key');
    assert.strictEqual(result.value, 'db1_value');

    // The default instance (DB 0) should NOT see this key
    const defaultResult = await KV.get(instance, 'db1_key');
    assert.strictEqual(defaultResult.value, null);

    // Clean up DB 1
    await adminClient.select(1);
    await adminClient.flushdb();
    await adminClient.select(0);

    await KVDB.close(instDB);
  });

});



// ============================================================================
// 12. WRAPPER PURITY
// ============================================================================

describe('Wrapper Purity', function () {

  it('should never include ioredis wording in error objects', async function () {

    // Trigger a serialization error
    const circular = {};
    circular.self = circular;

    const result = await KV.set(instance, 'purity_test', circular);

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error.type, ERRORS.KV_SERIALIZATION_FAILED.type);
    assert.strictEqual(result.error.message, ERRORS.KV_SERIALIZATION_FAILED.message);

    // The error message should not contain ioredis-specific text
    assert.ok(result.error.message.indexOf('ioredis') === -1, 'error message should not mention ioredis');
    assert.ok(result.error.message.indexOf('Redis') === -1, 'error message should not mention Redis');
  });

});

});

// ============================================================================
// 7. Connection lifecycle - registration, persistent vs serverless, background gate
// ============================================================================

describe('connection lifecycle', function () {

  it('should register the process cleanup routine once, not per call', async function () {

    const { Lib: LibF, instance: instF } = buildLib({ CLOSE_ON_CLEANUP: false });
    const KVF = LibF.KV;
    const InstanceF = LibF.Instance;

    await KVF.ping(instF);
    await KVF.ping(instF);

    assert.strictEqual(InstanceF.getProcessCleanupRoutineCount(), 1);

    await InstanceF.runProcessCleanup();

  });


  it('should hold the client open on a persistent deployment', async function () {

    const { Lib: LibP, instance: instP } = buildLib({ CLOSE_ON_CLEANUP: false });
    const KVP = LibP.KV;
    const InstanceP = LibP.Instance;

    const res1 = await KVP.ping(instP);
    assert.strictEqual(res1.success, true);

    await InstanceP.runInstanceCleanup(instP);

    const res2 = await KVP.ping(instP);
    assert.strictEqual(res2.success, true);

    await InstanceP.runProcessCleanup();

  });


  it('should close the client on a serverless deployment and re-open on next call', async function () {

    const { Lib: LibSL, instance: instSL } = buildLib({ CLOSE_ON_CLEANUP: true });
    const KVSL = LibSL.KV;
    const InstanceSL = LibSL.Instance;

    const res1 = await KVSL.ping(instSL);
    assert.strictEqual(res1.success, true);

    await InstanceSL.runInstanceCleanup(instSL);

    assert.strictEqual(InstanceSL.getProcessCleanupRoutineCount(), 0);

    const res2 = await KVSL.ping(instSL);
    assert.strictEqual(res2.success, true);

    await InstanceSL.runInstanceCleanup(instSL);

  });


  it('should close and re-register across multiple serverless request cycles', async function () {

    const { Lib: LibSL, instance: instSL } = buildLib({ CLOSE_ON_CLEANUP: true });
    const KVSL = LibSL.KV;
    const InstanceSL = LibSL.Instance;

    for (let i = 0; i < 3; i++) {
      const res = await KVSL.ping(instSL);
      assert.strictEqual(res.success, true);

      await InstanceSL.runInstanceCleanup(instSL);
      assert.strictEqual(InstanceSL.getProcessCleanupRoutineCount(), 0);
    }

  });


  it('should run background routines before process cleanup routines', async function () {

    const { Lib: LibBG, instance: instBG } = buildLib({ CLOSE_ON_CLEANUP: true });
    const InstanceBG = LibBG.Instance;

    const order = [];

    const signal = InstanceBG.addBackgroundRoutine(instBG);
    setImmediate(function () {
      order.push('background');
      signal();
    });

    InstanceBG.addProcessCleanupRoutine(instBG, function () {
      order.push('cleanup');
    });

    await InstanceBG.runInstanceCleanup(instBG);

    assert.strictEqual(order[0], 'background');
    assert.strictEqual(order[1], 'cleanup');

  });


});
