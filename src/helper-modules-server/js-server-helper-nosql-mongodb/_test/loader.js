// Info: Test loader for js-server-helper-nosql-mongodb
// Mirrors the main project loader pattern: loads dependencies, merges config from environment
'use strict';


/********************************************************************
Load all test dependencies, build Lib container from environment.

process.env is ONLY read here - nowhere else in test code.

Returns a default Lib configured as a persistent deployment
(CLOSE_ON_CLEANUP false), plus a builder so a test can construct a
fresh Lib configured as a serverless deployment (CLOSE_ON_CLEANUP
true). Each builder call returns an independent Lib with its own
Instance process cleanup queue and its own MongoDB driver state.

@return {Object} result - Runtime objects for testing
@return {Object} result.Lib - Dependency container (Utils, Debug, Instance, MongoDB)
@return {Object} result.Config - Test-wide environment values for test infrastructure
@return {Object} result.instance - Default request instance
@return {Function} result.buildLib - (instance_config) => { Lib, instance }
*********************************************************************/
module.exports = function loader () {

  const Config = {
    mongodb_connection_string: process.env.MONGODB_CONNECTION_STRING || 'mongodb://localhost:27017',
    mongodb_database: process.env.MONGODB_DATABASE || 'test_db'
  };

  // Sub-configs: each helper module receives ONLY its relevant slice
  const config_mongodb = {
    CONNECTION_STRING: Config.mongodb_connection_string,
    DATABASE_NAME: Config.mongodb_database,
    MAX_POOL_SIZE: 10,
    SERVER_SELECTION_TIMEOUT: 5000
  };


  // Build a Lib container with a chosen Instance config. Each call
  // produces an independent Instance module (own process cleanup queue)
  // and an independent MongoDB driver (own client state).
  const buildLib = function (instance_config) {

    const Lib = {};

    // Helper modules
    Lib.Utils = require('helper-utils')(Lib, {});
    Lib.Debug = require('helper-debug')(Lib, {});
    Lib.Instance = require('helper-instance')(Lib, instance_config);

    // Server helper modules
    Lib.MongoDB = require('helper-nosql-mongodb')(Lib, config_mongodb);

    const instance = Lib.Instance.initialize();

    return { Lib, instance };
  };


  // Default: persistent deployment. Process-scoped teardown waits for
  // an explicit runProcessCleanup() call.
  const { Lib, instance } = buildLib({ CLOSE_ON_CLEANUP: false });


  // Return runtime objects
  return { Lib, Config, instance, buildLib };

};
