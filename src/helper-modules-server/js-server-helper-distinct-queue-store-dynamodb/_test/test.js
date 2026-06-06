// Info: Test runner for js-server-helper-distinct-queue-store-dynamodb.
//
// Tier 1 - Store contract suite: validates the 4-method contract against the
//          adapter, driven directly on the instantiated store.
// Tier 1 - Adapter-specific tests: edge cases unique to the DynamoDB adapter.
// Tier 3 - Core integration: drives the real distinct-queue enqueue/claim/
//          listByPrefix lifecycle through the DynamoDB adapter.

'use strict';

const assert = require('node:assert');
const { describe, it, before, beforeEach, after } = require('node:test');

const {
  Lib,
  buildInstance,
  buildStore,
  buildQueue,
  cleanTable,
  closeDynamoDB
} = require('./loader.js');

const buildContractSuite = require('./store-contract-suite.js');



/********************************************************************
Global teardown - cleanup after tests.
*********************************************************************/

after(async function () {
  await closeDynamoDB();
});



/********************************************************************
Tier 1 - Store contract suite
*********************************************************************/

describe('store contract', buildContractSuite({
  Lib: Lib,
  buildStore: buildStore,
  buildInstance: buildInstance,
  cleanTable: cleanTable
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
    await cleanTable();
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
      request_id: Lib.Crypto.generateCompactUUID(),
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
      request_id: Lib.Crypto.generateCompactUUID(),
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

    // Fire multiple concurrent writes with unique request IDs
    const writes = [];
    for (let i = 0; i < 5; i++) {
      writes.push(store.writeRecord(instance, {
        tenant_id: tenant_id,
        resource_id: resource_id,
        data_version: Date.now() + i,
        request_id: Lib.Crypto.generateCompactUUID(),
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


  it('should correctly handle prefix queries with hierarchical resource_ids', async function () {
    const instance = buildInstance();
    const tenant_id = 'hier_tenant';

    // Write records with hierarchical resource_ids
    await store.writeRecord(instance, {
      tenant_id: tenant_id,
      resource_id: 'org_1.dept_1.team_1',
      data_version: 1000,
      request_id: 'aaaa0000',
      payload: {},
      action: 'test',
      toc: 1000
    });

    await store.writeRecord(instance, {
      tenant_id: tenant_id,
      resource_id: 'org_1.dept_1.team_2',
      data_version: 2000,
      request_id: 'bbbb1111',
      payload: {},
      action: 'test',
      toc: 2000
    });

    await store.writeRecord(instance, {
      tenant_id: tenant_id,
      resource_id: 'org_1.dept_2.team_1',
      data_version: 3000,
      request_id: 'cccc2222',
      payload: {},
      action: 'test',
      toc: 3000
    });

    // Query at different levels
    const org_result = await store.queryByResourceIdPrefix(instance, tenant_id, 'org_1.');
    assert.strictEqual(org_result.records.length, 3);

    const dept_result = await store.queryByResourceIdPrefix(instance, tenant_id, 'org_1.dept_1.');
    assert.strictEqual(dept_result.records.length, 2);

    const team_result = await store.queryByResourceIdPrefix(instance, tenant_id, 'org_1.dept_1.team_1');
    assert.strictEqual(team_result.records.length, 1);
  });


  it('should handle empty batch delete gracefully', async function () {
    const instance = buildInstance();
    const tenant_id = 'empty_delete_tenant';
    const resource_id = 'empty_delete_resource';

    // Write a record
    await store.writeRecord(instance, {
      tenant_id: tenant_id,
      resource_id: resource_id,
      data_version: 5000,
      request_id: 'aaaa0000',
      payload: {},
      action: 'test',
      toc: 5000
    });

    // Delete with boundary below the record's data_version
    const delete_result = await store.deleteByDataVersionLte(instance, tenant_id, resource_id, 1000);
    assert.strictEqual(delete_result.success, true);

    // Verify record still exists
    const query_result = await store.queryByResourceId(instance, tenant_id, resource_id);
    assert.strictEqual(query_result.records.length, 1);
  });

});



/********************************************************************
Tier 3 - Core distinct-queue integration via the DynamoDB adapter
*********************************************************************/

describe('core integration (enqueue/claim/listByPrefix)', function () {

  const queue = buildQueue();

  beforeEach(async function () {
    await cleanTable();
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


  it('claim returns the later write when enqueues are in distinct milliseconds, then coalesces', async function () {
    const instance = buildInstance();
    const tenant_id = 'integ_tenant';
    const resource_id = 'account_1.product_2';

    // data_version has millisecond granularity, so "latest wins" is only
    // well-defined across distinct milliseconds. A >=1ms gap guarantees the
    // second enqueue gets a strictly higher data_version. Without the gap the
    // two writes could share a millisecond, in which case the winner is
    // indeterminate by design (see core data-model.md).
    await queue.enqueue(instance, { tenant_id: tenant_id, resource_id: resource_id, payload: { v: 1 }, action: 'a' });
    await new Promise(function (resolve) { setTimeout(resolve, 2); });
    await queue.enqueue(instance, { tenant_id: tenant_id, resource_id: resource_id, payload: { v: 2 }, action: 'b' });

    const claim_result = await queue.claim(instance, { tenant_id: tenant_id, resource_id: resource_id });
    assert.strictEqual(claim_result.success, true);
    assert.strictEqual(claim_result.payload.v, 2);

    // Coalescing: both records are absorbed by the single claim, so a second
    // claim has nothing left to process.
    const second = await queue.claim(instance, { tenant_id: tenant_id, resource_id: resource_id });
    assert.strictEqual(second.success, true);
    assert.strictEqual(second.payload, null);
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
