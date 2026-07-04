// Info: Config validator for js-server-helper-sql-sqlite.
// Called once at construction time from the loader to validate CONFIG.
// Throws Error on misconfiguration so the module fails before serving
// a single request.
//
// Singleton: Lib and ERRORS injected once by the loader. Node.js require
// cache guarantees the same reference on every subsequent require.
'use strict';


// Shared dependencies injected by loader
let Lib; // eslint-disable-line no-unused-vars
let ERRORS; // eslint-disable-line no-unused-vars


/////////////////////////// Module-Loader START ////////////////////////////////

/********************************************************************
Singleton loader. Injects Lib and ERRORS, then returns the module-scope
Validators object. Takes Lib and ERRORS - no CONFIG - because validators
run before CONFIG is validated.

@param {Object} shared_libs - Dependency container (Utils, Debug)
@param {Object} errors - Frozen error catalog (sqlite.errors.js)

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
  validateConfig: function (config) { // eslint-disable-line no-unused-vars

    // No config keys to validate yet. Replace with real checks when
    // the first module-specific config validation is needed.

  }


};////////////////////////////// Public Functions END //////////////////////////
