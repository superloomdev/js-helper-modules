// Info: Validators for helper-font-ext-rn.
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

      // FAIL_ON_ERROR must be a boolean
      if (!Lib.Utils.isBoolean(CONFIG.FAIL_ON_ERROR)) {
        throw new TypeError('helper-font-ext-rn: FAIL_ON_ERROR must be a boolean');
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

    },


    /********************************************************************
    Validate a style entry from the manifest. Ensures the entry has
    a `path` field (local file path required by native extensions).
    Returns the error object when invalid, null when valid.

    @param {*} entry - Style entry to validate

    @return {Object|null} - Error object or null
    *********************************************************************/
    validateStyleEntry: function (entry) {

      if (!Lib.Utils.isObject(entry)) {
        return ERRORS.MISSING_PATH;
      }

      if (!Lib.Utils.isString(entry.path) || entry.path.length === 0) {
        return ERRORS.MISSING_PATH;
      }

      return null;

    }

  };

  return Validators;

};
