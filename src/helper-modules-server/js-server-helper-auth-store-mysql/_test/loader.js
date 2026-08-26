// Info: Test loader for helper-auth-store-mysql.
// Builds the Lib container so both Tier 1 (adapter unit tests, no auth.js)
// and Tier 3 (full auth lifecycle via the store contract suite) can share
// the same runtime objects. Sets Lib.SQL = Lib.MySQL so the injected-Lib
// factory can pick the driver by its generic key.
//
// MySQL connection settings are read exclusively from environment
// variables here - test.js never reads process.env directly.


/********************************************************************
Build the dependency container.

process.env is ONLY read here - never in test.js.

@return {Object} result
@return {Object} result.Lib    - { Utils, Debug, SQL, Crypto, Instance, MySQL }
*********************************************************************/
import utilsLoader from 'helper-utils';
import debugLoader from 'helper-debug';
import cryptoLoader from 'helper-crypto';
import instanceLoader from 'helper-instance';
import sqlMysqlLoader from 'helper-sql-mysql';
export default function loader () {

  const config_debug = { LOG_LEVEL: 'error' };

  const config_mysql = {
    HOST:     process.env.MYSQL_HOST     || '127.0.0.1',
    PORT:     parseInt(process.env.MYSQL_PORT || '3307', 10),
    DATABASE: process.env.MYSQL_DATABASE || 'test_db',
    USER:     process.env.MYSQL_USER     || 'test_user',
    PASSWORD: process.env.MYSQL_PASSWORD || 'test_pw'
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
  Lib.MySQL = sqlMysqlLoader(Lib, config_mysql);


  // The store factory now picks Lib.SQL from the shared container.
  // Alias MySQL so the adapter can use Lib.SQL without knowing the dialect.
  Lib.SQL = Lib.MySQL;


  return { Lib: Lib };

};
