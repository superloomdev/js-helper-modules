// Info: Config validator for helper-distinct-queue-store-dynamodb.
// Called once at construction time from the loader to validate CONFIG.
// Throws Error on misconfiguration so the adapter fails before serving
// a single request.
//
// Singleton: Lib and ERRORS are injected once by the loader. Node.js require
// cache guarantees the same reference on every subsequent require.
'use strict';


/////////////////////////// Module-Loader START ////////////////////////////////

/********************************************************************
Singleton loader. Injects Lib and ERRORS, returns the Validators
object with Lib closed over.

@param {Object} Lib    - Dependency container (Utils, Debug, DynamoDB)
@param {Object} ERRORS - Frozen error catalog (unused, kept for cross-module consistency)

@return {Object} - Public Validators interface
*********************************************************************/
module.exports = function loader (Lib, ERRORS) { // eslint-disable-line no-unused-vars


  ////////////////////////////// Public Functions START //////////////////////////
  const Validators = {


    /********************************************************************
    Validate the merged CONFIG object. Throws on the first violation so
    misconfiguration surfaces immediately at boot time.

    @param {Object} config - Merged adapter configuration

    @return {void}
    *********************************************************************/
    validateConfig: function (config) {

      // table_name is required and must be a non-empty string
      if (
        Lib.Utils.isNullOrUndefined(config.table_name) ||
        !Lib.Utils.isString(config.table_name) ||
        Lib.Utils.isEmptyString(config.table_name)
      ) {
        throw new Error('[distinct-queue-store-dynamodb] CONFIG.table_name is required and must be a non-empty string');
      }

      // KEY_DELIMITER is required and must be a non-empty string
      if (
        Lib.Utils.isNullOrUndefined(config.KEY_DELIMITER) ||
        !Lib.Utils.isString(config.KEY_DELIMITER) ||
        Lib.Utils.isEmptyString(config.KEY_DELIMITER)
      ) {
        throw new Error('[distinct-queue-store-dynamodb] CONFIG.KEY_DELIMITER is required and must be a non-empty string');
      }

      // DynamoDB driver must be injected via Lib
      if (Lib.Utils.isNullOrUndefined(Lib.DynamoDB)) {
        throw new Error('[distinct-queue-store-dynamodb] Lib.DynamoDB is required');
      }

    }


  };////////////////////////////// Public Functions END //////////////////////////


  return Validators;

};/////////////////////////// Module-Loader END ////////////////////////////////
