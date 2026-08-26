// Info: Test loader for helper-distinct-queue-store-dynamodb.
// Builds the Lib container and store helpers so tests can exercise the store
// adapter directly (4-method contract) and the core distinct-queue module
// end-to-end (enqueue/claim/listByPrefix).
//
// DynamoDB connection settings are read exclusively from environment variables
// here - test.js never reads process.env directly.

import helperUtils from 'helper-utils';
import helperDebug from 'helper-debug';
import helperCrypto from 'helper-crypto';
import helperInstance from 'helper-instance';
import helperNosqlAwsDynamodb from 'helper-nosql-aws-dynamodb';
import storeFactory from 'helper-distinct-queue-store-dynamodb';
import helperDistinctQueue from 'helper-distinct-queue';

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

Lib.Utils    = helperUtils(Lib, {});
Lib.Debug    = helperDebug(Lib, { LOG_LEVEL: 'error' });
Lib.Crypto   = helperCrypto(Lib, {});
Lib.Instance = helperInstance(Lib, {});
Lib.DynamoDB = helperNosqlAwsDynamodb(Lib, config_dynamodb);


// Load the store adapter with Lib injected
const Store = storeFactory(Lib, {
  TABLE_NAME: TEST_TABLE
});


/********************************************************************
Create a fresh request instance for each test.

@return {Object} - Request instance from Lib.Instance
*********************************************************************/
const buildInstance = function () {

  return Lib.Instance.initialize();

};


/********************************************************************
Return the loaded store adapter directly (no core module). Used for
the 4-method store contract suite and adapter-specific tests.

The adapter owns its CONFIG and ERRORS; Lib is injected at load time.

@return {Object} - Store interface
*********************************************************************/
const buildStore = function () {

  return Store;

};


/********************************************************************
Instantiate the core distinct-queue module wired to the DynamoDB
store adapter. Used for end-to-end enqueue/claim/listByPrefix tests.

The adapter owns its CONFIG and ERRORS; Lib is injected at load time.
The parent uses the store object directly via CONFIG.Store.

@return {Object} - DistinctQueue interface
*********************************************************************/
const buildQueue = function () {

  return helperDistinctQueue(Lib, {
    Store: Store
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


export default {
  Lib,
  TEST_TABLE,
  buildInstance,
  buildStore,
  buildQueue,
  cleanTable,
  closeDynamoDB
};
