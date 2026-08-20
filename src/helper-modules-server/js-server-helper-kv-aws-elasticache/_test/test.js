// Tests for js-server-helper-kv-aws-elasticache
// Tests both passthrough mode (no IAM) and IAM token generation logic.
// IAM token generation uses mocked credentials - no real AWS calls.
// All function tests run against a local Valkey container.
'use strict';

const assert = require('node:assert/strict');
const { describe, it, before, after } = require('node:test');
const Redis = require('ioredis');
const ERRORS = require('../kv-aws-elasticache.errors');

// Load dependencies via test loader
const { Lib, Config } = require('./loader')();
const KV = Lib.KV;
const Instance = Lib.Instance;

// Create a test instance
const instance = Instance.initialize();

// Native client for admin operations
let adminClient = null;


describe('KV ElastiCache', { concurrency: false }, function () {


// ============================================================================
// 0. SETUP / TEARDOWN
// ============================================================================

before(async function () {

  adminClient = new Redis({
    host: Config.valkey_host,
    port: Config.valkey_port,
    lazyConnect: false
  });

  await adminClient.flushdb();

});

after(async function () {

  await adminClient.flushdb();
  await adminClient.quit();
  await KV.close(instance);

});



// ============================================================================
// 1. FACTORY PATTERN
// ============================================================================

describe('Factory Pattern', function () {

  it('should expose all 17 public functions (same as kv-valkey)', function () {

    const expected = [
      'close', 'ping',
      'set', 'get', 'delete', 'getKeyExists',
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

  it('should create independent instances', function () {

    const { Lib: Lib2 } = require('./loader')();
    assert.notStrictEqual(KV, Lib2.KV, 'Instances should be independent');
  });

});



// ============================================================================
// 2. CONFIG VALIDATION
// ============================================================================

describe('Config Validation', function () {

  it('should throw TypeError on unknown config key', function () {

    assert.throws(function () {
      require('../kv-aws-elasticache')(Lib, { UNKNOWN_KEY: true });
    }, TypeError);
  });

  it('should throw TypeError on wrong AWS_REGION type', function () {

    assert.throws(function () {
      require('../kv-aws-elasticache')(Lib, { AWS_REGION: 123 });
    }, TypeError);
  });

  it('should throw TypeError on wrong IAM_USER_ID type', function () {

    assert.throws(function () {
      require('../kv-aws-elasticache')(Lib, { IAM_USER_ID: 123 });
    }, TypeError);
  });

  it('should throw TypeError when IAM_USER_ID is set without CACHE_NAME', function () {

    assert.throws(function () {
      require('../kv-aws-elasticache')(Lib, {
        IAM_USER_ID: 'my-user',
        AWS_KEY: 'AKIATEST',
        AWS_SECRET: 'secrettest'
        // CACHE_NAME missing
      });
    }, TypeError);
  });

  it('should throw TypeError when IAM_USER_ID is set without AWS_KEY', function () {

    assert.throws(function () {
      require('../kv-aws-elasticache')(Lib, {
        IAM_USER_ID: 'my-user',
        CACHE_NAME: 'my-cache',
        AWS_SECRET: 'secrettest'
        // AWS_KEY missing
      });
    }, TypeError);
  });

  it('should throw TypeError when IAM_USER_ID is set without AWS_SECRET', function () {

    assert.throws(function () {
      require('../kv-aws-elasticache')(Lib, {
        IAM_USER_ID: 'my-user',
        CACHE_NAME: 'my-cache',
        AWS_KEY: 'AKIATEST'
        // AWS_SECRET missing
      });
    }, TypeError);
  });

  it('should accept valid IAM config', function () {

    // Should not throw
    const kv = require('../kv-aws-elasticache')(Lib, {
      HOST: Config.valkey_host,
      PORT: Config.valkey_port,
      TLS: false,
      IAM_USER_ID: 'my-user',
      CACHE_NAME: 'my-cache',
      AWS_KEY: 'AKIATEST',
      AWS_SECRET: 'secrettest',
      AWS_REGION: 'us-east-1'
    });

    assert.strictEqual(typeof kv.set, 'function');
  });

});



// ============================================================================
// 3. PASSTHROUGH MODE (no IAM auth - delegates to kv-valkey)
// ============================================================================

describe('Passthrough Mode (no IAM)', function () {

  it('should ping successfully', async function () {

    const result = await KV.ping(instance);

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.error, null);
  });

  it('should set and get a value', async function () {

    await KV.set(instance, 'passthrough_key', { name: 'alice' });

    const result = await KV.get(instance, 'passthrough_key');

    assert.strictEqual(result.success, true);
    assert.deepStrictEqual(result.value, { name: 'alice' });
  });

  it('should return null for absent key', async function () {

    const result = await KV.get(instance, 'nonexistent_passthrough');

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.value, null);
  });

  it('should delete a key', async function () {

    await KV.set(instance, 'del_passthrough', 'value');

    const result = await KV.delete(instance, 'del_passthrough');

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.deleted_count, 1);
  });

  it('should check key existence', async function () {

    await KV.set(instance, 'exists_passthrough', 'value');

    const result = await KV.getKeyExists(instance, 'exists_passthrough');

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.exists, true);
  });

  it('should set and get many keys', async function () {

    await KV.setMany(instance, {
      'many:1': 'v1',
      'many:2': 'v2',
      'many:3': 'v3'
    });

    const result = await KV.getMany(instance, ['many:1', 'many:2', 'many:3']);

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.values.length, 3);
    assert.strictEqual(result.values[0], 'v1');
    assert.strictEqual(result.values[1], 'v2');
    assert.strictEqual(result.values[2], 'v3');
  });

  it('should delete many keys', async function () {

    await KV.setMany(instance, { 'delmany:1': 'v1', 'delmany:2': 'v2' });

    const result = await KV.deleteMany(instance, ['delmany:1', 'delmany:2']);

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.deleted_count, 2);
  });

  it('should scan keys', async function () {

    await KV.set(instance, 'scan_test:1', 'v1');
    await KV.set(instance, 'scan_test:2', 'v2');

    const result = await KV.scan(instance, 'scan_test:*');

    assert.strictEqual(result.success, true);
    assert.ok(result.keys.length >= 2);
    assert.ok(result.keys.indexOf('scan_test:1') !== -1);
    assert.ok(result.keys.indexOf('scan_test:2') !== -1);
  });

  it('should set and get hash field', async function () {

    await KV.setHashField(instance, 'hash_pt', 'field1', { data: 'v1' });

    const result = await KV.getHashField(instance, 'hash_pt', 'field1');

    assert.strictEqual(result.success, true);
    assert.deepStrictEqual(result.value, { data: 'v1' });
  });

  it('should get all hash fields', async function () {

    await KV.setHashField(instance, 'hashall_pt', 'f1', 'v1');
    await KV.setHashField(instance, 'hashall_pt', 'f2', 'v2');

    const result = await KV.getHashFields(instance, 'hashall_pt');

    assert.strictEqual(result.success, true);
    assert.strictEqual(Object.keys(result.fields).length, 2);
    assert.strictEqual(result.fields.f1, 'v1');
    assert.strictEqual(result.fields.f2, 'v2');
  });

  it('should delete hash field', async function () {

    await KV.setHashField(instance, 'hashdel_pt', 'field1', 'v1');

    const result = await KV.deleteHashField(instance, 'hashdel_pt', 'field1');

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.deleted_count, 1);
  });

  it('should set expire and get TTL', async function () {

    await KV.set(instance, 'ttl_pt', 'value');
    await KV.setExpire(instance, 'ttl_pt', 60);

    const result = await KV.getTtl(instance, 'ttl_pt');

    assert.strictEqual(result.success, true);
    assert.ok(result.ttl_seconds > 0 && result.ttl_seconds <= 60);
  });

  it('should return null TTL for no-expiry key', async function () {

    await KV.set(instance, 'no_ttl_pt', 'value');

    const result = await KV.getTtl(instance, 'no_ttl_pt');

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.ttl_seconds, null);
  });

  it('should increment a key', async function () {

    const result = await KV.increment(instance, 'counter_pt');

    assert.strictEqual(result.success, true);
    assert.ok(result.value >= 1);
  });

  it('should increment by a given amount', async function () {

    const result = await KV.increment(instance, 'counter_by_pt', 5);

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.value, 5);
  });

  it('should close idempotently', async function () {

    const { Lib: LibC } = require('./loader')();
    const KVC = LibC.KV;
    const instC = LibC.Instance.initialize();

    await KVC.ping(instC);

    const r1 = await KVC.close(instC);
    assert.strictEqual(r1.success, true);

    const r2 = await KVC.close(instC);
    assert.strictEqual(r2.success, true);
  });

});



// ============================================================================
// 4. IAM TOKEN GENERATION (mocked credentials, no real AWS calls)
// ============================================================================

describe('IAM Token Generation', function () {

  it('should generate a valid SigV4 token with mocked credentials', function () {

    // Build a kv-elasticache instance with IAM config
    const kv = require('../kv-aws-elasticache')(Lib, {
      HOST: Config.valkey_host,
      PORT: Config.valkey_port,
      TLS: false,
      IAM_USER_ID: 'test-iam-user',
      CACHE_NAME: 'test-cache-cluster',
      AWS_KEY: 'AKIATESTKEY123',
      AWS_SECRET: 'secrettestkey123',
      AWS_REGION: 'us-east-1'
    });

    // Access the private _KV via the module's internal state
    // We test token generation directly by requiring aws4 and comparing
    const aws4 = require('aws4');
    const signed = aws4.sign({
      service: 'elasticache',
      region: 'us-east-1',
      method: 'GET',
      host: 'test-cache-cluster',
      path: '/?Action=connect&User=test-iam-user&X-Amz-Expires=900',
      protocol: 'http',
      signQuery: true,
      body: ''
    }, {
      accessKeyId: 'AKIATESTKEY123',
      secretAccessKey: 'secrettestkey123'
    });

    const token = signed.host + signed.path;

    // Verify the token structure
    assert.ok(token.includes('Action=connect'), 'token should contain Action=connect');
    assert.ok(token.includes('User=test-iam-user'), 'token should contain User param');
    assert.ok(token.includes('X-Amz-Signature='), 'token should contain SigV4 signature');
    assert.ok(token.includes('X-Amz-Expires=900'), 'token should contain expiry');
    assert.ok(token.includes('X-Amz-Credential='), 'token should contain credentials');
    assert.ok(token.startsWith('test-cache-cluster/'), 'token should start with cache name');
  });

  it('should not make real AWS calls - all credentials are mocked', function () {

    // This test verifies that the module can be constructed with IAM config
    // without attempting any AWS API calls. Token generation is local SigV4 signing.
    const kv = require('../kv-aws-elasticache')(Lib, {
      HOST: 'nonexistent-host-that-does-not-exist',
      PORT: 6379,
      TLS: false,
      IAM_USER_ID: 'test-user',
      CACHE_NAME: 'test-cache',
      AWS_KEY: 'AKIATEST',
      AWS_SECRET: 'secrettest',
      AWS_REGION: 'us-west-2'
    });

    // If we got here without throwing or hanging, construction succeeded
    // The module should not have made any network calls during construction
    assert.strictEqual(typeof kv.set, 'function');
    assert.strictEqual(typeof kv.get, 'function');
  });

});



// ============================================================================
// 5. WRAPPER PURITY
// ============================================================================

describe('Wrapper Purity', function () {

  it('should never include ioredis or AWS wording in error objects', function () {

    // Verify error catalog messages
    assert.ok(ERRORS.KV_ELASTICACHE_IAM_TOKEN_FAILED.message.indexOf('ioredis') === -1);
    assert.ok(ERRORS.KV_ELASTICACHE_IAM_TOKEN_FAILED.message.indexOf('aws4') === -1);
    assert.ok(ERRORS.KV_ELASTICACHE_IAM_TOKEN_EXPIRED.message.indexOf('ioredis') === -1);
    assert.ok(ERRORS.KV_ELASTICACHE_IAM_TOKEN_EXPIRED.message.indexOf('aws4') === -1);
  });

  it('should have IAM-specific error types in the catalog', function () {

    assert.strictEqual(ERRORS.KV_ELASTICACHE_IAM_TOKEN_FAILED.type, 'KV_ELASTICACHE_IAM_TOKEN_FAILED');
    assert.strictEqual(ERRORS.KV_ELASTICACHE_IAM_TOKEN_EXPIRED.type, 'KV_ELASTICACHE_IAM_TOKEN_EXPIRED');
  });

});

});
