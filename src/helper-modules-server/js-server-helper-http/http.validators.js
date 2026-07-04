// Info: Config validator for js-server-helper-http.
// Called once at construction time from the loader to validate CONFIG.
// Throws Error on misconfiguration so the module fails before serving
// a single request.
//
// Singleton: Lib and ERRORS injected once by the loader. Node.js require
// cache guarantees the same reference on every subsequent require.
'use strict';


// Shared dependencies injected by loader
let Lib;
let ERRORS; // eslint-disable-line no-unused-vars


/////////////////////////// Module-Loader START ////////////////////////////////

/********************************************************************
Singleton loader. Injects Lib and ERRORS, then returns the module-scope
Validators object. Takes Lib and ERRORS - no CONFIG - because validators
run before CONFIG is validated.

@param {Object} shared_libs - Dependency container (Utils, Debug)
@param {Object} errors - Frozen error catalog (http.errors.js)

@return {Object} - Public Validators interface
*********************************************************************/
module.exports = function loader (shared_libs, errors) {

  // Inject shared dependencies
  Lib = shared_libs;
  ERRORS = errors;

  // Return the Validators interface
  return Validators;

};///////////////////////////// Module-Loader END ///////////////////////////////



////////////////////////////// Public Functions START ////////////////////////
const Validators = {


  /********************************************************************
  Validate the merged CONFIG. Throws on any misconfiguration so the
  loader fails before the module is used.

  @param {Object} config - Merged module configuration

  @return {void}
  *********************************************************************/
  validateConfig: function (config) {

    // TIMEOUT must be a positive number if present
    if (config.TIMEOUT !== undefined && !Lib.Utils.isNumber(config.TIMEOUT)) {
      throw new Error('[js-server-helper-http] TIMEOUT must be a number');
    }

    if (config.TIMEOUT !== undefined && config.TIMEOUT <= 0) {
      throw new Error('[js-server-helper-http] TIMEOUT must be greater than 0');
    }

    // USER_AGENT must be a non-empty string if present
    if (config.USER_AGENT !== undefined && !Lib.Utils.isString(config.USER_AGENT)) {
      throw new Error('[js-server-helper-http] USER_AGENT must be a string');
    }

  }


};////////////////////////////// Public Functions END //////////////////////////
