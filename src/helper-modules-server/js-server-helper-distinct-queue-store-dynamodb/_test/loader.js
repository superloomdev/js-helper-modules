// Info: Test loader for js-server-helper-distinct-queue-store-dynamodb.
// Builds the Lib container, a minimal ERRORS stub, and factory helpers so
// tests can exercise the store adapter directly (4-method contract) and the
// core distinct-queue module end-to-end (enqueue/claim/listByPrefix).
//
// DynamoDB connection settings are read exclusively from environment variables
// here - test.js never reads process.env directly.

'use strict';

const TEST_TABLE = 'distinct_queue_test';


// ==================== ENVIRONMENT CONFIG ======================== //

const config_dynamodb = {
  REGION:        process.env.AWS_REGION        || 'us-east-1',
  KEY:           process.env.AWS_ACCESS_KEY_ID    || 'local',
  SECRET:        process.env.AWS_SECRET_ACCESS_KEY || 'local',
  ENDPOINT:      process.env.DYNAMODB_ENDPOINT    || 'http://127.0.0.1:8000',
  MAX_RETRIES:   3
};


// ==================== DEPENDENCY CONTAINER ====================== //

const Lib = {};

Lib.Utils    = require('helper-utils')(Lib, {});
Lib.Debug    = require('helper-debug')(Lib, { LOG_LEVEL: 'error' });
Lib.Crypto   = require('helper-crypto')(Lib, {});
Lib.Instance = require('helper-instance')(Lib, {});
Lib.DynamoDB = require('helper-nosql-aws-dynamodb')(Lib, config_dynamodb);


// ==================== MINIMAL ERRORS CATALOG =================== //

// The store adapter returns ERRORS.SERVICE_UNAVAILABLE on backend failure.
// When the core module instantiates the store it supplies its own catalog;
// direct-store tests use this minimal stub.
const ERRORS = {
  SERVICE_UNAVAILABLE: {
    type: 'SERVICE_UNAVAILABLE',
    message: 'Service unavailable'
  }
};


const StoreFactory = require('helper-distinct-queue-store-dynamodb');


/********************************************************************
Create a fresh request instance for each test.

@return {Object} - Request instance from Lib.Instance
*********************************************************************/
const buildInstance = function () {

  return Lib.Instance.initialize();

};


/********************************************************************
Instantiate the store adapter directly (no core module). Used for
the 4-method store contract suite and adapter-specific tests.

@return {Object} - Store interface
*********************************************************************/
const buildStore = function () {

  const config = {
    STORE_CONFIG: {
      table_name: TEST_TABLE,
      lib_dynamodb: Lib.DynamoDB
    }
  };
  return StoreFactory(Lib, config, ERRORS);

};


/********************************************************************
Instantiate the core distinct-queue module wired to the DynamoDB
store adapter. Used for end-to-end enqueue/claim/listByPrefix tests.

@return {Object} - DistinctQueue interface
*********************************************************************/
const buildQueue = function () {

  return require('helper-distinct-queue')(Lib, {
    STORE: StoreFactory,
    STORE_CONFIG: {
      table_name: TEST_TABLE,
      lib_dynamodb: Lib.DynamoDB
    }
  });

};


/********************************************************************
Delete the test table between tests (clean slate).

@return {Promise<void>}
*********************************************************************/
const cleanTable = async function () {

  // Delete and recreate the table for a clean slate
  // DynamoDB Local is fast enough for this approach
  await Lib.DynamoDB.deleteTable(buildInstance(), TEST_TABLE);

  // Re-create the table via setupNewStore
  const store = buildStore();
  await store.setupNewStore(buildInstance());

};


/********************************************************************
Close the shared DynamoDB client so node --test can exit cleanly.

@return {Promise<void>}
*********************************************************************/
const closeDynamoDB = async function () {

  // DynamoDB client cleanup if needed
  // The helper doesn't have an explicit close method

};


module.exports = {
  Lib,
  ERRORS,
  TEST_TABLE,
  buildInstance,
  buildStore,
  buildQueue,
  cleanTable,
  closeDynamoDB
};
