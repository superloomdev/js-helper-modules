// Info: Config validator for helper-http-gateway-adapter-aws-apigateway.
// Called once at construction time from the loader to validate CONFIG.
// Throws Error on misconfiguration so the adapter fails before serving
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
@param {Object} errors - Frozen error catalog (adapter.errors.js)

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
  loader fails before the adapter is used.

  @param {Object} config - Merged adapter configuration

  @return {void}
  *********************************************************************/
  validateConfig: function (config) { // eslint-disable-line no-unused-vars

    // No config keys to validate beyond LOG_LEVEL (string check deferred
    // to the Debug module's own config validation). Replace with real
    // checks when the first adapter-specific config key is added.

  }


};////////////////////////////// Public Functions END //////////////////////////
