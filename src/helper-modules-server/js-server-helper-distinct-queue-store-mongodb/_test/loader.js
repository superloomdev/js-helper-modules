// Info: Test loader for helper-distinct-queue-store-mongodb.
// Builds the Lib container and store helpers so tests can exercise the store
// adapter directly (4-method contract) and the core distinct-queue module
// end-to-end (enqueue/claim/listByPrefix).
//
// MongoDB connection settings are read exclusively from environment variables
// here - test.js never reads process.env directly.

import helperUtils from 'helper-utils';
import helperDebug from 'helper-debug';
import helperCrypto from 'helper-crypto';
import helperInstance from 'helper-instance';
import helperNosqlMongodb from 'helper-nosql-mongodb';
import storeFactory from 'helper-distinct-queue-store-mongodb';
import helperDistinctQueue from 'helper-distinct-queue';

const TEST_COLLECTION = 'distinct_queue_test';


// ==================== ENVIRONMENT CONFIG ======================== //

const config_mongodb = {
  CONNECTION_STRING:        process.env.MONGO_URL      || 'mongodb://127.0.0.1:27020/?directConnection=true',
  DATABASE_NAME:            process.env.MONGO_DATABASE || 'test_db',
  MAX_POOL_SIZE:            5,
  SERVER_SELECTION_TIMEOUT: 5000
};


// ==================== DEPENDENCY CONTAINER ====================== //

const Lib = {};

Lib.Utils    = helperUtils(Lib, {});
Lib.Debug    = helperDebug(Lib, { LOG_LEVEL: 'error' });
Lib.Crypto   = helperCrypto(Lib, {});
Lib.Instance = helperInstance(Lib, {});
Lib.MongoDB  = helperNosqlMongodb(Lib, config_mongodb);


// Load the store adapter with Lib injected
const Store = storeFactory(Lib, {
  COLLECTION_NAME: TEST_COLLECTION
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

@return {Object} - Store interface
*********************************************************************/
const buildStore = function () {

  return Store;

};


/********************************************************************
Instantiate the core distinct-queue module wired to the MongoDB
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
Remove every document from the test collection between tests.

@return {Promise<void>}
*********************************************************************/
const cleanCollection = async function () {

  await Lib.MongoDB.deleteRecordsByFilter(
    buildInstance(),
    TEST_COLLECTION,
    { _id: { $exists: true } }
  );

};


/********************************************************************
Close the shared MongoDB client so node --test can exit cleanly.

@return {Promise<void>}
*********************************************************************/
const closeMongo = async function () {

  await Lib.MongoDB.close();

};


export default {
  Lib,
  TEST_COLLECTION,
  buildInstance,
  buildStore,
  buildQueue,
  cleanCollection,
  closeMongo
};
