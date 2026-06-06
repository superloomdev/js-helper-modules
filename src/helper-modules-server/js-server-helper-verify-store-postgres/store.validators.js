// Info: Config validator for js-server-helper-verify-store-postgres.
// This adapter is a fully independent module that owns its own Lib.
// Called once at construction time. Throws Error on misconfiguration
// so the adapter fails before serving a single request.

'use strict';


const Validators = {


  /********************************************************************
  Validate the config object passed to the adapter loader.
  Throws on the first violation so misconfiguration surfaces
  immediately at boot time.

  @param {Object} Lib - Dependency container (Utils)
  @param {Object} config - Configuration object

  @return {void}
  *********************************************************************/
  validateConfig: function (Lib, config) {

    // config must be a non-null object
    if (
      Lib.Utils.isNullOrUndefined(config) ||
      !Lib.Utils.isObject(config)
    ) {
      throw new Error('[js-server-helper-verify-store-postgres] config must be an object');
    }

    // table_name is required and must be a non-empty string
    if (
      Lib.Utils.isNullOrUndefined(config.table_name) ||
      !Lib.Utils.isString(config.table_name) ||
      Lib.Utils.isEmptyString(config.table_name)
    ) {
      throw new Error('[js-server-helper-verify-store-postgres] config.table_name is required');
    }

    // lib_postgresql is required - the caller must inject the Postgres helper
    if (Lib.Utils.isNullOrUndefined(config.lib_postgresql)) {
      throw new Error('[js-server-helper-verify-store-postgres] config.lib_postgresql is required (pass Lib.PostgreSQL)');
    }

  }

};////////////////////////////// Public Functions END ////////////////////////

module.exports = Validators;
