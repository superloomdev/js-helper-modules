// Info: Unit tests for js-client-helper-kv-localstorage
// Tests the KV store over a Web Storage stub in pure Node.
// Tests use ONLY public API exports (no direct private function access).
'use strict';

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

const {
  Store,
  StoreOther,
  StoreGlobal,
  StoreNoEngine,
  sharedEngine,
  createFreshStore,
  createWebStorageStub,
  Utils,
  Debug
} = require('./loader.js');


// Reset shared engine before each test
beforeEach(function () {
  sharedEngine.clear();
});



// ============================================================================
// 1. LOADER AND EXPORTS
// ============================================================================

describe('KvLocalstorage loader', function () {

  it('should return the 18 expected exports when loaded', function () {
    const expected = [
      'getRecord', 'writeRecord', 'deleteRecord', 'getRecordExists',
      'getAllKeys', 'batchGetRecords', 'batchWriteRecords',
      'batchDeleteRecords', 'clear',
      'getRecordSync', 'writeRecordSync', 'deleteRecordSync',
      'getRecordExistsSync', 'getAllKeysSync', 'batchGetRecordsSync',
      'batchWriteRecordsSync', 'batchDeleteRecordsSync', 'clearSync'
    ];
    for (let i = 0; i < expected.length; i++) {
      assert.strictEqual(typeof Store[expected[i]], 'function', 'has ' + expected[i]);
    }
  });

});



// ============================================================================
// 2. getRecordSync
// ============================================================================

describe('getRecordSync', function () {

  it('should return found false when key is absent', function () {
    const result = Store.getRecordSync('missing');

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.value, null);
    assert.strictEqual(result.found, false);
    assert.strictEqual(result.error, null);
  });

  it('should return found true with value null when null is stored', function () {
    Store.writeRecordSync('nullkey', null);
    const result = Store.getRecordSync('nullkey');

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.value, null);
    assert.strictEqual(result.found, true);
    assert.strictEqual(result.error, null);
  });

  it('should return found true with the stored value when key exists', function () {
    Store.writeRecordSync('name', 'alice');
    const result = Store.getRecordSync('name');

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.value, 'alice');
    assert.strictEqual(result.found, true);
    assert.strictEqual(result.error, null);
  });

  it('should return DESERIALIZE_FAILED when stored value is not valid JSON', function () {
    const fresh = createFreshStore('corrupt');
    fresh.engine._rawSet('corrupt:bad', 'not-json{');

    const result = fresh.store.getRecordSync('bad');

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.value, null);
    assert.strictEqual(result.found, false);
    assert.strictEqual(result.error.type, 'helper-kv-localstorage/deserialize-failed');
  });

  it('should return INVALID_KEY when key is empty string', function () {
    const result = Store.getRecordSync('');

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error.type, 'helper-kv-localstorage/invalid-key');
  });

  it('should return INVALID_KEY when key contains colon', function () {
    const result = Store.getRecordSync('a:b');

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error.type, 'helper-kv-localstorage/invalid-key');
  });

  it('should return INVALID_KEY when key is not a string', function () {
    const result = Store.getRecordSync(123);

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error.type, 'helper-kv-localstorage/invalid-key');
  });

  it('should return STORAGE_UNAVAILABLE when no engine is available', function () {
    const result = StoreNoEngine.getRecordSync('key');

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error.type, 'helper-kv-localstorage/storage-unavailable');
  });

  it('should return STORAGE_READ_FAILED when engine throws on read', function () {
    const fresh = createFreshStore('throwread');
    fresh.engine._setThrowOnRead(true);

    const result = fresh.store.getRecordSync('key');

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error.type, 'helper-kv-localstorage/storage-read-failed');
  });

});



// ============================================================================
// 3. writeRecordSync
// ============================================================================

describe('writeRecordSync', function () {

  it('should write and read back a string value', function () {
    const result = Store.writeRecordSync('name', 'bob');
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.error, null);

    const read = Store.getRecordSync('name');
    assert.strictEqual(read.value, 'bob');
  });

  it('should write and read back an object value', function () {
    Store.writeRecordSync('user', { name: 'alice', age: 30 });
    const read = Store.getRecordSync('user');

    assert.deepStrictEqual(read.value, { name: 'alice', age: 30 });
  });

  it('should upsert when writing to an existing key', function () {
    Store.writeRecordSync('counter', 1);
    Store.writeRecordSync('counter', 2);

    const read = Store.getRecordSync('counter');
    assert.strictEqual(read.value, 2);
  });

  it('should return INVALID_VALUE when value is undefined', function () {
    const result = Store.writeRecordSync('key', undefined);

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error.type, 'helper-kv-localstorage/invalid-value');
  });

  it('should return INVALID_KEY when key is empty string', function () {
    const result = Store.writeRecordSync('', 'val');

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error.type, 'helper-kv-localstorage/invalid-key');
  });

  it('should return STORAGE_UNAVAILABLE when no engine is available', function () {
    const result = StoreNoEngine.writeRecordSync('key', 'val');

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error.type, 'helper-kv-localstorage/storage-unavailable');
  });

  it('should return STORAGE_WRITE_FAILED when engine throws on write', function () {
    const fresh = createFreshStore('throwwrite');
    fresh.engine._setThrowOnWrite(true);

    const result = fresh.store.writeRecordSync('key', 'val');

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error.type, 'helper-kv-localstorage/storage-write-failed');
  });

});



// ============================================================================
// 4. deleteRecordSync
// ============================================================================

describe('deleteRecordSync', function () {

  it('should delete an existing key', function () {
    Store.writeRecordSync('temp', 'data');
    const result = Store.deleteRecordSync('temp');

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.error, null);

    const read = Store.getRecordSync('temp');
    assert.strictEqual(read.found, false);
  });

  it('should delete idempotently when key is absent', function () {
    const result = Store.deleteRecordSync('nonexistent');

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.error, null);
  });

  it('should return INVALID_KEY when key contains colon', function () {
    const result = Store.deleteRecordSync('a:b');

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error.type, 'helper-kv-localstorage/invalid-key');
  });

  it('should return STORAGE_UNAVAILABLE when no engine is available', function () {
    const result = StoreNoEngine.deleteRecordSync('key');

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error.type, 'helper-kv-localstorage/storage-unavailable');
  });

});



// ============================================================================
// 5. getRecordExistsSync
// ============================================================================

describe('getRecordExistsSync', function () {

  it('should return exists true when key is present', function () {
    Store.writeRecordSync('present', 'val');
    const result = Store.getRecordExistsSync('present');

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.exists, true);
  });

  it('should return exists false when key is absent', function () {
    const result = Store.getRecordExistsSync('absent');

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.exists, false);
  });

  it('should return INVALID_KEY when key is not a string', function () {
    const result = Store.getRecordExistsSync({});

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error.type, 'helper-kv-localstorage/invalid-key');
  });

});



// ============================================================================
// 6. getAllKeysSync
// ============================================================================

describe('getAllKeysSync', function () {

  it('should strip namespace prefix when listing all keys', function () {
    Store.writeRecordSync('alpha', 1);
    Store.writeRecordSync('beta', 2);

    const result = Store.getAllKeysSync();

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.count, 2);
    assert.ok(result.keys.indexOf('alpha') !== -1, 'keys contain alpha without prefix');
    assert.ok(result.keys.indexOf('beta') !== -1, 'keys contain beta without prefix');
  });

  it('should return only namespaced keys when other namespaces exist', function () {
    Store.writeRecordSync('mine', 1);
    StoreOther.writeRecordSync('theirs', 2);

    const result = Store.getAllKeysSync();

    assert.strictEqual(result.count, 1);
    assert.strictEqual(result.keys[0], 'mine');
  });

  it('should return empty array when no keys exist', function () {
    const result = Store.getAllKeysSync();

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.count, 0);
    assert.deepStrictEqual(result.keys, []);
  });

  it('should return STORAGE_UNAVAILABLE when no engine is available', function () {
    const result = StoreNoEngine.getAllKeysSync();

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error.type, 'helper-kv-localstorage/storage-unavailable');
  });

});



// ============================================================================
// 7. batchGetRecordsSync
// ============================================================================

describe('batchGetRecordsSync', function () {

  it('should return a key-value map when batch getting records', function () {
    Store.writeRecordSync('a', 1);
    Store.writeRecordSync('b', 2);

    const result = Store.batchGetRecordsSync(['a', 'b']);

    assert.strictEqual(result.success, true);
    assert.deepStrictEqual(result.values, { a: 1, b: 2 });
  });

  it('should omit absent keys from the values map', function () {
    Store.writeRecordSync('present', 'val');

    const result = Store.batchGetRecordsSync(['present', 'missing']);

    assert.strictEqual(result.success, true);
    assert.deepStrictEqual(result.values, { present: 'val' });
    assert.strictEqual(Object.prototype.hasOwnProperty.call(result.values, 'missing'), false);
  });

  it('should return INVALID_KEYS when argument is not an array', function () {
    const result = Store.batchGetRecordsSync('not-array');

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error.type, 'helper-kv-localstorage/invalid-keys');
  });

  it('should return INVALID_KEYS when array contains an invalid key', function () {
    const result = Store.batchGetRecordsSync(['valid', '']);

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error.type, 'helper-kv-localstorage/invalid-keys');
  });

});



// ============================================================================
// 8. batchWriteRecordsSync
// ============================================================================

describe('batchWriteRecordsSync', function () {

  it('should write all pairs when batch writing records', function () {
    const result = Store.batchWriteRecordsSync({ x: 10, y: 20 });

    assert.strictEqual(result.success, true);
    assert.strictEqual(Store.getRecordSync('x').value, 10);
    assert.strictEqual(Store.getRecordSync('y').value, 20);
  });

  it('should return INVALID_KEYS when argument is not a plain object', function () {
    const result = Store.batchWriteRecordsSync(['not', 'an', 'object']);

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error.type, 'helper-kv-localstorage/invalid-keys');
  });

  it('should return INVALID_KEYS when argument is null', function () {
    const result = Store.batchWriteRecordsSync(null);

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error.type, 'helper-kv-localstorage/invalid-keys');
  });

});



// ============================================================================
// 9. batchDeleteRecordsSync
// ============================================================================

describe('batchDeleteRecordsSync', function () {

  it('should delete all keys when batch deleting records', function () {
    Store.writeRecordSync('d1', 'val');
    Store.writeRecordSync('d2', 'val');

    const result = Store.batchDeleteRecordsSync(['d1', 'd2']);

    assert.strictEqual(result.success, true);
    assert.strictEqual(Store.getRecordExistsSync('d1').exists, false);
    assert.strictEqual(Store.getRecordExistsSync('d2').exists, false);
  });

  it('should return INVALID_KEYS when argument is not an array', function () {
    const result = Store.batchDeleteRecordsSync({});

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error.type, 'helper-kv-localstorage/invalid-keys');
  });

});



// ============================================================================
// 10. clearSync
// ============================================================================

describe('clearSync', function () {

  it('should clear only namespaced keys when namespace is set', function () {
    Store.writeRecordSync('keep-mine', 1);
    StoreOther.writeRecordSync('keep-theirs', 2);

    const result = Store.clearSync();

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.cleared_count, 1);
    assert.strictEqual(Store.getRecordExistsSync('keep-mine').exists, false);
    assert.strictEqual(StoreOther.getRecordExistsSync('keep-theirs').exists, true);
  });

  it('should clear all keys when namespace is empty', function () {
    StoreGlobal.writeRecordSync('g1', 1);
    StoreGlobal.writeRecordSync('g2', 2);

    const result = StoreGlobal.clearSync();

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.cleared_count, 2);
    assert.strictEqual(StoreGlobal.getAllKeysSync().count, 0);
  });

  it('should return STORAGE_UNAVAILABLE when no engine is available', function () {
    const result = StoreNoEngine.clearSync();

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error.type, 'helper-kv-localstorage/storage-unavailable');
  });

});



// ============================================================================
// 11. NAMESPACE ISOLATION
// ============================================================================

describe('namespace isolation', function () {

  it('should not leak keys between namespaces when two instances share one engine', function () {
    Store.writeRecordSync('mykey', 'mine');
    StoreOther.writeRecordSync('theirkey', 'theirs');

    const mine = Store.getAllKeysSync();
    const theirs = StoreOther.getAllKeysSync();

    assert.strictEqual(mine.count, 1);
    assert.strictEqual(mine.keys[0], 'mykey');

    assert.strictEqual(theirs.count, 1);
    assert.strictEqual(theirs.keys[0], 'theirkey');
  });

  it('should not see other namespace keys when getting a record', function () {
    StoreOther.writeRecordSync('secret', 'their-data');

    const result = Store.getRecordSync('secret');

    assert.strictEqual(result.found, false);
  });

});



// ============================================================================
// 12. SYNC/ASYNC PARITY
// ============================================================================

describe('sync/async parity', function () {

  it('should return identical envelopes for getRecord and getRecordSync', async function () {
    Store.writeRecordSync('parity', 'val');

    const syncResult = Store.getRecordSync('parity');
    const asyncResult = await Store.getRecord('parity');

    assert.deepStrictEqual(syncResult, asyncResult);
  });

  it('should return identical envelopes for writeRecord and writeRecordSync', async function () {
    const syncResult = Store.writeRecordSync('parity-w', 1);
    const asyncResult = await Store.writeRecord('parity-w', 1);

    assert.deepStrictEqual(syncResult, asyncResult);
  });

  it('should return identical envelopes for deleteRecord and deleteRecordSync', async function () {
    Store.writeRecordSync('parity-d', 1);

    const syncResult = Store.deleteRecordSync('parity-d');
    const asyncResult = await Store.deleteRecord('parity-d');

    assert.deepStrictEqual(syncResult, asyncResult);
  });

  it('should return identical envelopes for getRecordExists and getRecordExistsSync', async function () {
    Store.writeRecordSync('parity-h', 1);

    const syncResult = Store.getRecordExistsSync('parity-h');
    const asyncResult = await Store.getRecordExists('parity-h');

    assert.deepStrictEqual(syncResult, asyncResult);
  });

  it('should return identical envelopes for getAllKeys and getAllKeysSync', async function () {
    Store.writeRecordSync('k1', 1);
    Store.writeRecordSync('k2', 2);

    const syncResult = Store.getAllKeysSync();
    const asyncResult = await Store.getAllKeys();

    assert.deepStrictEqual(syncResult, asyncResult);
  });

  it('should return identical envelopes for batchGetRecords and batchGetRecordsSync', async function () {
    Store.writeRecordSync('b1', 1);

    const syncResult = Store.batchGetRecordsSync(['b1', 'missing']);
    const asyncResult = await Store.batchGetRecords(['b1', 'missing']);

    assert.deepStrictEqual(syncResult, asyncResult);
  });

  it('should return identical envelopes for batchWriteRecords and batchWriteRecordsSync', async function () {
    const syncResult = Store.batchWriteRecordsSync({ bw1: 1 });
    const asyncResult = await Store.batchWriteRecords({ bw1: 1 });

    assert.deepStrictEqual(syncResult, asyncResult);
  });

  it('should return identical envelopes for batchDeleteRecords and batchDeleteRecordsSync', async function () {
    Store.writeRecordSync('bd1', 1);

    const syncResult = Store.batchDeleteRecordsSync(['bd1']);
    const asyncResult = await Store.batchDeleteRecords(['bd1']);

    assert.deepStrictEqual(syncResult, asyncResult);
  });

  it('should return identical envelopes for clear and clearSync', async function () {
    Store.writeRecordSync('c1', 1);

    const syncResult = Store.clearSync();
    Store.writeRecordSync('c1', 1);

    const asyncResult = await Store.clear();

    assert.deepStrictEqual(syncResult, asyncResult);
  });

});
