// Info: All validators for helper-instance. Validates the single config key
// that decides whether process-scoped teardown runs per request.
//
// Factory: needs Lib for the Utils type-check primitives.
'use strict';


/////////////////////////// Module-Loader START ////////////////////////////////

/********************************************************************
Factory loader. Returns a Validators interface closed over Lib.

@param {Object} shared_libs - Lib container (Utils)
@param {Object} errors - Error catalog (unused - no domain errors)

@return {Object} - Public Validators interface
*********************************************************************/
module.exports = function loader (shared_libs, errors) { // eslint-disable-line no-unused-vars

  // Dependencies for this instance
  const Lib = {
    Utils: shared_libs.Utils
  };

  // Return the Validators interface
  return createValidators(Lib);

};///////////////////////////// Module-Loader END ///////////////////////////////



/////////////////////////// createValidators START /////////////////////////////

/********************************************************************
Builds the Validators interface closed over Lib.

@param {Object} Lib - Dependency container (Utils)

@return {Object} - Public Validators interface
*********************************************************************/
const createValidators = function (Lib) {

  ///////////////////////////Public Functions START//////////////////////////////
  const Validators = {

    /********************************************************************
    Validate merged config at construction. Misconfiguration is a
    programmer error and throws rather than returning an envelope.

    @param {Object} config - Merged configuration

    @return {void}
    *********************************************************************/
    validateConfig: function (config) {

      // A non-boolean here would make process-scoped teardown silently
      // pick the wrong queue, so reject anything truthy-but-not-boolean
      if (!Lib.Utils.isBoolean(config.CLOSE_ON_CLEANUP)) {
        throw new TypeError('helper-instance: CLOSE_ON_CLEANUP must be a boolean');
      }

    }

  };////////////////////////////// Public Functions END ///////////////////////////

  // Return public interface
  return Validators;

};/////////////////////////// createValidators END /////////////////////////////
