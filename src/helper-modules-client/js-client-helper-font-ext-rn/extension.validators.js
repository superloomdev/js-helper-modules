// Info: Validators for helper-font-ext-rn.
//
// Receives Lib and ERRORS by injection from the loader.
export default function (Lib, ERRORS) {

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
        throw new TypeError('[helper-font-ext-rn] FAIL_ON_ERROR must be a boolean');
      }

    },


    /********************************************************************
    Validate a manifest object. Returns the error object when invalid,
    null when valid.

    @param {*} manifest - Value to validate as a manifest

    @return {Object|null} - Error object or null
    *********************************************************************/
    validateManifest: function (manifest) {

      // Reject non-object or array manifests
      if (!Lib.Utils.isObject(manifest) || Array.isArray(manifest)) {
        return ERRORS.INVALID_MANIFEST;
      }

      // Valid manifest
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

      // Reject non-object entries
      if (!Lib.Utils.isObject(entry)) {
        return ERRORS.MISSING_PATH;
      }

      // Reject entries without a path field
      if (!Lib.Utils.isString(entry.path) || Lib.Utils.isEmptyString(entry.path)) {
        return ERRORS.MISSING_PATH;
      }

      // Valid entry
      return null;

    }

  };

  return Validators;

};
