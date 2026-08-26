// Info: Test loader for js-server-helper-mysql.
// Mirrors the main project loader pattern: reads environment variables,
// builds Lib container, returns { Lib, Config, instance, buildLib }.
// Same loader works for both emulated (Docker MySQL 8) and integration
// (real database) testing.
import helperUtils from 'helper-utils';
import helperDebug from 'helper-debug';
import helperInstance from 'helper-instance';
import helperSqlMysql from 'helper-sql-mysql';


/********************************************************************
Load all test dependencies and build the Lib container from environment.

process.env is ONLY read here - never in test.js.

Returns a default Lib configured as a persistent deployment
(CLOSE_ON_CLEANUP false), plus a builder so a test can construct a
fresh Lib configured as a serverless deployment (CLOSE_ON_CLEANUP
true). Each builder call returns an independent Lib with its own
Instance process cleanup queue and its own MySQL driver state, so
tests cannot leak state into one another.

@return {Object} result - Runtime objects for testing
@return {Object} result.Lib - Dependency container (Utils, Debug, Instance, MySQL)
@return {Object} result.Config - Test-wide environment values (admin credentials, etc.)
@return {Object} result.instance - Default request instance
@return {Function} result.buildLib - (instance_config) => { Lib, instance }
*********************************************************************/
export default function loader () {

  // Test-wide environment config - available to test.js for AdminClient setup
  const Config = {
    mysql_host: process.env.MYSQL_HOST,
    mysql_port: parseInt(process.env.MYSQL_PORT, 10),
    mysql_database: process.env.MYSQL_DATABASE,
    mysql_user: process.env.MYSQL_USER,
    mysql_password: process.env.MYSQL_PASSWORD,
    mysql_root_password: process.env.MYSQL_ROOT_PASSWORD
  };

  // Sub-configs: each helper module receives ONLY its relevant slice
  const config_mysql = {
    HOST: Config.mysql_host,
    PORT: Config.mysql_port,
    DATABASE: Config.mysql_database,
    USER: Config.mysql_user,
    PASSWORD: Config.mysql_password,
    POOL_MAX: 5,
    POOL_MAX_IDLE: 4
  };


  // Build a Lib container with a chosen Instance config. Each call
  // produces an independent Instance module (own process cleanup queue)
  // and an independent MySQL driver (own pool state).
  const buildLib = function (instance_config) {

    const Lib = {};

    // Helper modules
    Lib.Utils = helperUtils(Lib, {});
    Lib.Debug = helperDebug(Lib, {});
    Lib.Instance = helperInstance(Lib, instance_config);

    // Server helper modules
    Lib.MySQL = helperSqlMysql(Lib, config_mysql);

    const instance = Lib.Instance.initialize();

    return { Lib, instance };
  };


  // Default: persistent deployment. Process-scoped teardown waits for
  // an explicit runProcessCleanup() call.
  const { Lib, instance } = buildLib({ CLOSE_ON_CLEANUP: false });


  // Return runtime objects
  return { Lib, Config, instance, buildLib };

};
