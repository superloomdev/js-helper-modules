// Info: Test loader for js-server-helper-kv-valkey.
// Mirrors the main project loader pattern: reads environment variables,
// builds Lib container, returns { Lib, Config, instance, buildLib }.
// Same loader works for both emulated (Docker Valkey) and integration
// (real server) testing.
'use strict';


/********************************************************************
Load all test dependencies and build the Lib container from environment.

process.env is ONLY read here - never in test.js.

Returns a default Lib configured as a persistent deployment
(CLOSE_ON_CLEANUP false), plus a builder so a test can construct a
fresh Lib configured as a serverless deployment (CLOSE_ON_CLEANUP
true). Each builder call returns an independent Lib with its own
Instance process cleanup queue and its own KV driver state.

@return {Object} result - Runtime objects for testing
@return {Object} result.Lib - Dependency container (Utils, Debug, Instance, KV)
@return {Object} result.Config - Test-wide environment values
@return {Object} result.instance - Default request instance
@return {Function} result.buildLib - (instance_config) => { Lib, instance }
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


  // Build a Lib container with a chosen Instance config. Each call
  // produces an independent Instance module (own process cleanup queue)
  // and an independent KV driver (own client state).
  const buildLib = function (instance_config) {

    const Lib = {};

    // Helper modules
    Lib.Utils = require('helper-utils')(Lib, {});
    Lib.Debug = require('helper-debug')(Lib, {});
    Lib.Instance = require('helper-instance')(Lib, instance_config);

    // Server helper modules
    Lib.KV = require('helper-kv-valkey')(Lib, config_kv);

    const instance = Lib.Instance.initialize();

    return { Lib, instance };
  };


  // Default: persistent deployment. Process-scoped teardown waits for
  // an explicit runProcessCleanup() call.
  const { Lib, instance } = buildLib({ CLOSE_ON_CLEANUP: false });


  // Return runtime objects
  return { Lib, Config, instance, buildLib };

};
