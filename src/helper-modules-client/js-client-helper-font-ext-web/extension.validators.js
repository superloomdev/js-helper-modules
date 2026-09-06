// Info: Validators for helper-font-ext-web.
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

      // PARENT_SELECTOR must be a non-empty string
      if (!Lib.Utils.isString(CONFIG.PARENT_SELECTOR) || Lib.Utils.isEmptyString(CONFIG.PARENT_SELECTOR)) {
        throw new TypeError('[helper-font-ext-web] PARENT_SELECTOR must be a non-empty string');
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
    a `url` field (web extensions require URLs for @font-face). Returns
    the error object when invalid, null when valid.

    @param {*} entry - Style entry to validate

    @return {Object|null} - Error object or null
    *********************************************************************/
    validateStyleEntry: function (entry) {

      // Reject non-object entries
      if (!Lib.Utils.isObject(entry)) {
        return ERRORS.MISSING_URL;
      }

      // Reject entries without a url field
      if (!Lib.Utils.isString(entry.url) || Lib.Utils.isEmptyString(entry.url)) {
        return ERRORS.MISSING_URL;
      }

      // Valid entry
      return null;

    }

  };

  return Validators;

};
