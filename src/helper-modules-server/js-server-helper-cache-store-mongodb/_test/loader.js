// Info: Test loader for js-server-helper-cache-store-mongodb.
// Mirrors the main project loader pattern: reads environment variables,
// builds Lib container, returns { Lib, Config }. Same loader works for
// both emulated (Docker MongoDB) and integration (real MongoDB) testing.
'use strict';


/********************************************************************
Load all test dependencies and build the Lib container from environment.

process.env is ONLY read here - never in test.js.

@return {Object} result - Runtime objects for testing
@return {Object} result.Lib - Dependency container (Utils, Debug, Instance, MongoDB)
@return {Object} result.Config - Test-wide environment values
*********************************************************************/
module.exports = function loader () {

  // Test-wide environment config
  const Config = {
    mongodb_connection_string: process.env.MONGODB_CONNECTION_STRING || 'mongodb://127.0.0.1:27018',
    mongodb_database: process.env.MONGODB_DATABASE || 'test_cache_store'
  };

  // Sub-configs: each helper module receives ONLY its relevant slice
  const config_mongodb = {
    CONNECTION_STRING: Config.mongodb_connection_string,
    DATABASE_NAME: Config.mongodb_database
  };

  // Cache store adapter config
  const config_cache_store = {
    COLLECTION_NAME: 'cache'
  };


  // Dependencies for this instance
  const Lib = {};

  // Helper modules
  Lib.Utils = require('helper-utils')(Lib, {});
  Lib.Debug = require('helper-debug')(Lib, {});
  Lib.Instance = require('helper-instance')(Lib, {});

  // Server helper modules
  Lib.MongoDB = require('helper-nosql-mongodb')(Lib, config_mongodb);

  // Cache store adapter
  const Store = require('helper-cache-store-mongodb')(Lib, config_cache_store);

  // Cache parent module
  const Cache = require('helper-cache')(Lib, { Store: Store });


  // Return runtime objects
  return { Lib, Config, Store, Cache };

};
