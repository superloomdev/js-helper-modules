// Info: Test loader for js-server-helper-kv-valkey.
// Mirrors the main project loader pattern: reads environment variables,
// builds Lib container, returns { Lib, Config }. Same loader works for
// both emulated (Docker Valkey) and integration (real server) testing.
'use strict';


/********************************************************************
Load all test dependencies and build the Lib container from environment.

process.env is ONLY read here - never in test.js.

@return {Object} result - Runtime objects for testing
@return {Object} result.Lib - Dependency container (Utils, Debug, Instance, KV)
@return {Object} result.Config - Test-wide environment values
*********************************************************************/
module.exports = function loader () {

  // Test-wide environment config
  const Config = {
    valkey_host: process.env.VALKEY_HOST || 'localhost',
    valkey_port: parseInt(process.env.VALKEY_PORT, 10) || 6379
  };

  // Sub-configs: each helper module receives ONLY its relevant slice
  const config_kv = {
    HOST: Config.valkey_host,
    PORT: Config.valkey_port
  };


  // Dependencies for this instance
  const Lib = {};

  // Helper modules
  Lib.Utils = require('helper-utils')(Lib, {});
  Lib.Debug = require('helper-debug')(Lib, {});
  Lib.Instance = require('helper-instance')(Lib, {});

  // Server helper modules
  Lib.KV = require('helper-kv-valkey')(Lib, config_kv);


  // Return runtime objects
  return { Lib, Config };

};
