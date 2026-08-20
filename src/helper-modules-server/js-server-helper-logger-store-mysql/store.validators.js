// Info: Config validator for helper-logger-store-mysql.
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
      Lib.Utils.isNullOrUndefined(config.TABLE_NAME) ||
      !Lib.Utils.isString(config.TABLE_NAME) ||
      Lib.Utils.isEmptyString(config.TABLE_NAME)
    ) {
      throw new Error('[helper-logger-store-mysql] config.TABLE_NAME is required');
    }

  }

};
