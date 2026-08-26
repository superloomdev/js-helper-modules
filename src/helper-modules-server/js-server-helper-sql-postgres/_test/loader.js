// Info: Test loader for js-server-helper-postgres.
// Mirrors the main project loader pattern: reads environment variables,
// builds Lib container, returns { Lib, Config, buildLib }. Same loader
// works for both emulated (Docker Postgres) and integration (real
// database) testing.
'use strict';


/********************************************************************
Load all test dependencies and build the Lib container from environment.

process.env is ONLY read here - never in test.js.

Returns a default Lib configured as a persistent deployment
(CLOSE_ON_CLEANUP false), plus a builder so a test can construct a
fresh Lib configured as a serverless deployment (CLOSE_ON_CLEANUP
true). Each builder call returns an independent Lib with its own
Instance process cleanup queue and its own Postgres driver state, so
tests cannot leak state into one another.

@return {Object} result - Runtime objects for testing
@return {Object} result.Lib - Dependency container (Utils, Debug, Instance, Postgres)
@return {Object} result.Config - Test-wide environment values (admin credentials, etc.)
@return {Function} result.buildLib - (instance_config) => { Lib, instance }
*********************************************************************/
module.exports = function loader () {

  // Test-wide environment config - available to test.js for AdminClient setup
  const Config = {
    postgres_host: process.env.POSTGRES_HOST,
    postgres_port: parseInt(process.env.POSTGRES_PORT, 10),
    postgres_database: process.env.POSTGRES_DATABASE,
    postgres_user: process.env.POSTGRES_USER,
    postgres_password: process.env.POSTGRES_PASSWORD
  };

  // Sub-configs: each helper module receives ONLY its relevant slice
  const config_postgres = {
    HOST: Config.postgres_host,
    PORT: Config.postgres_port,
    DATABASE: Config.postgres_database,
    USER: Config.postgres_user,
    PASSWORD: Config.postgres_password,
    POOL_MAX: 5,
    ALLOW_EXIT_ON_IDLE: true
  };


  // Build a Lib container with a chosen Instance config. Each call
  // produces an independent Instance module (own process cleanup queue)
  // and an independent Postgres driver (own pool state).
  const buildLib = function (instance_config) {

    const Lib = {};

    // Helper modules
    Lib.Utils = require('helper-utils')(Lib, {});
    Lib.Debug = require('helper-debug')(Lib, {});
    Lib.Instance = require('helper-instance')(Lib, instance_config);

    // Server helper modules
    Lib.Postgres = require('helper-sql-postgres')(Lib, config_postgres);

    const instance = Lib.Instance.initialize();

    return { Lib, instance };
  };


  // Default: persistent deployment. Process-scoped teardown waits for
  // an explicit runProcessCleanup() call.
  const { Lib, instance } = buildLib({ CLOSE_ON_CLEANUP: false });


  // Return runtime objects
  return { Lib, Config, instance, buildLib };

};
