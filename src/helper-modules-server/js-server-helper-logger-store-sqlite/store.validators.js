// Info: Config validator for helper-logger-store-sqlite.
// Called once at construction time from the store.js loader.
// Throws Error on misconfiguration so the adapter fails before
// serving a single request.
//
// Singleton pattern: Lib and ERRORS are injected at loader time and
// close over the module-scope validators object.
'use strict';


// Shared dependencies injected by loader (singleton pattern)
let Lib;
let ERRORS; // eslint-disable-line no-unused-vars


/////////////////////////// Module-Loader START ////////////////////////////////

/********************************************************************
Singleton loader. Injects Lib and ERRORS into the module-scope
Validators object.

@param {Object} shared_libs - Dependency container (Utils, Debug)
@param {Object} errors      - Frozen error catalog

@return {Object} - Public Validators interface
*********************************************************************/
module.exports = function loader (shared_libs, errors) {

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

  @param {Object} config - Merged configuration object

  @return {void}
  *********************************************************************/
  validateConfig: function (config) {

    // table_name is required and must be a non-empty string
    if (
      Lib.Utils.isNullOrUndefined(config.table_name) ||
      !Lib.Utils.isString(config.table_name) ||
      Lib.Utils.isEmptyString(config.table_name)
    ) {
      throw new Error('[helper-logger-store-sqlite] config.table_name is required');
    }

  }

};////////////////////////////// Public Functions END ////////////////////////
