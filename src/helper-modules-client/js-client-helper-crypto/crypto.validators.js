// Info: Config validators for helper-crypto.
// Validates CONFIG.BASE36_CHARSET at loader time.
//
// Singleton: Lib and ERRORS injected once by loader. No factory needed.
'use strict';


// Shared dependencies injected by loader - never self-required
let Lib;
let ERRORS; // eslint-disable-line no-unused-vars


/////////////////////////// Module-Loader START ////////////////////////////////

/********************************************************************
Singleton loader. Injects Lib and ERRORS and returns the module-scope
Validators object. Takes no CONFIG - validators run before config is
validated; per-call validators receive CONFIG as an argument.

@param {Object} shared_libs - Dependency container (Utils)
@param {Object} errors - Frozen error catalog owned by the main module

@return {Object} - Public Validators interface
*********************************************************************/
module.exports = function loader (shared_libs, errors) {

  // Inject shared dependencies
  Lib = shared_libs;
  ERRORS = errors;

  // Return the Validators interface
  return Validators;

};///////////////////////////// Module-Loader END ///////////////////////////////



///////////////////////////Public Functions START//////////////////////////////
const Validators = {

  // ~~~~~~~~~~~~~~~~~~~~ Config Validators ~~~~~~~~~~~~~~~~~~~~
  // Called once at construction time from the crypto.js loader.
  // Throw Error (not TypeError) because misconfiguration is a setup error,
  // not a programmer call error.

  /********************************************************************
  Validate the merged CONFIG. Throws on every violation so the loader
  fails before serving a single request.

  @param {Object} config - Merged module configuration

  @return {void}
  *********************************************************************/
  validateConfig: function (config) {

    // BASE36_CHARSET must be a non-empty string
    if (!Lib.Utils.isString(config.BASE36_CHARSET) || config.BASE36_CHARSET.length === 0) {
      throw new Error(
        '[helper-crypto] CONFIG.BASE36_CHARSET must be a non-empty string'
      );
    }

  }

};///////////////////////////Public Functions END//////////////////////////////
