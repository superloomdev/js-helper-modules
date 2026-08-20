// Info: Config validator for helper-logger-store-mongodb.
// Called once at construction time from the store.js loader.
// Throws Error on misconfiguration so the adapter fails before
// serving a single request.
//
// Singleton: Lib and ERRORS are injected once by the loader. Node.js require
// cache guarantees the same reference on every subsequent require.

'use strict';


// Shared dependencies injected by loader
let Lib;
let ERRORS; // eslint-disable-line no-unused-vars


/////////////////////////// Module-Loader START //////////////////////////////

/********************************************************************
Singleton loader. Injects Lib and ERRORS and returns the module-scope
Validators object.

@param {Object} shared_libs - Dependency container (Utils)
@param {Object} errors      - Frozen error catalog owned by the main module

@return {Object} - Public Validators interface
*********************************************************************/
module.exports = function loader (shared_libs, errors) {

  // Inject shared dependencies
  Lib = shared_libs;
  ERRORS = errors;

  return Validators;

};///////////////////////////// Module-Loader END ///////////////////////////////



////////////////////////////// Public Functions START ////////////////////////
const Validators = {


  /********************************************************************
  Validate the config object passed to the adapter loader.
  Throws on the first violation so misconfiguration surfaces
  immediately at boot time.

  @param {Object} config - { COLLECTION_NAME }

  @return {void}
  *********************************************************************/
  validateConfig: function (config) {

    // COLLECTION_NAME is required and must be a non-empty string
    if (
      Lib.Utils.isNullOrUndefined(config.COLLECTION_NAME) ||
      !Lib.Utils.isString(config.COLLECTION_NAME) ||
      Lib.Utils.isEmptyString(config.COLLECTION_NAME)
    ) {
      throw new Error('[helper-logger-store-mongodb] config.COLLECTION_NAME is required');
    }

  }


};////////////////////////////// Public Functions END //////////////////////////
