// Info: Validators for helper-font-ext-web.
//
// Receives Lib and ERRORS by injection from the loader.
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

      // PARENT_SELECTOR must be a non-empty string
      if (!Lib.Utils.isString(CONFIG.PARENT_SELECTOR) || CONFIG.PARENT_SELECTOR.length === 0) {
        throw new TypeError('helper-font-ext-web: PARENT_SELECTOR must be a non-empty string');
      }

    },


    /********************************************************************
    Validate a manifest object. Returns the error object when invalid,
    null when valid.

    @param {*} manifest - Value to validate as a manifest

    @return {Object|null} - Error object or null
    *********************************************************************/
    validateManifest: function (manifest) {

      if (!Lib.Utils.isObject(manifest) || Array.isArray(manifest)) {
        return ERRORS.INVALID_MANIFEST;
      }

      return null;

    }

  };

  return Validators;

};
