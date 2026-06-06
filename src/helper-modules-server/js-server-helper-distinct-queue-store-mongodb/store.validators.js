// Info: Config validator for js-server-helper-distinct-queue-store-mongodb.
// Called once at construction time from the store.js loader.
// Throws Error on misconfiguration so the adapter fails before
// serving a single request.
//
// Singleton: Lib is injected once by the loader. Node.js require
// cache guarantees the same reference on every subsequent require.

'use strict';


// Shared dependency injected by loader
let Lib;


/////////////////////////// Module-Loader START ////////////////////////////////

/********************************************************************
Singleton loader. Injects Lib and returns the module-scope
Validators object.

@param {Object} shared_libs - Dependency container (Utils, Debug, MongoDB)

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

  @param {Object} config - Merged adapter configuration

  @return {void}
  *********************************************************************/
  validateConfig: function (config) {

    // Require a non-empty collection name
    if (
      Lib.Utils.isNullOrUndefined(config.collection_name) ||
      !Lib.Utils.isString(config.collection_name) ||
      Lib.Utils.isEmptyString(config.collection_name)
    ) {
      throw new Error('[distinct-queue-store-mongodb] CONFIG.collection_name is required and must be a non-empty string');
    }

    // Require the MongoDB driver to be injected via Lib
    if (Lib.Utils.isNullOrUndefined(Lib.MongoDB)) {
      throw new Error('[distinct-queue-store-mongodb] Lib.MongoDB is required');
    }

  }

};////////////////////////////// Public Functions END ////////////////////////
