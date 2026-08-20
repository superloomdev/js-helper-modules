// Info: Test loader for js-server-helper-kv-aws-elasticache.
// Standalone module - no kv-valkey dependency.
// IAM auth is tested with mocked credentials - no real AWS calls.
'use strict';


/********************************************************************
Load all test dependencies and build the Lib container.

@return {Object} result
@return {Object} result.Lib - Dependency container
@return {Object} result.Config - Test-wide environment values
*********************************************************************/
module.exports = function loader () {

  // Test-wide environment config
  const Config = {
    valkey_host: process.env.VALKEY_HOST || 'localhost',
    valkey_port: parseInt(process.env.VALKEY_PORT, 10) || 6379
  };

  // Sub-config for the ElastiCache module (no IAM for basic tests)
  const config_kv = {
    HOST: Config.valkey_host,
    PORT: Config.valkey_port,
    TLS: false
  };

  // Dependencies for this instance
  const Lib = {};

  // Helper modules
  Lib.Utils = require('helper-utils')(Lib, {});
  Lib.Debug = require('helper-debug')(Lib, {});
  Lib.Instance = require('helper-instance')(Lib, {});

  // Server helper module - load the standalone ElastiCache driver
  Lib.KV = require('helper-kv-aws-elasticache')(Lib, config_kv);

  // Return runtime objects
  return { Lib, Config };

};
