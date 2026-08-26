// Info: Test loader for helper-verify-store-postgres.
// Builds the Lib container and a minimal ERRORS stub so both Tier 1
// (adapter unit tests, no verify.js) and Tier 3 (full verify lifecycle
// via the store contract suite) can share the same runtime objects.
//
// Requires a running Postgres instance. In CI and local testing this
// is provided by docker-compose.yml managed by the pretest/posttest
// npm scripts.

import helperUtils from 'helper-utils';
import helperDebug from 'helper-debug';
import helperCrypto from 'helper-crypto';
import helperInstance from 'helper-instance';
import helperSqlPostgres from 'helper-sql-postgres';


/********************************************************************
Build the dependency container and a minimal ERRORS catalog.

process.env is ONLY read here - never in test.js.

@return {Object} result
@return {Object} result.Lib    - { Utils, Debug, Crypto, Instance, Postgres }
@return {Object} result.ERRORS - Minimal error catalog (SERVICE_UNAVAILABLE only)
*********************************************************************/
export default function loader () {

  const config_debug = { LOG_LEVEL: 'error' };

  const config_postgres = {
    HOST: process.env.POSTGRES_HOST,
    PORT: parseInt(process.env.POSTGRES_PORT, 10),
    DATABASE: process.env.POSTGRES_DATABASE,
    USER: process.env.POSTGRES_USER,
    PASSWORD: process.env.POSTGRES_PASSWORD,
    POOL_MAX: 5
  };


  // ==================== DEPENDENCY CONTAINER ======================= //

  const Lib = {};


  // ==================== FOUNDATION MODULES ========================= //

  Lib.Utils = helperUtils(Lib, {});
  Lib.Debug = helperDebug(Lib, config_debug);


  // ==================== SERVER HELPER MODULES ====================== //

  Lib.Crypto = helperCrypto(Lib, {});
  Lib.Instance = helperInstance(Lib, {});
  Lib.SQL = helperSqlPostgres(Lib, config_postgres);
  Lib.Postgres = Lib.SQL;


  // ==================== MINIMAL ERRORS CATALOG ===================== //

  // Tier 1 tests call the store loader directly (no verify.js). The
  // store requires only SERVICE_UNAVAILABLE from ERRORS. Tier 3 tests
  // load verify.js which supplies its own full ERRORS catalog internally.
  const ERRORS = {
    SERVICE_UNAVAILABLE: {
      type: 'SERVICE_UNAVAILABLE',
      message: 'Service unavailable'
    }
  };


  return { Lib: Lib, ERRORS: ERRORS };

};
