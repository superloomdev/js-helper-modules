// Info: Test loader for helper-logger-store-mysql.
'use strict';


/********************************************************************
@return {Object} result
@return {Object} result.Lib - { Utils, Debug, Crypto, Instance, MySQL }
*********************************************************************/
module.exports = function loader () {

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

  Lib.Utils = require('helper-utils')(Lib, {});
  Lib.Debug = require('helper-debug')(Lib, config_debug);
  Lib.Crypto = require('helper-crypto')(Lib, {});
  Lib.Instance = require('helper-instance')(Lib, {});
  Lib.MySQL = require('helper-sql-mysql')(Lib, config_mysql);
  Lib.SQL = Lib.MySQL;


  return { Lib: Lib };

};
