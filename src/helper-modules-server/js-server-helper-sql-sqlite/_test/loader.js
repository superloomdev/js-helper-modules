// Info: Test loader for js-server-helper-sqlite.
// Mirrors the main project loader pattern: reads environment variables,
// builds Lib container, returns { Lib, Config, instance, buildLib }.
//
// SQLite is offline by default - if SQLITE_FILE is unset the tests run
// against an in-memory database. Point SQLITE_FILE at a file path to test
// on-disk behavior (journal_mode=WAL, etc.).
import helperUtils from 'helper-utils';
import helperDebug from 'helper-debug';
import helperInstance from 'helper-instance';
import helperSqlSqlite from 'helper-sql-sqlite';


/********************************************************************
Load all test dependencies and build the Lib container from environment.

process.env is ONLY read here - never in test.js.

Returns a default Lib configured as a persistent deployment
(CLOSE_ON_CLEANUP false), plus a builder so a test can construct a
fresh Lib configured as a serverless deployment (CLOSE_ON_CLEANUP
true). Each builder call returns an independent Lib with its own
Instance process cleanup queue and its own SQLite driver state, so
tests cannot leak state into one another.

@return {Object} result - Runtime objects for testing
@return {Object} result.Lib - Dependency container (Utils, Debug, Instance, SQLite)
@return {Object} result.Config - Test-wide environment values
@return {Object} result.instance - Default request instance
@return {Function} result.buildLib - (instance_config) => { Lib, instance }
*********************************************************************/
export default function loader () {

  // Test-wide environment config - available to test.js for admin-DB setup
  const Config = {
    sqlite_file: process.env.SQLITE_FILE || ':memory:'
  };

  // Sub-configs: each helper module receives ONLY its relevant slice
  const config_sqlite = {
    FILE: Config.sqlite_file,
    // Keep journal_mode defaults simple for tests; skip WAL for :memory:
    JOURNAL_MODE: Config.sqlite_file === ':memory:' ? 'MEMORY' : 'WAL',
    SYNCHRONOUS: 'NORMAL'
  };


  // Build a Lib container with a chosen Instance config. Each call
  // produces an independent Instance module (own process cleanup queue)
  // and an independent SQLite driver (own handle state).
  const buildLib = function (instance_config) {

    const Lib = {};

    // Helper modules
    Lib.Utils = helperUtils(Lib, {});
    Lib.Debug = helperDebug(Lib, {});
    Lib.Instance = helperInstance(Lib, instance_config);

    // Server helper modules
    Lib.SQLite = helperSqlSqlite(Lib, config_sqlite);

    const instance = Lib.Instance.initialize();

    return { Lib, instance };
  };


  // Default: persistent deployment. Process-scoped teardown waits for
  // an explicit runProcessCleanup() call.
  const { Lib, instance } = buildLib({ CLOSE_ON_CLEANUP: false });


  // Return runtime objects
  return { Lib, Config, instance, buildLib };

};
