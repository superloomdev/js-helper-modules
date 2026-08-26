// Info: Test loader for helper-auth-store-postgres.
// Builds the Lib container so both Tier 1 (adapter unit tests, no auth.js)
// and Tier 3 (full auth lifecycle via the store contract suite) can share
// the same runtime objects. Sets Lib.SQL = Lib.Postgres so the injected-Lib
// factory can pick the driver by its generic key.
//
// Requires a running Postgres instance. In CI and local testing this
// is provided by docker-compose.yml managed by the pretest/posttest
// npm scripts.


/********************************************************************
Build the dependency container.

process.env is ONLY read here - never in test.js.

@return {Object} result
@return {Object} result.Lib    - { Utils, Debug, SQL, Crypto, Instance, Postgres }
*********************************************************************/
import utilsLoader from 'helper-utils';
import debugLoader from 'helper-debug';
import cryptoLoader from 'helper-crypto';
import instanceLoader from 'helper-instance';
import sqlPostgresLoader from 'helper-sql-postgres';
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

  Lib.Utils = utilsLoader(Lib, {});
  Lib.Debug = debugLoader(Lib, config_debug);


  // ==================== SERVER HELPER MODULES ====================== //

  Lib.Crypto = cryptoLoader(Lib, {});
  Lib.Instance = instanceLoader(Lib, {});
  Lib.HttpGateway = {
    buildCookie: function (existing, name, value, ttl) {
      const descriptor = existing ? Object.assign({}, existing) : {};
      descriptor[name] = { value: value, ttl: ttl, options: {} };
      return descriptor;
    }
  };
  Lib.Postgres = sqlPostgresLoader(Lib, config_postgres);


  // The store factory now picks Lib.SQL from the shared container.
  // Alias Postgres so the adapter can use Lib.SQL without knowing the dialect.
  Lib.SQL = Lib.Postgres;


  return { Lib: Lib };

};
