// Info: Serialization, corruption, namespace isolation, and engine error
// tests for js-rn-helper-kv-mmkv. Supplements test.js with edge cases
// that exercise JSON round-trip fidelity, corruption recovery, cross-
// namespace safety, and engine throw paths.
// Tests use ONLY public API exports (no direct private function access).
'use strict';

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

const {
  Store,
  StoreOther,
  createFreshStore,
  createMmkvStub,
  resetSharedData,
  Utils,
  Debug
} = require('./loader.js');

const KvMmkvModule = require('helper-kv-mmkv');


// Reset shared data before each test
beforeEach(function () {
  resetSharedData();
});


// ============================================================================
// 1. SERIALIZATION FIDELITY
// ============================================================================

describe('serialization fidelity', function () {

  it('should round-trip a nested object with three levels of depth', function () {
    const nested = { a: { b: { c: 'deep' } } };
    Store.writeRecordSync('nested', nested);

    const result = Store.getRecordSync('nested');

    assert.strictEqual(result.success, true);
    assert.deepStrictEqual(result.value, { a: { b: { c: 'deep' } } });
  });

  it('should round-trip an array of mixed types', function () {
    const arr = [1, 'two', true, null, { nested: 'obj' }];
    Store.writeRecordSync('mixed', arr);

    const result = Store.getRecordSync('mixed');

    assert.strictEqual(result.success, true);
    assert.deepStrictEqual(result.value, [1, 'two', true, null, { nested: 'obj' }]);
  });

  it('should round-trip a boolean false value distinct from null', function () {
    Store.writeRecordSync('boolfalse', false);

    const result = Store.getRecordSync('boolfalse');

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.found, true);
    assert.strictEqual(result.value, false);
  });

  it('should round-trip the number zero distinct from null', function () {
    Store.writeRecordSync('zero', 0);

    const result = Store.getRecordSync('zero');

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.found, true);
    assert.strictEqual(result.value, 0);
  });

  it('should round-trip an empty string distinct from null', function () {
    Store.writeRecordSync('emptystr', '');

    const result = Store.getRecordSync('emptystr');

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.found, true);
    assert.strictEqual(result.value, '');
  });

  it('should round-trip a string with special characters and unicode', function () {
    const special = 'héllo "wörld" \\ \n \t emoji: 🎉';
    Store.writeRecordSync('special', special);

    const result = Store.getRecordSync('special');

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.value, special);
  });

  it('should round-trip a large object with 100 keys', function () {
    const large = {};
    for (let i = 0; i < 100; i++) {
      large['key_' + i] = 'value_' + i;
    }
    Store.writeRecordSync('large', large);

    const result = Store.getRecordSync('large');

    assert.strictEqual(result.success, true);
    assert.deepStrictEqual(result.value, large);
    assert.strictEqual(Object.keys(result.value).length, 100);
  });

  it('should serialize a Date object as an ISO string (JSON behavior)', function () {
    const date = new Date('2024-01-15T10:30:00.000Z');
    Store.writeRecordSync('date', date);

    const result = Store.getRecordSync('date');

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.value, '2024-01-15T10:30:00.000Z');
  });

  it('should serialize NaN as null (JSON behavior)', function () {
    Store.writeRecordSync('nan', NaN);

    const result = Store.getRecordSync('nan');

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.value, null);
  });

  it('should serialize Infinity as null (JSON behavior)', function () {
    Store.writeRecordSync('inf', Infinity);

    const result = Store.getRecordSync('inf');

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.value, null);
  });

  it('should round-trip an empty array', function () {
    Store.writeRecordSync('emptyarr', []);

    const result = Store.getRecordSync('emptyarr');

    assert.strictEqual(result.success, true);
    assert.deepStrictEqual(result.value, []);
  });

  it('should round-trip an empty object', function () {
    Store.writeRecordSync('emptyobj', {});

    const result = Store.getRecordSync('emptyobj');

    assert.strictEqual(result.success, true);
    assert.deepStrictEqual(result.value, {});
  });

});


// ============================================================================
// 2. CORRUPTION RECOVERY
// ============================================================================

describe('corruption recovery', function () {

  it('should recover from corruption by overwriting with a valid value', function () {
    const fresh = createFreshStore('recover');

    fresh.MmkvStub._rawSet('recover:corrupt', 'not-json{');
    const readBefore = fresh.store.getRecordSync('corrupt');
    assert.strictEqual(readBefore.success, false);
    assert.strictEqual(readBefore.error.type, 'helper-kv-mmkv/deserialize-failed');

    const writeResult = fresh.store.writeRecordSync('corrupt', { fixed: true });
    assert.strictEqual(writeResult.success, true);

    const readAfter = fresh.store.getRecordSync('corrupt');
    assert.strictEqual(readAfter.success, true);
    assert.deepStrictEqual(readAfter.value, { fixed: true });
  });

  it('should report DESERIALIZE_FAILED without crashing the engine for subsequent reads', function () {
    const fresh = createFreshStore('crash');

    fresh.MmkvStub._rawSet('crash:bad1', '}{invalid');
    fresh.store.writeRecordSync('good', 'still-works');

    const badResult = fresh.store.getRecordSync('bad1');
    assert.strictEqual(badResult.success, false);
    assert.strictEqual(badResult.error.type, 'helper-kv-mmkv/deserialize-failed');

    const goodResult = fresh.store.getRecordSync('good');
    assert.strictEqual(goodResult.success, true);
    assert.strictEqual(goodResult.value, 'still-works');
  });

  it('should report DESERIALIZE_FAILED for empty string stored via rawSet', function () {
    const fresh = createFreshStore('rawempty');

    fresh.MmkvStub._rawSet('rawempty:empty', '');

    const result = fresh.store.getRecordSync('empty');

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error.type, 'helper-kv-mmkv/deserialize-failed');
  });

  it('should report DESERIALIZE_FAILED for a stored boolean string "true" without JSON validity', function () {
    const fresh = createFreshStore('rawbool');

    fresh.MmkvStub._rawSet('rawbool:val', 'true');

    const result = fresh.store.getRecordSync('val');

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.value, true);
  });

});


// ============================================================================
// 3. NAMESPACE ISOLATION EDGE CASES
// ============================================================================

describe('namespace isolation edge cases', function () {

  it('should allow the same key name in two namespaces without collision', function () {
    Store.writeRecordSync('shared', 'mine');
    StoreOther.writeRecordSync('shared', 'theirs');

    assert.strictEqual(Store.getRecordSync('shared').value, 'mine');
    assert.strictEqual(StoreOther.getRecordSync('shared').value, 'theirs');
  });

  it('should preserve other namespace data when clearSync is called on one namespace', function () {
    Store.writeRecordSync('a1', 1);
    Store.writeRecordSync('a2', 2);
    StoreOther.writeRecordSync('b1', 3);

    const result = Store.clearSync();

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.cleared_count, 2);
    assert.strictEqual(Store.getAllKeysSync().count, 0);
    assert.strictEqual(StoreOther.getAllKeysSync().count, 1);
    assert.strictEqual(StoreOther.getRecordSync('b1').value, 3);
  });

  it('should not see keys from another namespace via getRecordExistsSync', function () {
    StoreOther.writeRecordSync('private', 'secret');

    const result = Store.getRecordExistsSync('private');

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.exists, false);
  });

  it('should isolate batch operations within the calling namespace', function () {
    Store.writeRecordSync('x', 1);
    StoreOther.writeRecordSync('x', 2);

    const batch = Store.batchGetRecordsSync(['x']);
    assert.deepStrictEqual(batch.values, { x: 1 });

    const batchOther = StoreOther.batchGetRecordsSync(['x']);
    assert.deepStrictEqual(batchOther.values, { x: 2 });
  });

  it('should isolate deleteRecordSync within the calling namespace', function () {
    Store.writeRecordSync('shared', 'mine');
    StoreOther.writeRecordSync('shared', 'theirs');

    Store.deleteRecordSync('shared');

    assert.strictEqual(Store.getRecordExistsSync('shared').exists, false);
    assert.strictEqual(StoreOther.getRecordExistsSync('shared').exists, true);
    assert.strictEqual(StoreOther.getRecordSync('shared').value, 'theirs');
  });

  it('should isolate batchDeleteRecordsSync within the calling namespace', function () {
    Store.writeRecordSync('d', 1);
    StoreOther.writeRecordSync('d', 2);

    Store.batchDeleteRecordsSync(['d']);

    assert.strictEqual(Store.getRecordExistsSync('d').exists, false);
    assert.strictEqual(StoreOther.getRecordExistsSync('d').exists, true);
  });

});


// ============================================================================
// 4. ENGINE ERROR PATHS
// ============================================================================

describe('engine error paths', function () {

  it('should return STORAGE_DELETE_FAILED when engine throws on delete', function () {
    const fresh = createFreshStore('throwdel');
    fresh.MmkvStub._setThrowOnWrite(true);

    const result = fresh.store.deleteRecordSync('key');

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error.type, 'helper-kv-mmkv/storage-delete-failed');
  });

  it('should return STORAGE_READ_FAILED when engine throws on contains in getRecordExistsSync', function () {
    const fresh = createFreshStore('throwcontains');
    fresh.MmkvStub._setThrowOnRead(true);

    const result = fresh.store.getRecordExistsSync('key');

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error.type, 'helper-kv-mmkv/storage-read-failed');
  });

  it('should return STORAGE_READ_FAILED when engine throws on getAllKeysSync', function () {
    const fresh = createFreshStore('throwgetall');
    fresh.MmkvStub._setThrowOnRead(true);

    const result = fresh.store.getAllKeysSync();

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.keys, null);
    assert.strictEqual(result.count, 0);
    assert.strictEqual(result.error.type, 'helper-kv-mmkv/storage-read-failed');
  });

  it('should return STORAGE_DELETE_FAILED when engine throws on clearSync with namespace', function () {
    const fresh = createFreshStore('throwclear');
    fresh.store.writeRecordSync('k', 'v');
    fresh.MmkvStub._setThrowOnWrite(true);

    const result = fresh.store.clearSync();

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.cleared_count, 0);
    assert.strictEqual(result.error.type, 'helper-kv-mmkv/storage-delete-failed');
  });

  it('should return STORAGE_DELETE_FAILED when engine throws on clearSync with empty namespace', function () {
    const MmkvStub = createMmkvStub();
    const store = KvMmkvModule({
      Utils: Utils,
      Debug: Debug,
      MMKV: MmkvStub
    }, {
      NAMESPACE: '',
      INSTANCE_ID: 'throwclear-global'
    });

    store.writeRecordSync('k', 'v');
    MmkvStub._setThrowOnWrite(true);

    const result = store.clearSync();

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.cleared_count, 0);
    assert.strictEqual(result.error.type, 'helper-kv-mmkv/storage-delete-failed');
  });

  it('should propagate STORAGE_WRITE_FAILED from batchWriteRecordsSync on first failure', function () {
    const fresh = createFreshStore('throwbatch');
    fresh.MmkvStub._setThrowOnWrite(true);

    const result = fresh.store.batchWriteRecordsSync({ a: 1, b: 2 });

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error.type, 'helper-kv-mmkv/storage-write-failed');
  });

  it('should propagate STORAGE_DELETE_FAILED from batchDeleteRecordsSync on first failure', function () {
    const fresh = createFreshStore('throwbatchdel');
    fresh.store.writeRecordSync('a', 1);
    fresh.MmkvStub._setThrowOnWrite(true);

    const result = fresh.store.batchDeleteRecordsSync(['a']);

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error.type, 'helper-kv-mmkv/storage-delete-failed');
  });

});


// ============================================================================
// 5. CONFIG ABSORPTION CONTRACT
// ============================================================================

describe('config absorption contract', function () {

  function validBaseConfig () {
    return {
      NAMESPACE: 'test',
      INSTANCE_ID: 'test-instance'
    };
  }

  it('should absorb a NAMESPACE override that changes observable behavior', function () {
    const MmkvStub = createMmkvStub();

    const storeA = KvMmkvModule({
      Utils: Utils,
      Debug: Debug,
      MMKV: MmkvStub
    }, Object.assign(validBaseConfig(), { NAMESPACE: 'ns-a' }));

    const storeB = KvMmkvModule({
      Utils: Utils,
      Debug: Debug,
      MMKV: MmkvStub
    }, Object.assign(validBaseConfig(), { NAMESPACE: 'ns-b' }));

    storeA.writeRecordSync('key', 'from-a');
    storeB.writeRecordSync('key', 'from-b');

    assert.strictEqual(storeA.getRecordSync('key').value, 'from-a');
    assert.strictEqual(storeB.getRecordSync('key').value, 'from-b');
  });

  it('should retain the default INSTANCE_ID when omitted', function () {
    const MmkvStub = createMmkvStub();

    assert.doesNotThrow(function () {
      KvMmkvModule({
        Utils: Utils,
        Debug: Debug,
        MMKV: MmkvStub
      }, { NAMESPACE: 'test' });
    });
  });

  it('should throw TypeError when INSTANCE_ID is an empty string', function () {
    const MmkvStub = createMmkvStub();

    assert.throws(function () {
      KvMmkvModule({
        Utils: Utils,
        Debug: Debug,
        MMKV: MmkvStub
      }, Object.assign(validBaseConfig(), { INSTANCE_ID: '' }));
    }, /INSTANCE_ID must be a non-empty string/);
  });

  it('should throw TypeError when NAMESPACE is a number', function () {
    const MmkvStub = createMmkvStub();

    assert.throws(function () {
      KvMmkvModule({
        Utils: Utils,
        Debug: Debug,
        MMKV: MmkvStub
      }, Object.assign(validBaseConfig(), { NAMESPACE: 123 }));
    }, /NAMESPACE must be a string/);
  });

  it('should throw TypeError when ENCRYPTION_KEY is a number', function () {
    const MmkvStub = createMmkvStub();

    assert.throws(function () {
      KvMmkvModule({
        Utils: Utils,
        Debug: Debug,
        MMKV: MmkvStub
      }, Object.assign(validBaseConfig(), { ENCRYPTION_KEY: 123 }));
    }, /ENCRYPTION_KEY must be a string/);
  });

  it('should produce independent instances with different configs (factory independence)', function () {
    const MmkvStub = createMmkvStub();

    const storeA = KvMmkvModule({
      Utils: Utils,
      Debug: Debug,
      MMKV: MmkvStub
    }, { NAMESPACE: 'a', INSTANCE_ID: 'a-inst' });

    const storeB = KvMmkvModule({
      Utils: Utils,
      Debug: Debug,
      MMKV: MmkvStub
    }, { NAMESPACE: 'b', INSTANCE_ID: 'b-inst' });

    storeA.writeRecordSync('key', 'a-val');

    assert.strictEqual(storeA.getRecordSync('key').value, 'a-val');
    assert.strictEqual(storeB.getRecordSync('key').found, false);
  });

});
