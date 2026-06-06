// Info: Config validator for js-server-helper-auth-store-mysql.
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
  @param {Object} config - { table_name, lib_sql }

  @return {void}
  *********************************************************************/
  validateConfig: function (Lib, config) {

    // config must be a non-null object
    if (
      Lib.Utils.isNullOrUndefined(config) ||
      !Lib.Utils.isObject(config)
    ) {
      throw new Error('[js-server-helper-auth-store-mysql] config must be an object');
    }

    // table_name is required and must be a non-empty string
    if (
      Lib.Utils.isNullOrUndefined(config.table_name) ||
      !Lib.Utils.isString(config.table_name) ||
      Lib.Utils.isEmptyString(config.table_name)
    ) {
      throw new Error('[js-server-helper-auth-store-mysql] config.table_name is required');
    }

    // lib_sql is required - the caller must inject the MySQL helper
    if (Lib.Utils.isNullOrUndefined(config.lib_sql)) {
      throw new Error('[js-server-helper-auth-store-mysql] config.lib_sql is required (pass Lib.MySQL)');
    }

  }

};///////////////////////////// Public Functions END ////////////////////////
