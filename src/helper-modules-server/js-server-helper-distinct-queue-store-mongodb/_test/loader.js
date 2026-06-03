// Info: Test loader for js-server-helper-distinct-queue-store-mongodb.
// Builds the Lib container, a minimal ERRORS stub, and factory helpers so
// tests can exercise the store adapter directly (4-method contract) and the
// core distinct-queue module end-to-end (enqueue/claim/listByPrefix).
//
// MongoDB connection settings are read exclusively from environment variables
// here - test.js never reads process.env directly.

'use strict';

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

Lib.Utils    = require('helper-utils')(Lib, {});
Lib.Debug    = require('helper-debug')(Lib, { LOG_LEVEL: 'error' });
Lib.Crypto   = require('helper-crypto')(Lib, {});
Lib.Instance = require('helper-instance')(Lib, {});
Lib.MongoDB  = require('helper-nosql-mongodb')(Lib, config_mongodb);


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


const StoreFactory = require('helper-distinct-queue-store-mongodb');


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
      collection_name: TEST_COLLECTION,
      lib_mongodb: Lib.MongoDB
    }
  };
  return StoreFactory(Lib, config, ERRORS);

};


/********************************************************************
Instantiate the core distinct-queue module wired to the MongoDB
store adapter. Used for end-to-end enqueue/claim/listByPrefix tests.

@return {Object} - DistinctQueue interface
*********************************************************************/
const buildQueue = function () {

  return require('helper-distinct-queue')(Lib, {
    STORE: StoreFactory,
    STORE_CONFIG: {
      collection_name: TEST_COLLECTION,
      lib_mongodb: Lib.MongoDB
    }
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


module.exports = {
  Lib,
  ERRORS,
  TEST_COLLECTION,
  buildInstance,
  buildStore,
  buildQueue,
  cleanCollection,
  closeMongo
};
