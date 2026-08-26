// Info: Test loader for js-server-helper-cache-store-valkey.
// Mirrors the main project loader pattern: reads environment variables,
// builds Lib container, returns { Lib, Config }. Same loader works for
// both emulated (Docker Valkey) and integration (real server) testing.

import helperUtils from 'helper-utils';
import helperDebug from 'helper-debug';
import helperInstance from 'helper-instance';
import helperKvValkey from 'helper-kv-valkey';


/********************************************************************
Load all test dependencies and build the Lib container from environment.

process.env is ONLY read here - never in test.js.

@return {Object} result - Runtime objects for testing
@return {Object} result.Lib - Dependency container (Utils, Debug, Instance, KV)
@return {Object} result.Config - Test-wide environment values
*********************************************************************/
export default function loader () {

  // Test-wide environment config
  const Config = {
    valkey_host: process.env.VALKEY_HOST || 'localhost',
    valkey_port: parseInt(process.env.VALKEY_PORT, 10) || 6381
  };

  // Sub-configs: each helper module receives ONLY its relevant slice
  const config_kv = {
    HOST: Config.valkey_host,
    PORT: Config.valkey_port
  };


  // Dependencies for this instance
  const Lib = {};

  // Helper modules
  Lib.Utils = helperUtils(Lib, {});
  Lib.Debug = helperDebug(Lib, {});
  Lib.Instance = helperInstance(Lib, {});

  // Server helper modules
  Lib.KV = helperKvValkey(Lib, config_kv);


  // Return runtime objects
  return { Lib, Config };

};
