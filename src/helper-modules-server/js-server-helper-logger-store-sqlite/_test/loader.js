// Info: Test loader for helper-logger-store-sqlite.
// Builds the Lib container so both Tier 1 (adapter unit tests, no
// logger.js) and Tier 3 (full logger lifecycle via the store contract
// suite) can share the same runtime objects.
//
// SQLite is offline - no Docker, no network. SQLITE_FILE defaults to
// :memory: so tests always start from a clean state.
'use strict';


/********************************************************************
Build the dependency container.

process.env is ONLY read here - never in test.js.

@return {Object} result
@return {Object} result.Lib - { Utils, Debug, Crypto, Instance, SQLite }
*********************************************************************/
module.exports = function loader () {

  const config_debug = { LOG_LEVEL: 'error' };

  const config_sqlite = {
    FILE: process.env.SQLITE_FILE || ':memory:'
  };


  // ==================== DEPENDENCY CONTAINER ======================= //

  const Lib = {};


  // ==================== FOUNDATION MODULES ========================= //

  Lib.Utils = require('helper-utils')(Lib, {});
  Lib.Debug = require('helper-debug')(Lib, config_debug);


  // ==================== SERVER HELPER MODULES ====================== //

  Lib.Crypto = require('helper-crypto')(Lib, {});
  Lib.Instance = require('helper-instance')(Lib, {});
  Lib.SQLite = require('helper-sql-sqlite')(Lib, config_sqlite);
  Lib.SQL = Lib.SQLite;


  return { Lib: Lib };

};
