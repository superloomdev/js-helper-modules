// Tests for js-server-helper-nosql-aws-dynamodb-admin
// Works with both emulated (DynamoDB Local) and integration (real AWS) testing
// Config comes from environment variables via loader.js
'use strict';

const assert = require('node:assert/strict');
const { describe, it, before, after } = require('node:test');
const { DynamoDBClient, ListTablesCommand, DeleteTableCommand } = require('@aws-sdk/client-dynamodb');
const ERRORS = require('../dynamodb-admin.errors');

// Load all dependencies and config via test loader (mirrors main project loader pattern)
// process.env is NEVER accessed in test files - only in loader.js
const { Lib, Config } = require('./loader')();
const DynamoDBAdmin = Lib.DynamoDBAdmin;
const Instance = Lib.Instance;

// Create a test instance (simulates a real request lifecycle)
const instance = Instance.initialize();

// Test table names (prefixed with test_ for isolation)
const TEST_TABLE = 'test_admin_table';
const TEST_TABLE_2 = 'test_admin_table_ttl';
const TEST_TABLE_3 = 'test_admin_table_describe';

// Native client for cleanup operations
let nativeClient = null;


describe('DynamoDBAdmin', { concurrency: false }, function () {


// ============================================================================
// 0. SETUP / TEARDOWN
// ============================================================================

before(async function () {

  // Connect native client for cleanup operations
  nativeClient = new DynamoDBClient({
    region: Config.aws_region,
    credentials: {
      accessKeyId: Config.aws_access_key_id,
      secretAccessKey: Config.aws_secret_access_key
    },
    endpoint: Config.dynamodb_endpoint
  });

  // Drop test tables (ignore errors if they don't exist)
  const table_names = [TEST_TABLE, TEST_TABLE_2, TEST_TABLE_3];
  for (const name of table_names) {

    try {
      await nativeClient.send(new DeleteTableCommand({ TableName: name }));
    } catch (_e) { /* ignore if table does not exist */ }

  }

});

after(async function () {

  // Drop test tables
  const table_names = [TEST_TABLE, TEST_TABLE_2, TEST_TABLE_3];
  for (const name of table_names) {

    try {
      await nativeClient.send(new DeleteTableCommand({ TableName: name }));
    } catch (_e) { /* ignore if table does not exist */ }

  }

  // Close connections
  await DynamoDBAdmin.close(instance);
  nativeClient.destroy();

});


// ============================================================================
// 1. FACTORY PATTERN
// ============================================================================

describe('Factory Pattern', function () {

  it('should create independent instances', function () {

    const { Lib: Lib2 } = require('./loader')();
    const DynamoDBAdmin2 = Lib2.DynamoDBAdmin;

    assert.notStrictEqual(DynamoDBAdmin, DynamoDBAdmin2, 'Instances should be independent');
    assert.strictEqual(typeof DynamoDBAdmin.createTable, 'function');
    assert.strictEqual(typeof DynamoDBAdmin2.createTable, 'function');
  });

  it('should have all 7 required methods', function () {

    const methods = [
      'createTable',
      'waitForTableActive',
      'enableTtl',
      'deleteTable',
      'describeTable',
      'ping',
      'close'
    ];
    methods.forEach(function (m) {
      assert.strictEqual(typeof DynamoDBAdmin[m], 'function', 'Should have ' + m);
    });
  });

});


// ============================================================================
// 2. PING
// ============================================================================

describe('ping', function () {

  it('should ping the DynamoDB service successfully', async function () {

    const result = await DynamoDBAdmin.ping(instance);

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.data.ok, true);
    assert.strictEqual(result.error, null);
  });

});


// ============================================================================
// 3. CREATE TABLE
// ============================================================================

describe('createTable', function () {

  it('should create a new table', async function () {

    const result = await DynamoDBAdmin.createTable(instance, {
      table_name: TEST_TABLE,
      attribute_definitions: [
        { name: 'pk', type: 'S' },
        { name: 'sk', type: 'S' }
      ],
      key_schema: [
        { name: 'pk', type: 'HASH' },
        { name: 'sk', type: 'RANGE' }
      ]
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.data.created, true);
    assert.strictEqual(result.error, null);
  });

  it('should be idempotent - second call returns created: false', async function () {

    const result = await DynamoDBAdmin.createTable(instance, {
      table_name: TEST_TABLE,
      attribute_definitions: [
        { name: 'pk', type: 'S' },
        { name: 'sk', type: 'S' }
      ],
      key_schema: [
        { name: 'pk', type: 'HASH' },
        { name: 'sk', type: 'RANGE' }
      ]
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.data.created, false);
    assert.strictEqual(result.error, null);
  });

  it('should reject with TypeError when table_name is missing', async function () {

    await assert.rejects(
      DynamoDBAdmin.createTable(instance, {
        attribute_definitions: [{ name: 'pk', type: 'S' }],
        key_schema: [{ name: 'pk', type: 'HASH' }]
      }),
      TypeError
    );
  });

  it('should reject with TypeError when attribute_definitions is empty', async function () {

    await assert.rejects(
      DynamoDBAdmin.createTable(instance, {
        table_name: TEST_TABLE,
        attribute_definitions: [],
        key_schema: [{ name: 'pk', type: 'HASH' }]
      }),
      TypeError
    );
  });

  it('should reject with TypeError when key_schema is missing', async function () {

    await assert.rejects(
      DynamoDBAdmin.createTable(instance, {
        table_name: TEST_TABLE,
        attribute_definitions: [{ name: 'pk', type: 'S' }]
      }),
      TypeError
    );
  });

  it('should reject with TypeError when options is null', async function () {

    await assert.rejects(
      DynamoDBAdmin.createTable(instance, null),
      TypeError
    );
  });

});


// ============================================================================
// 4. WAIT FOR TABLE ACTIVE
// ============================================================================

describe('waitForTableActive', function () {

  it('should return ACTIVE when table exists and is active', async function () {

    const result = await DynamoDBAdmin.waitForTableActive(instance, {
      table_name: TEST_TABLE
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.data.table_name, TEST_TABLE);
    assert.strictEqual(result.data.status, 'ACTIVE');
    assert.strictEqual(result.error, null);
  });

  it('should reject with TypeError when table_name is missing', async function () {

    await assert.rejects(
      DynamoDBAdmin.waitForTableActive(instance, {}),
      TypeError
    );
  });

});


// ============================================================================
// 5. ENABLE TTL
// ============================================================================

describe('enableTtl', function () {

  it('should enable TTL on a table attribute', async function () {

    // Ensure table exists first
    await DynamoDBAdmin.createTable(instance, {
      table_name: TEST_TABLE_2,
      attribute_definitions: [
        { name: 'pk', type: 'S' },
        { name: 'sk', type: 'S' }
      ],
      key_schema: [
        { name: 'pk', type: 'HASH' },
        { name: 'sk', type: 'RANGE' }
      ]
    });

    const result = await DynamoDBAdmin.enableTtl(instance, {
      table_name: TEST_TABLE_2,
      attribute_name: 'expires_at'
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.data.enabled, true);
    assert.strictEqual(result.error, null);
  });

  it('should be idempotent - second call returns enabled: false', async function () {

    const result = await DynamoDBAdmin.enableTtl(instance, {
      table_name: TEST_TABLE_2,
      attribute_name: 'expires_at'
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.data.enabled, false);
    assert.strictEqual(result.error, null);
  });

  it('should return ADMIN_TTL_CONFLICT when TTL exists on a different attribute', async function () {

    const result = await DynamoDBAdmin.enableTtl(instance, {
      table_name: TEST_TABLE_2,
      attribute_name: 'created_at'
    });

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.data.enabled, false);
    assert.strictEqual(result.error.type, ERRORS.ADMIN_TTL_CONFLICT.type);
  });

  it('should reject with TypeError when attribute_name is missing', async function () {

    await assert.rejects(
      DynamoDBAdmin.enableTtl(instance, {
        table_name: TEST_TABLE_2
      }),
      TypeError
    );
  });

  it('should reject with TypeError when table_name is missing', async function () {

    await assert.rejects(
      DynamoDBAdmin.enableTtl(instance, {
        attribute_name: 'expires_at'
      }),
      TypeError
    );
  });

});


// ============================================================================
// 6. DESCRIBE TABLE
// ============================================================================

describe('describeTable', function () {

  it('should describe an existing table with normalized fields', async function () {

    // Ensure table exists first
    await DynamoDBAdmin.createTable(instance, {
      table_name: TEST_TABLE_3,
      attribute_definitions: [
        { name: 'pk', type: 'S' },
        { name: 'sk', type: 'S' }
      ],
      key_schema: [
        { name: 'pk', type: 'HASH' },
        { name: 'sk', type: 'RANGE' }
      ]
    });

    const result = await DynamoDBAdmin.describeTable(instance, {
      table_name: TEST_TABLE_3
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.error, null);

    // Assert exact normalized table shape
    const table = result.data.table;
    assert.strictEqual(table.table_name, TEST_TABLE_3);
    assert.strictEqual(table.status, 'ACTIVE');
    assert.strictEqual(table.key_schema.length, 2);
    assert.strictEqual(table.key_schema[0].name, 'pk');
    assert.strictEqual(table.key_schema[0].type, 'HASH');
    assert.strictEqual(table.key_schema[1].name, 'sk');
    assert.strictEqual(table.key_schema[1].type, 'RANGE');
    assert.strictEqual(table.billing_mode, 'PAY_PER_REQUEST');
  });

  it('should reject with TypeError when table_name is missing', async function () {

    await assert.rejects(
      DynamoDBAdmin.describeTable(instance, {}),
      TypeError
    );
  });

});


// ============================================================================
// 7. DELETE TABLE
// ============================================================================

describe('deleteTable', function () {

  it('should delete an existing table', async function () {

    // Create a table to delete
    const delete_name = 'test_admin_delete_target';
    await DynamoDBAdmin.createTable(instance, {
      table_name: delete_name,
      attribute_definitions: [
        { name: 'pk', type: 'S' }
      ],
      key_schema: [
        { name: 'pk', type: 'HASH' }
      ]
    });

    const result = await DynamoDBAdmin.deleteTable(instance, {
      table_name: delete_name
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.data.deleted, true);
    assert.strictEqual(result.error, null);
  });

  it('should be idempotent - deleting missing table returns deleted: false', async function () {

    const result = await DynamoDBAdmin.deleteTable(instance, {
      table_name: 'test_admin_nonexistent_table'
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.data.deleted, false);
    assert.strictEqual(result.error, null);
  });

  it('should reject with TypeError when table_name is missing', async function () {

    await assert.rejects(
      DynamoDBAdmin.deleteTable(instance, {}),
      TypeError
    );
  });

});


// ============================================================================
// 8. CONFIG VALIDATION
// ============================================================================

describe('Config Validation', function () {

  it('should throw TypeError when AWS_REGION is null', function () {

    assert.throws(function () {
      require('helper-nosql-aws-dynamodb-admin')(Lib, {
        AWS_REGION: null,
        AWS_ACCESS_KEY_ID: 'local',
        AWS_SECRET_ACCESS_KEY: 'local',
        ENDPOINT: 'http://127.0.0.1:8001'
      });
    }, TypeError);
  });

  it('should throw TypeError when AWS_REGION is empty string', function () {

    assert.throws(function () {
      require('helper-nosql-aws-dynamodb-admin')(Lib, {
        AWS_REGION: '',
        AWS_ACCESS_KEY_ID: 'local',
        AWS_SECRET_ACCESS_KEY: 'local',
        ENDPOINT: 'http://127.0.0.1:8001'
      });
    }, TypeError);
  });

  it('should throw TypeError when AWS_ACCESS_KEY_ID is not a string', function () {

    assert.throws(function () {
      require('helper-nosql-aws-dynamodb-admin')(Lib, {
        AWS_REGION: 'us-east-1',
        AWS_ACCESS_KEY_ID: 123,
        AWS_SECRET_ACCESS_KEY: 'local',
        ENDPOINT: 'http://127.0.0.1:8001'
      });
    }, TypeError);
  });

  it('should throw TypeError when WAIT_TIMEOUT_SECONDS is not a number', function () {

    assert.throws(function () {
      require('helper-nosql-aws-dynamodb-admin')(Lib, {
        AWS_REGION: 'us-east-1',
        AWS_ACCESS_KEY_ID: 'local',
        AWS_SECRET_ACCESS_KEY: 'local',
        ENDPOINT: 'http://127.0.0.1:8001',
        WAIT_TIMEOUT_SECONDS: 'fast'
      });
    }, TypeError);
  });

});


// ============================================================================
// 9. CLOSE
// ============================================================================

describe('close', function () {

  it('should close the admin connection successfully', async function () {

    const result = await DynamoDBAdmin.close(instance);

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.error, null);
  });

  it('should be idempotent - closing already-closed connection succeeds', async function () {

    const result = await DynamoDBAdmin.close(instance);

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.error, null);
  });

});


// ============================================================================
// 10. OPERATIONAL FAILURE - WRONG ENDPOINT
// ============================================================================

describe('Operational Failure', function () {

  it('should return error envelope (not throw) when connection fails', async function () {

    // Create an instance with a wrong endpoint
    const badAdmin = require('helper-nosql-aws-dynamodb-admin')(Lib, {
      AWS_REGION: 'us-east-1',
      AWS_ACCESS_KEY_ID: 'local',
      AWS_SECRET_ACCESS_KEY: 'local',
      ENDPOINT: 'http://127.0.0.1:9999'
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
