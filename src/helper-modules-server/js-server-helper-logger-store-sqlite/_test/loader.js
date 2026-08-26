// Info: Test loader for helper-logger-store-sqlite.
// Builds the Lib container so both Tier 1 (adapter unit tests, no
// logger.js) and Tier 3 (full logger lifecycle via the store contract
// suite) can share the same runtime objects.
//
// SQLite is offline - no Docker, no network. SQLITE_FILE defaults to
// :memory: so tests always start from a clean state.


/********************************************************************
Build the dependency container.

process.env is ONLY read here - never in test.js.

@return {Object} result
@return {Object} result.Lib - { Utils, Debug, Crypto, Instance, SQLite }
*********************************************************************/
import utilsLoader from 'helper-utils';
import debugLoader from 'helper-debug';
import cryptoLoader from 'helper-crypto';
import instanceLoader from 'helper-instance';
import sqlSqliteLoader from 'helper-sql-sqlite';
export default function loader () {

  const config_debug = { LOG_LEVEL: 'error' };

  const config_sqlite = {
    FILE: process.env.SQLITE_FILE || ':memory:'
  };


  // ==================== DEPENDENCY CONTAINER ======================= //

  const Lib = {};


  // ==================== FOUNDATION MODULES ========================= //

  Lib.Utils = utilsLoader(Lib, {});
  Lib.Debug = debugLoader(Lib, config_debug);


  // ==================== SERVER HELPER MODULES ====================== //

  Lib.Crypto = cryptoLoader(Lib, {});
  Lib.Instance = instanceLoader(Lib, {});
  Lib.SQLite = sqlSqliteLoader(Lib, config_sqlite);
  Lib.SQL = Lib.SQLite;


  return { Lib: Lib };

};
