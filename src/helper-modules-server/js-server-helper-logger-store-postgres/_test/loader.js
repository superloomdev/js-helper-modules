// Info: Test loader for helper-logger-store-postgres.
// Builds the Lib container so both Tier 1 (adapter unit tests, no
// logger.js) and Tier 3 (full logger lifecycle via the store contract
// suite) can share the same runtime objects.
//
// Requires a running Postgres instance. In CI and local testing this
// is provided by docker-compose.yml managed by the pretest/posttest
// npm scripts.
import utilsLoader from 'helper-utils';
import debugLoader from 'helper-debug';
import cryptoLoader from 'helper-crypto';
import instanceLoader from 'helper-instance';
import sqlPostgresLoader from 'helper-sql-postgres';

/********************************************************************
Build the dependency container.

process.env is ONLY read here - never in test.js.

@return {Object} result
@return {Object} result.Lib - { Utils, Debug, Crypto, Instance, Postgres }
*********************************************************************/
export default function loader () {

  const config_debug = { LOG_LEVEL: 'error' };

  const config_postgres = {
    HOST:     process.env.POSTGRES_HOST,
    PORT:     parseInt(process.env.POSTGRES_PORT, 10),
    DATABASE: process.env.POSTGRES_DATABASE,
    USER:     process.env.POSTGRES_USER,
    PASSWORD: process.env.POSTGRES_PASSWORD,
    POOL_MAX: 5
  };


  // ==================== DEPENDENCY CONTAINER ======================= //

  const Lib = {};


  // ==================== FOUNDATION MODULES ========================= //

  Lib.Utils = utilsLoader(Lib, {});
  Lib.Debug = debugLoader(Lib, config_debug);


  // ==================== SERVER HELPER MODULES ====================== //

  Lib.Crypto = cryptoLoader(Lib, {});
  Lib.Instance = instanceLoader(Lib, {});
  Lib.Postgres = sqlPostgresLoader(Lib, config_postgres);
  Lib.SQL = Lib.Postgres;


  return { Lib: Lib };

};
