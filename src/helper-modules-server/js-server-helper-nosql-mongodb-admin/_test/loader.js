// Info: Test loader for js-server-helper-nosql-mongodb-admin
// Mirrors the main project loader pattern: loads dependencies, merges config from environment
'use strict';


/********************************************************************
Load all test dependencies, build Lib container from environment.

process.env is ONLY read here - nowhere else in test code.

@return {Object} result - Runtime objects for testing
@return {Object} result.Lib - Dependency container (Utils, Debug, Instance, MongoDBAdmin)
@return {Object} result.Config - Test-wide environment values for test infrastructure
*********************************************************************/
module.exports = function loader () {

  const Config = {
    mongodb_connection_string: process.env.MONGODB_ADMIN_CONNECTION_STRING || 'mongodb://localhost:27018',
    mongodb_database: process.env.MONGODB_ADMIN_DATABASE || 'test_admin'
  };

  // Sub-configs: each helper module receives ONLY its relevant slice
  const config_mongodb_admin = {
    CONNECTION_STRING: Config.mongodb_connection_string,
    DATABASE_NAME: Config.mongodb_database,
    CONNECT_TIMEOUT_MS: 5000
  };


  // Dependencies for this instance
  const Lib = {};

  // Helper modules
  Lib.Utils = require('helper-utils')(Lib, {});
  Lib.Debug = require('helper-debug')(Lib, {});
  Lib.Instance = require('helper-instance')(Lib, {});

  // Server helper modules
  Lib.MongoDBAdmin = require('helper-nosql-mongodb-admin')(Lib, config_mongodb_admin);


  // Return runtime objects
  return { Lib, Config };

};
