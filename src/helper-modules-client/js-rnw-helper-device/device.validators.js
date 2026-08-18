// Info: Validators for helper-device.
//
// Receives Lib and ERRORS by injection from the loader.
// Never self-requires the error catalog or data files.
'use strict';

module.exports = function (Lib, ERRORS) {

  const Validators = {

    /********************************************************************
    Validate the merged config object. Throws TypeError on any
    misconfiguration so the module fails at startup, not at call time.

    @param {Object} CONFIG - Merged config for this instance
    @return {void}
    *********************************************************************/
    validateConfig: function (CONFIG) {

      // VIEWPORT_DEBOUNCE_MS must be a non-negative number if provided
      if (!Lib.Utils.isNullOrUndefined(CONFIG.VIEWPORT_DEBOUNCE_MS)) {
        if (!Lib.Utils.isNumber(CONFIG.VIEWPORT_DEBOUNCE_MS) || CONFIG.VIEWPORT_DEBOUNCE_MS < 0) {
          throw new TypeError('helper-device: VIEWPORT_DEBOUNCE_MS must be a non-negative number');
        }
      }

    },


    /********************************************************************
    Validate a callback function. Returns the error object when
    invalid, null when valid.

    @param {*} callback - Value to validate as a function

    @return {Object|null} - Error object or null
    *********************************************************************/
    validateCallback: function (callback) {

      if (!Lib.Utils.isFunction(callback)) {
        return ERRORS.INVALID_CALLBACK;
      }

      return null;

    }

  };

  return Validators;

};
