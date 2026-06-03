// Info: Test runner for js-server-helper-distinct-queue-store-mongodb.
//
// Tier 1 - Store contract suite: validates the 4-method contract against the
//          adapter, driven directly on the instantiated store.
// Tier 1 - Adapter-specific tests: edge cases unique to the MongoDB adapter.
// Tier 3 - Core integration: drives the real distinct-queue enqueue/claim/
//          listByPrefix lifecycle through the MongoDB adapter.

'use strict';

const assert = require('node:assert');
const { describe, it, before, beforeEach, after } = require('node:test');

const {
  Lib,
  buildInstance,
  buildStore,
  buildQueue,
  cleanCollection,
  closeMongo
} = require('./loader.js');

const buildContractSuite = require('./store-contract-suite.js');



/********************************************************************
Global teardown - close the shared MongoDB client so node exits.
*********************************************************************/

after(async function () {
  await closeMongo();
});



/********************************************************************
Tier 1 - Store contract suite
*********************************************************************/

describe('store contract', buildContractSuite({
  Lib: Lib,
  buildStore: buildStore,
  buildInstance: buildInstance,
  cleanCollection: cleanCollection
}));



/********************************************************************
Tier 1 - Adapter-specific tests
*********************************************************************/

describe('adapter specific', function () {

  const store = buildStore();

  before(async function () {
    await store.setupNewStore(buildInstance());
  });

  beforeEach(async function () {
    await cleanCollection();
  });


  it('should expose setupNewStore returning a success result', async function () {
    const result = await store.setupNewStore(buildInstance());

    assert.strictEqual(typeof result, 'object');
    assert.strictEqual(typeof result.success, 'boolean');
  });


  it('should handle records with special characters in resource_id', async function () {
    const instance = buildInstance();
    const special_resource_id = 'account.test_resource-with.special:chars';

    const record = {
      tenant_id: 'special_tenant',
      resource_id: special_resource_id,
      data_version: Date.now(),
      random_suffix: Lib.Crypto.generateCompactUUID(),
      payload: { data: 'special' },
      action: 'special_action',
      toc: Date.now()
    };

    const write_result = await store.writeRecord(instance, record);
    assert.strictEqual(write_result.success, true);

    const query_result = await store.queryByResourceId(instance, 'special_tenant', special_resource_id);
    assert.strictEqual(query_result.success, true);
    assert.strictEqual(query_result.records.length, 1);
    assert.strictEqual(query_result.records[0].resource_id, special_resource_id);
  });


  it('should handle large payload objects', async function () {
    const instance = buildInstance();
    const large_payload = {
      data: 'x'.repeat(10000),
      nested: {
        array: Array(100).fill({ item: 'value' }),
        deep: { deeper: { deepest: 'value' } }
      }
    };

    const record = {
      tenant_id: 'large_tenant',
      resource_id: 'large_resource',
      data_version: Date.now(),
      random_suffix: Lib.Crypto.generateCompactUUID(),
      payload: large_payload,
      action: 'large_action',
      toc: Date.now()
    };

    const write_result = await store.writeRecord(instance, record);
    assert.strictEqual(write_result.success, true);

    const query_result = await store.queryByResourceId(instance, 'large_tenant', 'large_resource');
    assert.strictEqual(query_result.success, true);
    assert.strictEqual(query_result.records.length, 1);
    assert.deepStrictEqual(query_result.records[0].payload, large_payload);
  });


  it('should handle concurrent writes for same resource', async function () {
    const instance = buildInstance();
    const tenant_id = 'concurrent_tenant';
    const resource_id = 'concurrent_resource';

    // Fire multiple concurrent writes with unique random suffixes
    const writes = [];
    for (let i = 0; i < 5; i++) {
      writes.push(store.writeRecord(instance, {
        tenant_id: tenant_id,
        resource_id: resource_id,
        data_version: Date.now() + i,
        random_suffix: Lib.Crypto.generateCompactUUID(),
        payload: { index: i },
        action: 'concurrent_action',
        toc: Date.now()
      }));
    }

    const results = await Promise.all(writes);
    results.forEach(function (r) {
      assert.strictEqual(r.success, true);
    });

    // Verify all records were written
    const query_result = await store.queryByResourceId(instance, tenant_id, resource_id);
    assert.strictEqual(query_result.records.length, 5);
  });


  it('should correctly handle prefix queries with regex special characters', async function () {
    const instance = buildInstance();
    const tenant_id = 'regex_tenant';

    // Write records with resource_ids that contain regex special characters
    await store.writeRecord(instance, {
      tenant_id: tenant_id,
      resource_id: 'test.resource.v1',
      data_version: 1000,
      random_suffix: 'aaaa0000',
      payload: {},
      action: 'test',
      toc: 1000
    });

    await store.writeRecord(instance, {
      tenant_id: tenant_id,
      resource_id: 'test+resource+v2',
      data_version: 2000,
      random_suffix: 'bbbb1111',
      payload: {},
      action: 'test',
      toc: 2000
    });

    // Query with prefix containing dot (regex special char)
    const dot_result = await store.queryByResourceIdPrefix(instance, tenant_id, 'test.resource');
    assert.strictEqual(dot_result.records.length, 1);
    assert.strictEqual(dot_result.records[0].resource_id, 'test.resource.v1');

    // Query with prefix containing plus (regex special char)
    const plus_result = await store.queryByResourceIdPrefix(instance, tenant_id, 'test+resource');
    assert.strictEqual(plus_result.records.length, 1);
    assert.strictEqual(plus_result.records[0].resource_id, 'test+resource+v2');
  });

});



/********************************************************************
Tier 3 - Core distinct-queue integration via the MongoDB adapter
*********************************************************************/

describe('core integration (enqueue/claim/listByPrefix)', function () {

  const queue = buildQueue();

  beforeEach(async function () {
    await cleanCollection();
  });


  it('enqueue then claim returns the enqueued payload and action', async function () {
    const instance = buildInstance();
    const tenant_id = 'integ_tenant';
    const resource_id = 'account_1.product_1';

    const enqueue_result = await queue.enqueue(instance, {
      tenant_id: tenant_id,
      resource_id: resource_id,
      payload: { value: 42 },
      action: 'process'
    });
    assert.strictEqual(enqueue_result.success, true);

    const claim_result = await queue.claim(instance, {
      tenant_id: tenant_id,
      resource_id: resource_id
    });
    assert.strictEqual(claim_result.success, true);
    assert.deepStrictEqual(claim_result.payload, { value: 42 });
    assert.strictEqual(claim_result.action, 'process');
  });


  it('claim returns the latest enqueued version for a resource', async function () {
    const instance = buildInstance();
    const tenant_id = 'integ_tenant';
    const resource_id = 'account_1.product_2';

    await queue.enqueue(instance, { tenant_id: tenant_id, resource_id: resource_id, payload: { v: 1 }, action: 'a' });
    // Wait 2ms to guarantee a distinct data_version on the second enqueue
    await new Promise(function (resolve) { setTimeout(resolve, 2); });
    await queue.enqueue(instance, { tenant_id: tenant_id, resource_id: resource_id, payload: { v: 2 }, action: 'b' });

    const claim_result = await queue.claim(instance, { tenant_id: tenant_id, resource_id: resource_id });
    assert.strictEqual(claim_result.success, true);
    assert.strictEqual(claim_result.payload.v, 2);
  });


  it('listByPrefix returns distinct resources under a prefix', async function () {
    const instance = buildInstance();
    const tenant_id = 'integ_tenant';

    await queue.enqueue(instance, { tenant_id: tenant_id, resource_id: 'account_1.product_1', payload: {}, action: 'a' });
    await queue.enqueue(instance, { tenant_id: tenant_id, resource_id: 'account_1.product_2', payload: {}, action: 'a' });
    await queue.enqueue(instance, { tenant_id: tenant_id, resource_id: 'account_2.product_1', payload: {}, action: 'a' });

    const result = await queue.listByPrefix(instance, {
      tenant_id: tenant_id,
      resource_id_prefix: 'account_1.'
    });
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.records.length, 2);
  });

});
