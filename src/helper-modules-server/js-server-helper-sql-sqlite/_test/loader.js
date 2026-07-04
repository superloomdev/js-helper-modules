// Info: Test loader for js-server-helper-sqlite.
// Mirrors the main project loader pattern: reads environment variables,
// builds Lib container, returns { Lib, Config }.
//
// SQLite is offline by default - if SQLITE_FILE is unset the tests run
// against an in-memory database. Point SQLITE_FILE at a file path to test
// on-disk behavior (journal_mode=WAL, etc.).
'use strict';


/********************************************************************
Load all test dependencies and build the Lib container from environment.

process.env is ONLY read here - never in test.js.

@return {Object} result - Runtime objects for testing
@return {Object} result.Lib - Dependency container (Utils, Debug, Instance, SQLite)
@return {Object} result.Config - Test-wide environment values
*********************************************************************/
module.exports = function loader () {

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


  // Dependencies for this instance
  const Lib = {};

  // Helper modules
  Lib.Utils = require('helper-utils')(Lib, {});
  Lib.Debug = require('helper-debug')(Lib, {});
  Lib.Instance = require('helper-instance')(Lib, {});

  // Server helper modules
  Lib.SQLite = require('helper-sql-sqlite')(Lib, config_sqlite);


  // Return runtime objects
  return { Lib, Config };

};
