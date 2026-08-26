// Info: Test loader for js-server-helper-cache-store-aws-elasticache.
// Mirrors the main project loader pattern: reads environment variables,
// builds Lib container, returns { Lib, Config }. Same loader works for
// both emulated (Docker Valkey as ElastiCache stand-in) and integration
// (real ElastiCache) testing.

import helperUtils from 'helper-utils';
import helperDebug from 'helper-debug';
import helperInstance from 'helper-instance';
import helperKvAwsElasticache from 'helper-kv-aws-elasticache';


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
    elasticache_host: process.env.ELASTICACHE_HOST || 'localhost',
    elasticache_port: parseInt(process.env.ELASTICACHE_PORT, 10) || 6382
  };

  // Sub-configs: each helper module receives ONLY its relevant slice.
  // For local testing, ENDPOINT is set to skip IAM auth and use plain
  // Redis protocol against the Valkey container.
  const config_kv = {
    HOST: Config.elasticache_host,
    PORT: Config.elasticache_port,
    TLS: false,
    ENDPOINT: 'local'
  };


  // Dependencies for this instance
  const Lib = {};

  // Helper modules
  Lib.Utils = helperUtils(Lib, {});
  Lib.Debug = helperDebug(Lib, {});
  Lib.Instance = helperInstance(Lib, {});

  // Server helper modules
  Lib.KV = helperKvAwsElasticache(Lib, config_kv);


  // Return runtime objects
  return { Lib, Config };

};
