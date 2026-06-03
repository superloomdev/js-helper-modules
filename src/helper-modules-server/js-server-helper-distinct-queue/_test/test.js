// Tests for js-server-helper-distinct-queue
// Offline module - storage adapter is injected per-test (in-memory implementation).
// process.env is NEVER accessed in test files - only in loader.js
'use strict';

const assert = require('node:assert/strict');
const { describe, it } = require('node:test');

// Load all dependencies via test loader (mirrors main project loader pattern)
const { Lib } = require('./loader')();

// Distinct-queue module under test - constructed per-case with its own adapter
const DistinctQueueFactory = require('helper-distinct-queue');

// In-process Map-backed store fixture (Tier-2 enabler)
const createMemoryStore = require('./memory-store');


// Helper - shorthand to construct a distinct-queue instance backed by an
// injected store fixture. The inline factory receives (Lib, CONFIG, ERRORS)
// and returns the pre-built store object directly.
const buildQueue = function (store) {
  return DistinctQueueFactory(Lib, {
    STORE: function injectFactory () { return store; },
    STORE_CONFIG: {}
  });
};


const validBaseConfig = function () {
  return {
    STORE:        function () { return createMemoryStore(); },
    STORE_CONFIG: {}
  };
};


// Build an adapter that returns failure for every method - used to test
// error propagation paths through the distinct-queue module.
const createFailingStore = function () {

  return {

    writeRecord: async function () {
      return {
        success: false,
        error: { type: 'STORE_WRITE_FAILED', message: 'write failed (test fixture)' }
      };
    },

    queryByResourceId: async function () {
      return {
        success: false,
        records: [],
        error: { type: 'STORE_READ_FAILED', message: 'read failed (test fixture)' }
      };
    },

    deleteByDataVersionLte: async function () {
      return {
        success: false,
        error: { type: 'STORE_DELETE_FAILED', message: 'delete failed (test fixture)' }
      };
    },

    queryByResourceIdPrefix: async function () {
      return {
        success: false,
        records: [],
        error: { type: 'STORE_READ_FAILED', message: 'read failed (test fixture)' }
      };
    }

  };

};


// Build a fresh instance with a known time for deterministic tests.
const makeInstance = function (time_override) {
  const instance = Lib.Instance.initialize();
  if (time_override !== undefined) {
    instance['time'] = time_override;
  }
  return instance;
};


// Default enqueue options helper
const defaultEnqueueOptions = function (overrides) {
  return Object.assign({
    tenant_id: 'tenant-A',
    resource_id: 'account.1.catalog.2.product.3',
    payload: { product_data: 'some_value' },
    action: 'sync-catalog'
  }, overrides || {});
};



// ============================================================================
// 1. LOADER VALIDATION
// ============================================================================

describe('Loader validation', function () {

  it('throws when CONFIG.STORE is missing', function () {
    assert.throws(function () {
      DistinctQueueFactory(Lib, {});
    }, /CONFIG\.STORE is required/);
  });

  it('throws when CONFIG.STORE is not a function', function () {
    assert.throws(function () {
      DistinctQueueFactory(Lib, {
        STORE: 'not-a-function',
        STORE_CONFIG: {}
      });
    }, /CONFIG\.STORE is required and must be a store factory function/);
  });

  it('throws when CONFIG.STORE_CONFIG is missing', function () {
    assert.throws(function () {
      DistinctQueueFactory(Lib, {
        STORE: function () { return createMemoryStore(); }
      });
    }, /CONFIG\.STORE_CONFIG is required/);
  });

  it('throws when CONFIG.STORE_CONFIG is not an object', function () {
    assert.throws(function () {
      DistinctQueueFactory(Lib, {
        STORE: function () { return createMemoryStore(); },
        STORE_CONFIG: 'not-an-object'
      });
    }, /CONFIG\.STORE_CONFIG must be a plain object/);
  });

  it('throws when store is missing a required method', function () {

    const partialStore = {
      writeRecord: async function () {},
      queryByResourceId: async function () {},
      deleteByDataVersionLte: async function () {}
      // missing queryByResourceIdPrefix
    };

    assert.throws(function () {
      DistinctQueueFactory(Lib, {
        STORE: function () { return partialStore; },
        STORE_CONFIG: {}
      });
    }, /Invalid store contract: missing method `queryByResourceIdPrefix`/);

  });

  it('throws when store method is not a function', function () {

    const badStore = {
      writeRecord: async function () {},
      queryByResourceId: 'not-a-function',
      deleteByDataVersionLte: async function () {},
      queryByResourceIdPrefix: async function () {}
    };

    assert.throws(function () {
      DistinctQueueFactory(Lib, {
        STORE: function () { return badStore; },
        STORE_CONFIG: {}
      });
    }, /Invalid store contract: missing method `queryByResourceId`/);

  });

  it('constructs successfully with valid config and store', function () {
    const queue = DistinctQueueFactory(Lib, validBaseConfig());
    assert.ok(queue);
    assert.equal(typeof queue.enqueue, 'function');
    assert.equal(typeof queue.claim, 'function');
    assert.equal(typeof queue.listByPrefix, 'function');
  });

});



// ============================================================================
// 2. ENQUEUE
// ============================================================================

describe('enqueue', function () {

  it('writes a record and returns success', async function () {
    const store = createMemoryStore();
    const queue = buildQueue(store);
    const instance = makeInstance();

    const result = await queue.enqueue(instance, defaultEnqueueOptions());

    assert.equal(result.success, true);
    assert.equal(result.error, null);
    assert.equal(store._records.length, 1);
  });

  it('stores the correct fields on the record', async function () {
    const store = createMemoryStore();
    const queue = buildQueue(store);
    const instance = makeInstance();

    await queue.enqueue(instance, defaultEnqueueOptions({
      tenant_id: 'tenant-X',
      resource_id: 'res.1',
      payload: { key: 'val' },
      action: 'do-thing'
    }));

    const record = store._records[0];
    assert.equal(record.tenant_id, 'tenant-X');
    assert.equal(record.resource_id, 'res.1');
    assert.deepEqual(record.payload, { key: 'val' });
    assert.equal(record.action, 'do-thing');
    assert.equal(typeof record.data_version, 'number');
    assert.ok(record.data_version > 0);
    assert.equal(record.toc, record.data_version);
    assert.equal(typeof record.random_suffix, 'string');
    assert.ok(record.random_suffix.length > 0);
  });

  it('generates unique random_suffix values for multiple enqueues', async function () {
    const store = createMemoryStore();
    const queue = buildQueue(store);
    const instance = makeInstance();

    await queue.enqueue(instance, defaultEnqueueOptions());
    await queue.enqueue(instance, defaultEnqueueOptions());
    await queue.enqueue(instance, defaultEnqueueOptions());

    const suffixes = store._records.map(function (r) { return r.random_suffix; });
    const unique_suffixes = new Set(suffixes);
    assert.equal(unique_suffixes.size, 3, 'Each enqueue must produce a unique random_suffix');
  });

  it('returns SERVICE_UNAVAILABLE when store write fails', async function () {
    const store = createFailingStore();
    const queue = buildQueue(store);
    const instance = makeInstance();

    const result = await queue.enqueue(instance, defaultEnqueueOptions());

    assert.equal(result.success, false);
    assert.equal(result.error.type, 'DISTINCT_QUEUE_SERVICE_UNAVAILABLE');
  });

  it('returns SERVICE_UNAVAILABLE when store write throws', async function () {
    const store = createMemoryStore();
    store.writeRecord = async function () { throw new Error('boom'); };
    const queue = buildQueue(store);
    const instance = makeInstance();

    const result = await queue.enqueue(instance, defaultEnqueueOptions());

    assert.equal(result.success, false);
    assert.equal(result.error.type, 'DISTINCT_QUEUE_SERVICE_UNAVAILABLE');
  });

  // Options validation

  it('throws TypeError when options is missing', async function () {
    const queue = buildQueue(createMemoryStore());
    const instance = makeInstance();
    await assert.rejects(
      function () { return queue.enqueue(instance); },
      { name: 'TypeError', message: /options object is required/ }
    );
  });

  it('throws TypeError when tenant_id is missing', async function () {
    const queue = buildQueue(createMemoryStore());
    const instance = makeInstance();
    await assert.rejects(
      function () { return queue.enqueue(instance, defaultEnqueueOptions({ tenant_id: '' })); },
      { name: 'TypeError', message: /options\.tenant_id is required/ }
    );
  });

  it('throws TypeError when resource_id is missing', async function () {
    const queue = buildQueue(createMemoryStore());
    const instance = makeInstance();
    await assert.rejects(
      function () { return queue.enqueue(instance, defaultEnqueueOptions({ resource_id: '' })); },
      { name: 'TypeError', message: /options\.resource_id is required/ }
    );
  });

  it('throws TypeError when payload is missing', async function () {
    const queue = buildQueue(createMemoryStore());
    const instance = makeInstance();
    await assert.rejects(
      function () { return queue.enqueue(instance, defaultEnqueueOptions({ payload: null })); },
      { name: 'TypeError', message: /options\.payload is required/ }
    );
  });

  it('throws TypeError when action is missing', async function () {
    const queue = buildQueue(createMemoryStore());
    const instance = makeInstance();
    await assert.rejects(
      function () { return queue.enqueue(instance, defaultEnqueueOptions({ action: '' })); },
      { name: 'TypeError', message: /options\.action is required/ }
    );
  });

});



// ============================================================================
// 3. CLAIM
// ============================================================================

describe('claim', function () {

  it('returns null payload when no records exist', async function () {
    const store = createMemoryStore();
    const queue = buildQueue(store);
    const instance = makeInstance();

    const result = await queue.claim(instance, {
      tenant_id: 'tenant-A',
      resource_id: 'nonexistent'
    });

    assert.equal(result.success, true);
    assert.equal(result.payload, null);
    assert.equal(result.action, null);
    assert.equal(result.error, null);
  });

  it('claims the single record when only one exists', async function () {
    const store = createMemoryStore();
    const queue = buildQueue(store);
    const instance = makeInstance();

    await queue.enqueue(instance, defaultEnqueueOptions({
      payload: { val: 'only-one' },
      action: 'sync-it'
    }));

    const result = await queue.claim(instance, {
      tenant_id: 'tenant-A',
      resource_id: 'account.1.catalog.2.product.3'
    });

    assert.equal(result.success, true);
    assert.deepEqual(result.payload, { val: 'only-one' });
    assert.equal(result.action, 'sync-it');
    assert.equal(result.error, null);
    // Record should be deleted
    assert.equal(store._records.length, 0);
  });

  it('claims the latest record when multiple exist', async function () {
    const store = createMemoryStore();
    const queue = buildQueue(store);
    const instance = makeInstance();

    // Enqueue 3 records. We insert raw records with known data_versions
    // to control ordering deterministically.
    store._records.push({
      tenant_id: 'tenant-A',
      resource_id: 'res.1',
      random_suffix: 'aaaa',
      data_version: 1000000000001,
      payload: { val: 'old' },
      action: 'sync',
      toc: 1000000000001
    });
    store._records.push({
      tenant_id: 'tenant-A',
      resource_id: 'res.1',
      random_suffix: 'cccc',
      data_version: 1000000000003,
      payload: { val: 'newest' },
      action: 'sync',
      toc: 1000000000003
    });
    store._records.push({
      tenant_id: 'tenant-A',
      resource_id: 'res.1',
      random_suffix: 'bbbb',
      data_version: 1000000000002,
      payload: { val: 'middle' },
      action: 'sync',
      toc: 1000000000002
    });

    const result = await queue.claim(instance, {
      tenant_id: 'tenant-A',
      resource_id: 'res.1'
    });

    assert.equal(result.success, true);
    assert.deepEqual(result.payload, { val: 'newest' });
    // All 3 records should be deleted (all <= winner's data_version)
    assert.equal(store._records.length, 0);
  });

  it('does not delete records from other tenants or resources', async function () {
    const store = createMemoryStore();
    const queue = buildQueue(store);
    const instance = makeInstance();

    // Record for same tenant, different resource
    store._records.push({
      tenant_id: 'tenant-A',
      resource_id: 'res.other',
      random_suffix: 'aaaa',
      data_version: 1000000000001,
      payload: { val: 'other-resource' },
      action: 'sync',
      toc: 1000000000001
    });

    // Record for different tenant, same resource
    store._records.push({
      tenant_id: 'tenant-B',
      resource_id: 'res.1',
      random_suffix: 'aaaa',
      data_version: 1000000000001,
      payload: { val: 'other-tenant' },
      action: 'sync',
      toc: 1000000000001
    });

    // Target record
    store._records.push({
      tenant_id: 'tenant-A',
      resource_id: 'res.1',
      random_suffix: 'bbbb',
      data_version: 1000000000002,
      payload: { val: 'target' },
      action: 'sync',
      toc: 1000000000002
    });

    await queue.claim(instance, {
      tenant_id: 'tenant-A',
      resource_id: 'res.1'
    });

    // Only the target should be deleted; other 2 remain
    assert.equal(store._records.length, 2);
    assert.equal(store._records[0].payload.val, 'other-resource');
    assert.equal(store._records[1].payload.val, 'other-tenant');
  });

  it('returns SERVICE_UNAVAILABLE when query fails', async function () {
    const store = createFailingStore();
    const queue = buildQueue(store);
    const instance = makeInstance();

    const result = await queue.claim(instance, {
      tenant_id: 'tenant-A',
      resource_id: 'res.1'
    });

    assert.equal(result.success, false);
    assert.equal(result.payload, null);
    assert.equal(result.error.type, 'DISTINCT_QUEUE_SERVICE_UNAVAILABLE');
  });

  it('returns SERVICE_UNAVAILABLE when store throws', async function () {
    const store = createMemoryStore();
    store.queryByResourceId = async function () { throw new Error('boom'); };
    const queue = buildQueue(store);
    const instance = makeInstance();

    const result = await queue.claim(instance, {
      tenant_id: 'tenant-A',
      resource_id: 'res.1'
    });

    assert.equal(result.success, false);
    assert.equal(result.payload, null);
    assert.equal(result.error.type, 'DISTINCT_QUEUE_SERVICE_UNAVAILABLE');
  });

  it('still claims successfully when delete fails (non-fatal)', async function () {
    const store = createMemoryStore();
    store.deleteByDataVersionLte = async function () {
      return { success: false, error: { type: 'DELETE_FAILED', message: 'oops' } };
    };
    const queue = buildQueue(store);
    const instance = makeInstance();

    store._records.push({
      tenant_id: 'tenant-A',
      resource_id: 'res.1',
      random_suffix: 'aaaa',
      data_version: 1000000000001,
      payload: { val: 'data' },
      action: 'sync',
      toc: 1000000000001
    });

    const result = await queue.claim(instance, {
      tenant_id: 'tenant-A',
      resource_id: 'res.1'
    });

    // Claim still succeeds even though delete failed
    assert.equal(result.success, true);
    assert.deepEqual(result.payload, { val: 'data' });
  });

  // Options validation

  it('throws TypeError when options is missing', async function () {
    const queue = buildQueue(createMemoryStore());
    const instance = makeInstance();
    await assert.rejects(
      function () { return queue.claim(instance); },
      { name: 'TypeError', message: /options object is required/ }
    );
  });

  it('throws TypeError when tenant_id is missing', async function () {
    const queue = buildQueue(createMemoryStore());
    const instance = makeInstance();
    await assert.rejects(
      function () { return queue.claim(instance, { resource_id: 'res.1' }); },
      { name: 'TypeError', message: /options\.tenant_id is required/ }
    );
  });

  it('throws TypeError when resource_id is missing', async function () {
    const queue = buildQueue(createMemoryStore());
    const instance = makeInstance();
    await assert.rejects(
      function () { return queue.claim(instance, { tenant_id: 'tenant-A' }); },
      { name: 'TypeError', message: /options\.resource_id is required/ }
    );
  });

});



// ============================================================================
// 4. LIST BY PREFIX
// ============================================================================

describe('listByPrefix', function () {

  it('returns matching records for a prefix', async function () {
    const store = createMemoryStore();
    const queue = buildQueue(store);
    const instance = makeInstance();

    store._records.push({
      tenant_id: 'tenant-A',
      resource_id: 'account.1.catalog.2.product.1',
      random_suffix: 'aaaa',
      data_version: 1000000000001,
      payload: { val: 'product-1' },
      action: 'sync',
      toc: 1000000000001
    });
    store._records.push({
      tenant_id: 'tenant-A',
      resource_id: 'account.1.catalog.2.product.2',
      random_suffix: 'bbbb',
      data_version: 1000000000002,
      payload: { val: 'product-2' },
      action: 'sync',
      toc: 1000000000002
    });
    store._records.push({
      tenant_id: 'tenant-A',
      resource_id: 'account.1.catalog.3.product.1',
      random_suffix: 'cccc',
      data_version: 1000000000003,
      payload: { val: 'different-catalog' },
      action: 'sync',
      toc: 1000000000003
    });

    const result = await queue.listByPrefix(instance, {
      tenant_id: 'tenant-A',
      resource_id_prefix: 'account.1.catalog.2'
    });

    assert.equal(result.success, true);
    assert.equal(result.records.length, 2);
    assert.equal(result.error, null);
  });

  it('returns empty array when no records match', async function () {
    const store = createMemoryStore();
    const queue = buildQueue(store);
    const instance = makeInstance();

    const result = await queue.listByPrefix(instance, {
      tenant_id: 'tenant-A',
      resource_id_prefix: 'nonexistent'
    });

    assert.equal(result.success, true);
    assert.equal(result.records.length, 0);
    assert.equal(result.error, null);
  });

  it('only returns records for the specified tenant', async function () {
    const store = createMemoryStore();
    const queue = buildQueue(store);
    const instance = makeInstance();

    store._records.push({
      tenant_id: 'tenant-A',
      resource_id: 'res.1',
      random_suffix: 'aaaa',
      data_version: 1000000000001,
      payload: { val: 'tenant-A' },
      action: 'sync',
      toc: 1000000000001
    });
    store._records.push({
      tenant_id: 'tenant-B',
      resource_id: 'res.1',
      random_suffix: 'bbbb',
      data_version: 1000000000002,
      payload: { val: 'tenant-B' },
      action: 'sync',
      toc: 1000000000002
    });

    const result = await queue.listByPrefix(instance, {
      tenant_id: 'tenant-A',
      resource_id_prefix: 'res'
    });

    assert.equal(result.records.length, 1);
    assert.equal(result.records[0].payload.val, 'tenant-A');
  });

  it('returns SERVICE_UNAVAILABLE when query fails', async function () {
    const store = createFailingStore();
    const queue = buildQueue(store);
    const instance = makeInstance();

    const result = await queue.listByPrefix(instance, {
      tenant_id: 'tenant-A',
      resource_id_prefix: 'res'
    });

    assert.equal(result.success, false);
    assert.equal(result.records.length, 0);
    assert.equal(result.error.type, 'DISTINCT_QUEUE_SERVICE_UNAVAILABLE');
  });

  it('returns SERVICE_UNAVAILABLE when store throws', async function () {
    const store = createMemoryStore();
    store.queryByResourceIdPrefix = async function () { throw new Error('boom'); };
    const queue = buildQueue(store);
    const instance = makeInstance();

    const result = await queue.listByPrefix(instance, {
      tenant_id: 'tenant-A',
      resource_id_prefix: 'res'
    });

    assert.equal(result.success, false);
    assert.equal(result.error.type, 'DISTINCT_QUEUE_SERVICE_UNAVAILABLE');
  });

  // Options validation

  it('throws TypeError when options is missing', async function () {
    const queue = buildQueue(createMemoryStore());
    const instance = makeInstance();
    await assert.rejects(
      function () { return queue.listByPrefix(instance); },
      { name: 'TypeError', message: /options object is required/ }
    );
  });

  it('throws TypeError when resource_id_prefix is missing', async function () {
    const queue = buildQueue(createMemoryStore());
    const instance = makeInstance();
    await assert.rejects(
      function () {
        return queue.listByPrefix(instance, {
          tenant_id: 'tenant-A'
        });
      },
      { name: 'TypeError', message: /options\.resource_id_prefix is required/ }
    );
  });

});



// ============================================================================
// 5. END-TO-END FLOW (enqueue -> claim)
// ============================================================================

describe('end-to-end flow', function () {

  it('enqueue -> claim -> second claim returns null', async function () {
    const store = createMemoryStore();
    const queue = buildQueue(store);
    const instance = makeInstance();

    // Enqueue a job
    const enqueue_result = await queue.enqueue(instance, defaultEnqueueOptions());
    assert.equal(enqueue_result.success, true);

    // Claim it
    const claim_result = await queue.claim(instance, {
      tenant_id: 'tenant-A',
      resource_id: 'account.1.catalog.2.product.3'
    });
    assert.equal(claim_result.success, true);
    assert.ok(claim_result.payload !== null);
    assert.equal(store._records.length, 0);

    // Second claim returns null - nothing left
    const claim2 = await queue.claim(instance, {
      tenant_id: 'tenant-A',
      resource_id: 'account.1.catalog.2.product.3'
    });
    assert.equal(claim2.success, true);
    assert.equal(claim2.payload, null);
  });

  it('claim picks latest, second claim finds record enqueued during first claim', async function () {
    const store = createMemoryStore();
    const queue = buildQueue(store);
    const instance = makeInstance();

    // Insert two records: one old, one newer
    store._records.push({
      tenant_id: 'tenant-A',
      resource_id: 'account.1.catalog.2.product.3',
      random_suffix: 'aaaa',
      data_version: 1000000000001,
      payload: { v: 1 },
      action: 'sync-catalog',
      toc: 1000000000001
    });
    store._records.push({
      tenant_id: 'tenant-A',
      resource_id: 'account.1.catalog.2.product.3',
      random_suffix: 'bbbb',
      data_version: 1000000000002,
      payload: { v: 2 },
      action: 'sync-catalog',
      toc: 1000000000002
    });

    // Claim picks the latest (v:2), deletes both (both <= 1000000000002)
    const claim_result = await queue.claim(instance, {
      tenant_id: 'tenant-A',
      resource_id: 'account.1.catalog.2.product.3'
    });
    assert.deepEqual(claim_result.payload, { v: 2 });

    // Simulate a new job arriving after the first claim
    store._records.push({
      tenant_id: 'tenant-A',
      resource_id: 'account.1.catalog.2.product.3',
      random_suffix: 'cccc',
      data_version: 1000000000003,
      payload: { v: 3 },
      action: 'sync-catalog',
      toc: 1000000000003
    });

    // Next claim picks the new record
    const claim2 = await queue.claim(instance, {
      tenant_id: 'tenant-A',
      resource_id: 'account.1.catalog.2.product.3'
    });
    assert.deepEqual(claim2.payload, { v: 3 });
    assert.equal(store._records.length, 0);
  });

  it('multiple resources under same tenant are independent', async function () {
    const store = createMemoryStore();
    const queue = buildQueue(store);
    const instance = makeInstance();

    await queue.enqueue(instance, defaultEnqueueOptions({
      resource_id: 'res.A',
      payload: { val: 'A' }
    }));
    await queue.enqueue(instance, defaultEnqueueOptions({
      resource_id: 'res.B',
      payload: { val: 'B' }
    }));

    // Claim res.A
    const claim_a = await queue.claim(instance, {
      tenant_id: 'tenant-A',
      resource_id: 'res.A'
    });
    assert.ok(claim_a.payload !== null);
    assert.deepEqual(claim_a.payload, { val: 'A' });

    // res.B should still be claimable
    const claim_b = await queue.claim(instance, {
      tenant_id: 'tenant-A',
      resource_id: 'res.B'
    });
    assert.ok(claim_b.payload !== null);
    assert.deepEqual(claim_b.payload, { val: 'B' });
  });

  it('rapid burst of 10 enqueues, claim returns only the latest', async function () {
    const store = createMemoryStore();
    const queue = buildQueue(store);
    const instance = makeInstance();

    // Simulate rapid burst - insert with incrementing data_versions
    for (let i = 0; i < 10; i++) {
      store._records.push({
        tenant_id: 'tenant-A',
        resource_id: 'res.burst',
        random_suffix: String(i).padStart(4, '0'),
        data_version: 1000000000000 + i,
        payload: { burst_index: i },
        action: 'sync',
        toc: 1000000000000 + i
      });
    }

    const result = await queue.claim(instance, {
      tenant_id: 'tenant-A',
      resource_id: 'res.burst'
    });

    assert.ok(result.payload !== null);
    assert.deepEqual(result.payload, { burst_index: 9 });
    // All 10 records should be deleted
    assert.equal(store._records.length, 0);
  });

});



// ============================================================================
// 6. SAME-MILLISECOND TIE BREAKING
// ============================================================================

describe('same-millisecond tie breaking', function () {

  it('picks the record with the lexicographically larger random_suffix on tie', async function () {
    const store = createMemoryStore();
    const queue = buildQueue(store);
    const instance = makeInstance();

    const same_dv = 1000000000001;

    store._records.push({
      tenant_id: 'tenant-A',
      resource_id: 'res.1',
      random_suffix: 'aaaa',
      data_version: same_dv,
      payload: { val: 'first' },
      action: 'sync',
      toc: same_dv
    });
    store._records.push({
      tenant_id: 'tenant-A',
      resource_id: 'res.1',
      random_suffix: 'zzzz',
      data_version: same_dv,
      payload: { val: 'second-wins' },
      action: 'sync',
      toc: same_dv
    });

    const result = await queue.claim(instance, {
      tenant_id: 'tenant-A',
      resource_id: 'res.1'
    });

    assert.ok(result.payload !== null);
    assert.deepEqual(result.payload, { val: 'second-wins' });
    // Both deleted (same data_version)
    assert.equal(store._records.length, 0);
  });

});
