// Info: Config validator for js-server-helper-logger-store-mysql.
'use strict';

let Lib;

module.exports = function loader (shared_libs) {
  Lib = shared_libs;
  return Validators;
};

const Validators = {

  validateConfig: function (config) {

    if (
      Lib.Utils.isNullOrUndefined(config) ||
      !Lib.Utils.isObject(config)
    ) {
      throw new Error('[js-server-helper-logger-store-mysql] config must be an object');
    }

    if (
      Lib.Utils.isNullOrUndefined(config.table_name) ||
      !Lib.Utils.isString(config.table_name) ||
      Lib.Utils.isEmptyString(config.table_name)
    ) {
      throw new Error('[js-server-helper-logger-store-mysql] config.table_name is required');
    }

    if (Lib.Utils.isNullOrUndefined(config.lib_sql)) {
      throw new Error('[js-server-helper-logger-store-mysql] config.lib_sql is required (pass Lib.MySQL)');
    }

  }

};
