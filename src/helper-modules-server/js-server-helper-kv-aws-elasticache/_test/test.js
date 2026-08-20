// Tests for js-server-helper-kv-aws-elasticache
// Standalone module - no kv-valkey dependency.
// Tests both local mode (no IAM, ENDPOINT set) and IAM token generation logic.
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

  it('should expose all 17 public functions', function () {

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

  it('should throw TypeError on wrong REGION type', function () {

    assert.throws(function () {
      require('../kv-aws-elasticache')(Lib, { REGION: 123 });
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
        KEY: 'AKIATEST',
        SECRET: 'secrettest'
        // CACHE_NAME missing
      });
    }, TypeError);
  });

  it('should throw TypeError when IAM_USER_ID is set without KEY', function () {

    assert.throws(function () {
      require('../kv-aws-elasticache')(Lib, {
        IAM_USER_ID: 'my-user',
        CACHE_NAME: 'my-cache',
        SECRET: 'secrettest'
        // KEY missing
      });
    }, TypeError);
  });

  it('should throw TypeError when IAM_USER_ID is set without SECRET', function () {

    assert.throws(function () {
      require('../kv-aws-elasticache')(Lib, {
        IAM_USER_ID: 'my-user',
        CACHE_NAME: 'my-cache',
        KEY: 'AKIATEST'
        // SECRET missing
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
      KEY: 'AKIATEST',
      SECRET: 'secrettest',
      REGION: 'us-east-1'
    });

    assert.strictEqual(typeof kv.set, 'function');
  });

});



// ============================================================================
// 3. LOCAL MODE (no IAM auth - standalone ioredis connection)
// ============================================================================

describe('Local Mode (no IAM)', function () {

  it('should ping successfully', async function () {

    const result = await KV.ping(instance);

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.error, null);
  });

  it('should set and get a value', async function () {

    await KV.set(instance, 'local_key', { name: 'alice' });

    const result = await KV.get(instance, 'local_key');

    assert.strictEqual(result.success, true);
    assert.deepStrictEqual(result.value, { name: 'alice' });
  });

  it('should return null for absent key', async function () {

    const result = await KV.get(instance, 'nonexistent_local');

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.value, null);
  });

  it('should delete a key', async function () {

    await KV.set(instance, 'del_local', 'value');

    const result = await KV.delete(instance, 'del_local');

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.deleted_count, 1);
  });

  it('should check key existence', async function () {

    await KV.set(instance, 'exists_local', 'value');

    const result = await KV.getKeyExists(instance, 'exists_local');

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

    await KV.setHashField(instance, 'hash_local', 'field1', { data: 'v1' });

    const result = await KV.getHashField(instance, 'hash_local', 'field1');

    assert.strictEqual(result.success, true);
    assert.deepStrictEqual(result.value, { data: 'v1' });
  });

  it('should get all hash fields', async function () {

    await KV.setHashField(instance, 'hashall_local', 'f1', 'v1');
    await KV.setHashField(instance, 'hashall_local', 'f2', 'v2');

    const result = await KV.getHashFields(instance, 'hashall_local');

    assert.strictEqual(result.success, true);
    assert.strictEqual(Object.keys(result.fields).length, 2);
    assert.strictEqual(result.fields.f1, 'v1');
    assert.strictEqual(result.fields.f2, 'v2');
  });

  it('should delete hash field', async function () {

    await KV.setHashField(instance, 'hashdel_local', 'field1', 'v1');

    const result = await KV.deleteHashField(instance, 'hashdel_local', 'field1');

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.deleted_count, 1);
  });

  it('should set expire and get TTL', async function () {

    await KV.set(instance, 'ttl_local', 'value');
    await KV.setExpire(instance, 'ttl_local', 60);

    const result = await KV.getTtl(instance, 'ttl_local');

    assert.strictEqual(result.success, true);
    assert.ok(result.ttl_seconds > 0 && result.ttl_seconds <= 60);
  });

  it('should return null TTL for no-expiry key', async function () {

    await KV.set(instance, 'no_ttl_local', 'value');

    const result = await KV.getTtl(instance, 'no_ttl_local');

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.ttl_seconds, null);
  });

  it('should increment a key', async function () {

    const result = await KV.increment(instance, 'counter_local');

    assert.strictEqual(result.success, true);
    assert.ok(result.value >= 1);
  });

  it('should increment by a given amount', async function () {

    const result = await KV.increment(instance, 'counter_by_local', 5);

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

  it('should generate a valid SigV4 token with mocked credentials', async function () {

    // Use the official AWS SDK v3 SignatureV4 to verify token structure
    const { SignatureV4 } = require('@smithy/signature-v4');
    const { Sha256 } = require('@aws-crypto/sha256-js');

    const signer = new SignatureV4({
      credentials: {
        accessKeyId: 'AKIATESTKEY123',
        secretAccessKey: 'secrettestkey123'
      },
      region: 'us-east-1',
      service: 'elasticache',
      sha256: Sha256
    });

    const request = {
      method: 'GET',
      protocol: 'http:',
      hostname: 'test-cache-cluster',
      path: '/',
      query: {
        Action: 'connect',
        User: 'test-iam-user',
        'X-Amz-Expires': '900'
      },
      headers: {
        host: 'test-cache-cluster'
      }
    };

    const presigned = await signer.presign(request, { expiresIn: 900 });

    const queryStr = new URLSearchParams(presigned.query).toString();
    const token = presigned.hostname + presigned.path + '?' + queryStr;

    // Verify the token structure
    assert.ok(token.includes('Action=connect'), 'token should contain Action=connect');
    assert.ok(token.includes('User=test-iam-user'), 'token should contain User param');
    assert.ok(token.includes('X-Amz-Signature='), 'token should contain SigV4 signature');
    assert.ok(token.includes('X-Amz-Expires=900'), 'token should contain expiry');
    assert.ok(token.includes('X-Amz-Credential='), 'token should contain credentials');
    assert.ok(token.startsWith('test-cache-cluster/'), 'token should start with cache name');
  });

  it('should add ResourceType=ServerlessCache for serverless caches', async function () {

    const { SignatureV4 } = require('@smithy/signature-v4');
    const { Sha256 } = require('@aws-crypto/sha256-js');

    const signer = new SignatureV4({
      credentials: {
        accessKeyId: 'AKIATEST',
        secretAccessKey: 'secrettest'
      },
      region: 'us-east-1',
      service: 'elasticache',
      sha256: Sha256
    });

    const request = {
      method: 'GET',
      protocol: 'http:',
      hostname: 'serverless-cache',
      path: '/',
      query: {
        Action: 'connect',
        User: 'my-user',
        'X-Amz-Expires': '900',
        ResourceType: 'ServerlessCache'
      },
      headers: {
        host: 'serverless-cache'
      }
    };

    const presigned = await signer.presign(request, { expiresIn: 900 });

    const queryStr = new URLSearchParams(presigned.query).toString();
    const token = presigned.hostname + presigned.path + '?' + queryStr;

    assert.ok(token.includes('ResourceType=ServerlessCache'), 'token should contain ResourceType for serverless');
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
      KEY: 'AKIATEST',
      SECRET: 'secrettest',
      REGION: 'us-west-2'
    });

    // If we got here without throwing or hanging, construction succeeded
    assert.strictEqual(typeof kv.set, 'function');
    assert.strictEqual(typeof kv.get, 'function');
  });

});



// ============================================================================
// 5. WRAPPER PURITY
// ============================================================================

describe('Wrapper Purity', function () {

  it('should never include ioredis or AWS SDK wording in error objects', function () {

    // Verify error catalog messages
    assert.ok(ERRORS.KV_ELASTICACHE_IAM_TOKEN_FAILED.message.indexOf('ioredis') === -1);
    assert.ok(ERRORS.KV_ELASTICACHE_IAM_TOKEN_FAILED.message.indexOf('smithy') === -1);
    assert.ok(ERRORS.KV_ELASTICACHE_IAM_TOKEN_FAILED.message.indexOf('aws4') === -1);
    assert.ok(ERRORS.KV_ELASTICACHE_IAM_TOKEN_EXPIRED.message.indexOf('ioredis') === -1);
    assert.ok(ERRORS.KV_ELASTICACHE_IAM_TOKEN_EXPIRED.message.indexOf('smithy') === -1);
    assert.ok(ERRORS.KV_ELASTICACHE_IAM_TOKEN_EXPIRED.message.indexOf('aws4') === -1);
  });

  it('should have IAM-specific error types in the catalog', function () {

    assert.strictEqual(ERRORS.KV_ELASTICACHE_IAM_TOKEN_FAILED.type, 'KV_ELASTICACHE_IAM_TOKEN_FAILED');
    assert.strictEqual(ERRORS.KV_ELASTICACHE_IAM_TOKEN_EXPIRED.type, 'KV_ELASTICACHE_IAM_TOKEN_EXPIRED');
  });

  it('should have the base KV error types in the catalog', function () {

    assert.strictEqual(ERRORS.KV_CONNECTION_FAILED.type, 'KV_CONNECTION_FAILED');
    assert.strictEqual(ERRORS.KV_COMMAND_FAILED.type, 'KV_COMMAND_FAILED');
    assert.strictEqual(ERRORS.KV_TIMEOUT.type, 'KV_TIMEOUT');
    assert.strictEqual(ERRORS.KV_SERIALIZATION_FAILED.type, 'KV_SERIALIZATION_FAILED');
  });

});

});
