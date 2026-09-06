// Info: Validators for helper-font-ext-expo.
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
        throw new TypeError('[helper-font-ext-expo] FAIL_ON_ERROR must be a boolean');
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
    at least one of: asset (Expo requireable), path (local file),
    or url (web). Returns the error object when invalid, null when valid.

    @param {*} entry - Style entry to validate

    @return {Object|null} - Error object or null
    *********************************************************************/
    validateStyleEntry: function (entry) {

      // Reject non-object entries
      if (!Lib.Utils.isObject(entry)) {
        return ERRORS.MISSING_SOURCE;
      }

      // Check for at least one source field
      const hasAsset = !Lib.Utils.isNullOrUndefined(entry.asset);
      const hasPath = Lib.Utils.isString(entry.path) && !Lib.Utils.isEmptyString(entry.path);
      const hasUrl = Lib.Utils.isString(entry.url) && !Lib.Utils.isEmptyString(entry.url);

      // Reject entries with no source field
      if (!hasAsset && !hasPath && !hasUrl) {
        return ERRORS.MISSING_SOURCE;
      }

      // Valid entry
      return null;

    }

  };

  return Validators;

};
