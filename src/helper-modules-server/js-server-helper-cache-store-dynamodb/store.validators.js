// Info: Config validator for helper-cache-store-dynamodb.
// This adapter is a fully independent module that owns its own Validators.
// Called once at construction time. Throws Error on misconfiguration
// so the adapter fails before serving a single request.
//
// Singleton pattern: Lib and ERRORS are injected at loader time and
// close over the module-namespace validators object.
'use strict';


// Shared dependencies injected by loader (singleton pattern)
let Lib;
let ERRORS; // eslint-disable-line no-unused-vars


/********************************************************************
Loader. Injects Lib and ERRORS into the module-namespace validators object.

@param {Object} shared_libs - Dependency container (Utils, Debug)
@param {Object} errors      - Frozen error catalog

@return {Object} - Validators singleton
*********************************************************************/
module.exports = function loader (shared_libs, errors) {

  Lib = shared_libs;
  ERRORS = errors;

  return Validators;

};


//////////////////////////// Public Functions START //////////////////////////
const Validators = {


  /********************************************************************
  Validate the config object passed to the adapter loader.
  Throws on the first violation so misconfiguration surfaces
  immediately at boot time.

  @param {Object} config - Merged configuration object

  @return {void}
  *********************************************************************/
  validateConfig: function (config) {

    // TABLE_NAME is required and must be a non-empty string
    if (
      Lib.Utils.isNullOrUndefined(config.TABLE_NAME) ||
      !Lib.Utils.isString(config.TABLE_NAME) ||
      config.TABLE_NAME === ''
    ) {
      throw new Error('[helper-cache-store-dynamodb] config.TABLE_NAME is required (non-empty string)');
    }

    // PARTITION_KEY is required and must be a non-empty string
    if (
      Lib.Utils.isNullOrUndefined(config.PARTITION_KEY) ||
      !Lib.Utils.isString(config.PARTITION_KEY) ||
      config.PARTITION_KEY === ''
    ) {
      throw new Error('[helper-cache-store-dynamodb] config.PARTITION_KEY is required (non-empty string)');
    }

    // SORT_KEY is required and must be a non-empty string
    if (
      Lib.Utils.isNullOrUndefined(config.SORT_KEY) ||
      !Lib.Utils.isString(config.SORT_KEY) ||
      config.SORT_KEY === ''
    ) {
      throw new Error('[helper-cache-store-dynamodb] config.SORT_KEY is required (non-empty string)');
    }

    // VALUE_FIELD is required and must be a non-empty string
    if (
      Lib.Utils.isNullOrUndefined(config.VALUE_FIELD) ||
      !Lib.Utils.isString(config.VALUE_FIELD) ||
      config.VALUE_FIELD === ''
    ) {
      throw new Error('[helper-cache-store-dynamodb] config.VALUE_FIELD is required (non-empty string)');
    }

    // EXPIRY_FIELD is required and must be a non-empty string
    if (
      Lib.Utils.isNullOrUndefined(config.EXPIRY_FIELD) ||
      !Lib.Utils.isString(config.EXPIRY_FIELD) ||
      config.EXPIRY_FIELD === ''
    ) {
      throw new Error('[helper-cache-store-dynamodb] config.EXPIRY_FIELD is required (non-empty string)');
    }

    // LOCK_SORT_KEY_PREFIX is required and must be a non-empty string
    if (
      Lib.Utils.isNullOrUndefined(config.LOCK_SORT_KEY_PREFIX) ||
      !Lib.Utils.isString(config.LOCK_SORT_KEY_PREFIX) ||
      config.LOCK_SORT_KEY_PREFIX === ''
    ) {
      throw new Error('[helper-cache-store-dynamodb] config.LOCK_SORT_KEY_PREFIX is required (non-empty string)');
    }

  }


};//////////////////////////// Public Functions END ///////////////////////////
