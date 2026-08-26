// Tests for js-server-helper-nosql-mongodb-admin
// Works with both emulated (local MongoDB) and integration (real MongoDB) testing
// Config comes from environment variables via loader.js
'use strict';

const assert = require('node:assert/strict');
const { describe, it, before, after } = require('node:test');
const { MongoClient } = require('mongodb');
const ERRORS = require('../mongodb-admin.errors');

// Load all dependencies and config via test loader (mirrors main project loader pattern)
// process.env is NEVER accessed in test files - only in loader.js
const { Lib, Config, instance, buildLib } = require('./loader')();
const MongoDBAdmin = Lib.MongoDBAdmin;
const Instance = Lib.Instance;

// Test collection names (prefixed with test_ for isolation)
const TEST_COLLECTION = 'test_admin_collection';
const TEST_COLLECTION_2 = 'test_admin_indexes';
const TEST_COLLECTION_3 = 'test_admin_ttl';

// Native client for cleanup operations
let nativeClient = null;
let nativeDb = null;


describe('MongoDBAdmin', { concurrency: false }, function () {


// ============================================================================
// 0. SETUP / TEARDOWN
// ============================================================================

before(async function () {

  // Connect native client for cleanup operations
  nativeClient = new MongoClient(Config.mongodb_connection_string);
  await nativeClient.connect();
  nativeDb = nativeClient.db(Config.mongodb_database);

  // Drop test collections (ignore errors if they don't exist)
  try { await nativeDb.dropCollection(TEST_COLLECTION); } catch (_e) { /* ignore */ }
  try { await nativeDb.dropCollection(TEST_COLLECTION_2); } catch (_e) { /* ignore */ }
  try { await nativeDb.dropCollection(TEST_COLLECTION_3); } catch (_e) { /* ignore */ }

});

after(async function () {

  // Drop test collections
  try { await nativeDb.dropCollection(TEST_COLLECTION); } catch (_e) { /* ignore */ }
  try { await nativeDb.dropCollection(TEST_COLLECTION_2); } catch (_e) { /* ignore */ }
  try { await nativeDb.dropCollection(TEST_COLLECTION_3); } catch (_e) { /* ignore */ }

  // Close connections
  await MongoDBAdmin.close(instance);
  await nativeClient.close();

});


// ============================================================================
// 1. FACTORY PATTERN
// ============================================================================

describe('Factory Pattern', function () {

  it('should create independent instances', function () {

    const { Lib: Lib2 } = require('./loader')();
    const MongoDBAdmin2 = Lib2.MongoDBAdmin;

    assert.notStrictEqual(MongoDBAdmin, MongoDBAdmin2, 'Instances should be independent');
    assert.strictEqual(typeof MongoDBAdmin.createCollection, 'function');
    assert.strictEqual(typeof MongoDBAdmin2.createCollection, 'function');
  });

  it('should have all 7 required methods', function () {

    const methods = [
      'createCollection',
      'createIndexes',
      'enableTtlIndex',
      'deleteCollection',
      'listIndexes',
      'ping',
      'close'
    ];
    methods.forEach(function (m) {
      assert.strictEqual(typeof MongoDBAdmin[m], 'function', 'Should have ' + m);
    });
  });

});


// ============================================================================
// 2. PING
// ============================================================================

describe('ping', function () {

  it('should ping the MongoDB server successfully', async function () {

    const result = await MongoDBAdmin.ping(instance);

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.data.ok, true);
    assert.strictEqual(result.error, null);
  });

});


// ============================================================================
// 3. CREATE COLLECTION
// ============================================================================

describe('createCollection', function () {

  it('should create a new collection', async function () {

    const result = await MongoDBAdmin.createCollection(instance, {
      collection_name: TEST_COLLECTION
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.data.created, true);
    assert.strictEqual(result.error, null);
  });

  it('should be idempotent - second call returns created: false', async function () {

    const result = await MongoDBAdmin.createCollection(instance, {
      collection_name: TEST_COLLECTION
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.data.created, false);
    assert.strictEqual(result.error, null);
  });

  it('should reject with TypeError when options.collection_name is missing', async function () {

    await assert.rejects(
      MongoDBAdmin.createCollection(instance, {}),
      TypeError
    );
  });

  it('should reject with TypeError when options is null', async function () {

    await assert.rejects(
      MongoDBAdmin.createCollection(instance, null),
      TypeError
    );
  });

});


// ============================================================================
// 4. CREATE INDEXES
// ============================================================================

describe('createIndexes', function () {

  it('should create indexes on a collection', async function () {

    // Ensure collection exists first
    await MongoDBAdmin.createCollection(instance, {
      collection_name: TEST_COLLECTION_2
    });

    const result = await MongoDBAdmin.createIndexes(instance, {
      collection_name: TEST_COLLECTION_2,
      indexes: [
        { keys: { email: 1 }, index_options: { name: 'idx_email', unique: true } },
        { keys: { name: 1 }, index_options: { name: 'idx_name' } }
      ]
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.error, null);
    assert.strictEqual(result.data.created.length, 2, 'Both indexes should be newly created');
    assert.strictEqual(result.data.skipped.length, 0, 'No indexes should be skipped on first call');
  });

  it('should be idempotent - second call skips existing indexes', async function () {

    const result = await MongoDBAdmin.createIndexes(instance, {
      collection_name: TEST_COLLECTION_2,
      indexes: [
        { keys: { email: 1 }, index_options: { name: 'idx_email', unique: true } },
        { keys: { name: 1 }, index_options: { name: 'idx_name' } }
      ]
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.error, null);
    assert.strictEqual(result.data.skipped.length, 2, 'Both indexes should be skipped on second call');
    assert.strictEqual(result.data.created.length, 0, 'No indexes should be newly created on second call');
  });

  it('should reject with TypeError when indexes array is empty', async function () {

    await assert.rejects(
      MongoDBAdmin.createIndexes(instance, {
        collection_name: TEST_COLLECTION_2,
        indexes: []
      }),
      TypeError
    );
  });

  it('should reject with TypeError when collection_name is missing', async function () {

    await assert.rejects(
      MongoDBAdmin.createIndexes(instance, {
        indexes: [{ keys: { field: 1 } }]
      }),
      TypeError
    );
  });

});


// ============================================================================
// 5. ENABLE TTL INDEX
// ============================================================================

describe('enableTtlIndex', function () {

  it('should enable a TTL index on a Date field', async function () {

    // Ensure collection exists
    await MongoDBAdmin.createCollection(instance, {
      collection_name: TEST_COLLECTION_3
    });

    const result = await MongoDBAdmin.enableTtlIndex(instance, {
      collection_name: TEST_COLLECTION_3,
      field_name: 'expires_at',
      expire_after_seconds: 3600
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.data.enabled, true);
    assert.strictEqual(result.error, null);
  });

  it('should be idempotent - second call returns enabled: false', async function () {

    const result = await MongoDBAdmin.enableTtlIndex(instance, {
      collection_name: TEST_COLLECTION_3,
      field_name: 'expires_at',
      expire_after_seconds: 3600
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.data.enabled, false);
    assert.strictEqual(result.error, null);
  });

  it('should return ADMIN_TTL_CONFLICT when TTL exists on a different field', async function () {

    const result = await MongoDBAdmin.enableTtlIndex(instance, {
      collection_name: TEST_COLLECTION_3,
      field_name: 'created_at',
      expire_after_seconds: 7200
    });

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.data.enabled, false);
    assert.strictEqual(result.error.type, ERRORS.ADMIN_TTL_CONFLICT.type);
  });

  it('should reject with TypeError when field_name is missing', async function () {

    await assert.rejects(
      MongoDBAdmin.enableTtlIndex(instance, {
        collection_name: TEST_COLLECTION_3,
        expire_after_seconds: 3600
      }),
      TypeError
    );
  });

  it('should reject with TypeError when expire_after_seconds is negative', async function () {

    await assert.rejects(
      MongoDBAdmin.enableTtlIndex(instance, {
        collection_name: TEST_COLLECTION_3,
        field_name: 'expires_at',
        expire_after_seconds: -1
      }),
      TypeError
    );
  });

});


// ============================================================================
// 6. LIST INDEXES
// ============================================================================

describe('listIndexes', function () {

  it('should list indexes on a collection', async function () {

    const result = await MongoDBAdmin.listIndexes(instance, {
      collection_name: TEST_COLLECTION_2
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.error, null);
    assert.ok(Array.isArray(result.data.indexes));
    assert.strictEqual(result.data.indexes.length, 3, 'Should have _id_ + idx_email + idx_name');
  });

  it('should reject with TypeError when collection_name is missing', async function () {

    await assert.rejects(
      MongoDBAdmin.listIndexes(instance, {}),
      TypeError
    );
  });

});


// ============================================================================
// 7. DELETE COLLECTION
// ============================================================================

describe('deleteCollection', function () {

  it('should delete an existing collection', async function () {

    // Create a collection to delete
    const drop_name = 'test_admin_drop_target';
    await MongoDBAdmin.createCollection(instance, {
      collection_name: drop_name
    });

    const result = await MongoDBAdmin.deleteCollection(instance, {
      collection_name: drop_name
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.data.dropped, true);
    assert.strictEqual(result.error, null);
  });

  it('should be idempotent - deleting missing collection returns dropped: false', async function () {

    const result = await MongoDBAdmin.deleteCollection(instance, {
      collection_name: 'test_admin_nonexistent_collection'
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.data.dropped, false);
    assert.strictEqual(result.error, null);
  });

  it('should reject with TypeError when collection_name is missing', async function () {

    await assert.rejects(
      MongoDBAdmin.deleteCollection(instance, {}),
      TypeError
    );
  });

});


// ============================================================================
// 8. CONFIG VALIDATION
// ============================================================================

describe('Config Validation', function () {

  it('should throw TypeError when CONNECTION_STRING is null', function () {

    assert.throws(function () {
      require('helper-nosql-mongodb-admin')(Lib, {
        CONNECTION_STRING: null,
        DATABASE_NAME: 'test'
      });
    }, TypeError);
  });

  it('should throw TypeError when DATABASE_NAME is null', function () {

    assert.throws(function () {
      require('helper-nosql-mongodb-admin')(Lib, {
        CONNECTION_STRING: 'mongodb://localhost:27018',
        DATABASE_NAME: null
      });
    }, TypeError);
  });

  it('should throw TypeError when CONNECT_TIMEOUT_MS is not a number', function () {

    assert.throws(function () {
      require('helper-nosql-mongodb-admin')(Lib, {
        CONNECTION_STRING: 'mongodb://localhost:27018',
        DATABASE_NAME: 'test',
        CONNECT_TIMEOUT_MS: 'fast'
      });
    }, TypeError);
  });

});


// ============================================================================
// 9. CLOSE
// ============================================================================

describe('close', function () {

  it('should close the admin connection successfully', async function () {

    const result = await MongoDBAdmin.close(instance);

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.error, null);
  });

  it('should be idempotent - closing already-closed connection succeeds', async function () {

    const result = await MongoDBAdmin.close(instance);

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.error, null);
  });

});


// ============================================================================
// 10. OPERATIONAL FAILURE - WRONG PORT
// ============================================================================

describe('Operational Failure', function () {

  it('should return error envelope (not throw) when connection fails', async function () {

    // Create an instance with a wrong port
    const badAdmin = require('helper-nosql-mongodb-admin')(Lib, {
      CONNECTION_STRING: 'mongodb://127.0.0.1:9999',
      DATABASE_NAME: 'test',
      CONNECT_TIMEOUT_MS: 1000
    });

    const result = await badAdmin.ping(instance);

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.data.ok, false);
    assert.strictEqual(result.error.type, ERRORS.ADMIN_CONNECTION_FAILED.type);

    // Clean up
    await badAdmin.close(instance);
  });

});

});

// ============================================================================
// 7. Connection lifecycle - registration, persistent vs serverless, background gate
// ============================================================================

describe('connection lifecycle', function () {

  it('should register the process cleanup routine once, not per call', async function () {

    const { Lib: LibF, instance: instF } = buildLib({ CLOSE_ON_CLEANUP: false });
    const MongoDBAdminF = LibF.MongoDBAdmin;
    const InstanceF = LibF.Instance;

    await MongoDBAdminF.ping(instF);
    await MongoDBAdminF.ping(instF);

    assert.strictEqual(InstanceF.getProcessCleanupRoutineCount(), 1);

    await InstanceF.runProcessCleanup();

  });


  it('should hold the client open on a persistent deployment', async function () {

    const { Lib: LibP, instance: instP } = buildLib({ CLOSE_ON_CLEANUP: false });
    const MongoDBAdminP = LibP.MongoDBAdmin;
    const InstanceP = LibP.Instance;

    const res1 = await MongoDBAdminP.ping(instP);
    assert.strictEqual(res1.success, true);

    await InstanceP.runInstanceCleanup(instP);

    const res2 = await MongoDBAdminP.ping(instP);
    assert.strictEqual(res2.success, true);

    await InstanceP.runProcessCleanup();

  });


  it('should close the client on a serverless deployment and re-open on next call', async function () {

    const { Lib: LibSL, instance: instSL } = buildLib({ CLOSE_ON_CLEANUP: true });
    const MongoDBAdminSL = LibSL.MongoDBAdmin;
    const InstanceSL = LibSL.Instance;

    const res1 = await MongoDBAdminSL.ping(instSL);
    assert.strictEqual(res1.success, true);

    await InstanceSL.runInstanceCleanup(instSL);

    assert.strictEqual(InstanceSL.getProcessCleanupRoutineCount(), 0);

    const res2 = await MongoDBAdminSL.ping(instSL);
    assert.strictEqual(res2.success, true);

    await InstanceSL.runInstanceCleanup(instSL);

  });


  it('should close and re-register across multiple serverless request cycles', async function () {

    const { Lib: LibSL, instance: instSL } = buildLib({ CLOSE_ON_CLEANUP: true });
    const MongoDBAdminSL = LibSL.MongoDBAdmin;
    const InstanceSL = LibSL.Instance;

    for (let i = 0; i < 3; i++) {
      const res = await MongoDBAdminSL.ping(instSL);
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
