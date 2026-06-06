// Info: Config validator for js-server-helper-auth-store-dynamodb.
// Called once at construction time from the store.js loader.
// Throws Error on misconfiguration so the adapter fails before
// serving a single request.
'use strict';


////////////////////////////// Public Functions START ////////////////////////
module.exports = {


  /********************************************************************
  Validate the config object passed to the adapter loader.
  Throws on the first violation so misconfiguration surfaces
  immediately at boot time.

  @param {Object} Lib    - Adapter-local Lib (Utils)
  @param {Object} config - { table_name, lib_dynamodb }

  @return {void}
  *********************************************************************/
  validateConfig: function (Lib, config) {

    // config must be a non-null object
    if (
      Lib.Utils.isNullOrUndefined(config) ||
      !Lib.Utils.isObject(config)
    ) {
      throw new Error('[js-server-helper-auth-store-dynamodb] config must be an object');
    }

    // table_name is required and must be a non-empty string
    if (
      Lib.Utils.isNullOrUndefined(config.table_name) ||
      !Lib.Utils.isString(config.table_name) ||
      Lib.Utils.isEmptyString(config.table_name)
    ) {
      throw new Error('[js-server-helper-auth-store-dynamodb] config.table_name is required');
    }

    // lib_dynamodb is required - the caller must inject the DynamoDB helper
    if (Lib.Utils.isNullOrUndefined(config.lib_dynamodb)) {
      throw new Error('[js-server-helper-auth-store-dynamodb] config.lib_dynamodb is required (pass Lib.DynamoDB)');
    }

  }

};///////////////////////////// Public Functions END ////////////////////////
