// Info: Config validator for helper-verify-store-sqlite.
// This adapter is a fully independent module that owns its own Lib.
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

  // Assign to module-namespace vars so validators can close over them
  Lib = shared_libs;
  ERRORS = errors;

  return Validators;

};


const Validators = {


  /********************************************************************
  Validate the config object passed to the adapter loader.
  Throws on the first violation so misconfiguration surfaces
  immediately at boot time.

  @param {Object} config - Configuration object

  @return {void}
  *********************************************************************/
  validateConfig: function (config) {

    // config must be a non-null object
    if (
      Lib.Utils.isNullOrUndefined(config) ||
      !Lib.Utils.isObject(config)
    ) {
      throw new Error('[helper-verify-store-sqlite] config must be an object');
    }

    // TABLE_NAME is required and must be a non-empty string
    if (
      Lib.Utils.isNullOrUndefined(config.TABLE_NAME) ||
      !Lib.Utils.isString(config.TABLE_NAME) ||
      Lib.Utils.isEmptyString(config.TABLE_NAME)
    ) {
      throw new Error('[helper-verify-store-sqlite] config.TABLE_NAME is required');
    }

  }

};
