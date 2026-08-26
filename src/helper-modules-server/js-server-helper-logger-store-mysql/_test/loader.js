// Info: Test loader for helper-logger-store-mysql.

import utilsLoader from 'helper-utils';
import debugLoader from 'helper-debug';
import cryptoLoader from 'helper-crypto';
import instanceLoader from 'helper-instance';
import sqlMysqlLoader from 'helper-sql-mysql';

/********************************************************************
@return {Object} result
@return {Object} result.Lib - { Utils, Debug, Crypto, Instance, MySQL }
*********************************************************************/
export default function loader () {

  const config_debug = { LOG_LEVEL: 'error' };

  const config_mysql = {
    HOST:     process.env.MYSQL_HOST     || '127.0.0.1',
    PORT:     parseInt(process.env.MYSQL_PORT || '3308', 10),
    DATABASE: process.env.MYSQL_DATABASE || 'test_db',
    USER:     process.env.MYSQL_USER     || 'test_user',
    PASSWORD: process.env.MYSQL_PASSWORD || 'test_pw'
  };


  // ==================== DEPENDENCY CONTAINER ======================= //

  const Lib = {};

  Lib.Utils = utilsLoader(Lib, {});
  Lib.Debug = debugLoader(Lib, config_debug);
  Lib.Crypto = cryptoLoader(Lib, {});
  Lib.Instance = instanceLoader(Lib, {});
  Lib.MySQL = sqlMysqlLoader(Lib, config_mysql);
  Lib.SQL = Lib.MySQL;


  return { Lib: Lib };

};
