// Info: Test loader for helper-auth-store-sqlite.
// Builds the Lib container so both Tier 1 (adapter unit tests, no auth.js)
// and Tier 3 (full auth lifecycle via the store contract suite) can share
// the same runtime objects. Sets Lib.SQL = Lib.SQLite so the injected-Lib
// factory can pick the driver by its generic key.
//
// SQLite is offline - no Docker, no network. SQLITE_FILE defaults to
// :memory: so tests always start from a clean state.
'use strict';


/********************************************************************
Build the dependency container.

process.env is ONLY read here - never in test.js.

@return {Object} result
@return {Object} result.Lib    - { Utils, Debug, SQL, Crypto, Instance, SQLite }
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
  Lib.HttpGateway = {
    buildCookie: function (existing, name, value, ttl) {
      const descriptor = existing ? Object.assign({}, existing) : {};
      descriptor[name] = { value: value, ttl: ttl, options: {} };
      return descriptor;
    }
  };
  Lib.SQLite = require('helper-sql-sqlite')(Lib, config_sqlite);


  // The store factory now picks Lib.SQL from the shared container.
  // Alias SQLite so the adapter can use Lib.SQL without knowing the dialect.
  Lib.SQL = Lib.SQLite;


  return { Lib: Lib };

};
