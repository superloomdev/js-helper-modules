// Info: Config validator for js-server-helper-logger-store-dynamodb.
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

  @param {Object} config - { table_name, lib_dynamodb }

  @return {void}
  *********************************************************************/
  validateConfig: function (config) {

    // config must be a non-null object
    if (
      Lib.Utils.isNullOrUndefined(config) ||
      !Lib.Utils.isObject(config)
    ) {
      throw new Error('[js-server-helper-logger-store-dynamodb] config must be an object');
    }

    // table_name is required and must be a non-empty string
    if (
      Lib.Utils.isNullOrUndefined(config.table_name) ||
      !Lib.Utils.isString(config.table_name) ||
      Lib.Utils.isEmptyString(config.table_name)
    ) {
      throw new Error('[js-server-helper-logger-store-dynamodb] config.table_name is required');
    }

    // lib_dynamodb is required - the caller must inject the DynamoDB helper
    if (Lib.Utils.isNullOrUndefined(config.lib_dynamodb)) {
      throw new Error('[js-server-helper-logger-store-dynamodb] config.lib_dynamodb is required (pass Lib.DynamoDB)');
    }

  }


};////////////////////////////// Public Functions END //////////////////////////
