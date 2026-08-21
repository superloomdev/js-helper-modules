// Info: Config validator for helper-cache-store-valkey.
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

    // KEY_PREFIX is required and must be a non-empty string
    if (
      Lib.Utils.isNullOrUndefined(config.KEY_PREFIX) ||
      !Lib.Utils.isString(config.KEY_PREFIX) ||
      config.KEY_PREFIX === ''
    ) {
      throw new Error('[helper-cache-store-valkey] config.KEY_PREFIX is required (non-empty string)');
    }

    // KEY_SEPARATOR is required and must be a non-empty string
    if (
      Lib.Utils.isNullOrUndefined(config.KEY_SEPARATOR) ||
      !Lib.Utils.isString(config.KEY_SEPARATOR) ||
      config.KEY_SEPARATOR === ''
    ) {
      throw new Error('[helper-cache-store-valkey] config.KEY_SEPARATOR is required (non-empty string)');
    }

    // LOCK_KEY_PREFIX is required and must be a non-empty string
    if (
      Lib.Utils.isNullOrUndefined(config.LOCK_KEY_PREFIX) ||
      !Lib.Utils.isString(config.LOCK_KEY_PREFIX) ||
      config.LOCK_KEY_PREFIX === ''
    ) {
      throw new Error('[helper-cache-store-valkey] config.LOCK_KEY_PREFIX is required (non-empty string)');
    }

  }


};//////////////////////////// Public Functions END ///////////////////////////
