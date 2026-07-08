// Info: Config validator for helper-verify-store-mongodb.
// This adapter is a fully independent module that owns its own Validators.
// Called once at construction time. Throws Error on misconfiguration
// so the adapter fails before serving a single request.
//
// Singleton pattern: Lib and ERRORS are injected at loader time and
// close over the module-scope validators object.
'use strict';


// Shared dependencies injected by loader (singleton pattern)
let Lib;
let ERRORS; // eslint-disable-line no-unused-vars


/********************************************************************
Loader. Injects Lib and ERRORS into the module-scope validators object.

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

    // collection_name is required and must be a non-empty string
    if (
      Lib.Utils.isNullOrUndefined(config.collection_name) ||
      !Lib.Utils.isString(config.collection_name) ||
      Lib.Utils.isEmptyString(config.collection_name)
    ) {
      throw new Error('[helper-verify-store-mongodb] config.collection_name is required');
    }

  }

};//////////////////////////// Public Functions END ///////////////////////////
