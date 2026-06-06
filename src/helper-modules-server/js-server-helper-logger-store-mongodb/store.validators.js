// Info: Config validator for js-server-helper-logger-store-mongodb.
// Called once at construction time from the store.js loader.
// Throws Error on misconfiguration so the adapter fails before
// serving a single request.
//
// Singleton: Lib is injected once by the loader. Node.js require
// cache guarantees the same reference on every subsequent require.

'use strict';


// Shared dependency injected by loader
let Lib;


/////////////////////////// Module-Loader START //////////////////////////////

/********************************************************************
Singleton loader. Injects Lib and returns the module-scope
Validators object.

@param {Object} shared_libs - Dependency container (Utils)

@return {Object} - Public Validators interface
*********************************************************************/
module.exports = function loader (shared_libs) {

  // Inject shared dependency
  Lib = shared_libs;

  return Validators;

};///////////////////////////// Module-Loader END ///////////////////////////////



////////////////////////////// Public Functions START ////////////////////////
const Validators = {


  /********************************************************************
  Validate the config object passed to the adapter loader.
  Throws on the first violation so misconfiguration surfaces
  immediately at boot time.

  @param {Object} config - { collection_name, lib_mongodb }

  @return {void}
  *********************************************************************/
  validateConfig: function (config) {

    // config must be a non-null object
    if (
      Lib.Utils.isNullOrUndefined(config) ||
      !Lib.Utils.isObject(config)
    ) {
      throw new Error('[js-server-helper-logger-store-mongodb] config must be an object');
    }

    // collection_name is required and must be a non-empty string
    if (
      Lib.Utils.isNullOrUndefined(config.collection_name) ||
      !Lib.Utils.isString(config.collection_name) ||
      Lib.Utils.isEmptyString(config.collection_name)
    ) {
      throw new Error('[js-server-helper-logger-store-mongodb] config.collection_name is required');
    }

    // lib_mongodb is required - the caller must inject the MongoDB helper
    if (Lib.Utils.isNullOrUndefined(config.lib_mongodb)) {
      throw new Error('[js-server-helper-logger-store-mongodb] config.lib_mongodb is required (pass Lib.MongoDB)');
    }

  }


};////////////////////////////// Public Functions END //////////////////////////
