// Info: Config validator for helper-logger-store-postgres.
'use strict';

let Lib;
let ERRORS; // eslint-disable-line no-unused-vars

module.exports = function loader (shared_libs, errors) {
  Lib = shared_libs;
  ERRORS = errors;
  return Validators;
};

const Validators = {

  validateConfig: function (config) {

    if (
      Lib.Utils.isNullOrUndefined(config.table_name) ||
      !Lib.Utils.isString(config.table_name) ||
      Lib.Utils.isEmptyString(config.table_name)
    ) {
      throw new Error('[helper-logger-store-postgres] config.table_name is required');
    }

  }

};
