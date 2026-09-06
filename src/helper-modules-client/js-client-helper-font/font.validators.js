// Info: Validators for helper-font.
//
// Receives Lib and ERRORS by injection from the loader.
// Never self-requires the error catalog or data files.
export default function (Lib, ERRORS) {

  const Validators = {

    /********************************************************************
    Validate the merged config object. Throws TypeError on any
    misconfiguration so the module fails at startup, not at call time.

    @param {Object} CONFIG - Merged config for this instance
    @return {void}
    *********************************************************************/
    validateConfig: function (CONFIG) {

      // DEFAULT_FAMILY must be a non-empty string
      if (!Lib.Utils.isString(CONFIG.DEFAULT_FAMILY) || Lib.Utils.isEmptyString(CONFIG.DEFAULT_FAMILY)) {
        throw new TypeError('[helper-font] DEFAULT_FAMILY must be a non-empty string');
      }

      // roles must be a plain object (or absent)
      if (CONFIG.ROLES !== undefined && (!Lib.Utils.isObject(CONFIG.ROLES) || Array.isArray(CONFIG.ROLES))) {
        throw new TypeError('[helper-font] roles must be a plain object');
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
    Prevalidate every family and style entry in a manifest before any
    mutation. Returns an error envelope for a malformed manifest or
    family name; throws the same TypeError registerStyle throws for a
    style entry with no source field. Called by registerFamilies so a
    later invalid entry cannot leave earlier registrations committed.

    @param {Object} manifest - Family manifest object (already shape-validated)

    @return {Object|null} - Error object or null
    @throws {TypeError} - When a style entry has no source field
    *********************************************************************/
    validateManifestEntries: function (manifest) {

      // Walk every family in the manifest
      const familyNames = Object.keys(manifest);

      for (let i = 0; i < familyNames.length; i++) {

        const familyName = familyNames[i];

        // Validate the family name
        const nameError = Validators.validateFamilyName(familyName);
        if (nameError) {

          return nameError;

        }

        // Inspect the family entry's styles
        const entry = manifest[familyName];

        // Handle a styles map (multiple weights)
        if (entry.styles && Lib.Utils.isObject(entry.styles)) {

          const styleKeys = Object.keys(entry.styles);

          for (let j = 0; j < styleKeys.length; j++) {

            const styleEntry = entry.styles[styleKeys[j]];

            // A style entry with no source is a programmer error: throw.
            // This matches the message registerStyle throws today.
            const sourceError = Validators.validateStyleEntry(styleEntry);
            if (sourceError) {
              throw new TypeError('[helper-font] registerStyle: styleEntry must have at least one source field');
            }

          }

        } else {

          // Handle a flat entry as a single style: validate it has a source
          const sourceError = Validators.validateStyleEntry(entry);
          if (sourceError) {
            throw new TypeError('[helper-font] registerStyle: styleEntry must have at least one source field');
          }

        }

      }

      // All entries valid
      return null;

    },


    /********************************************************************
    Validate a family name. Returns the error object when invalid,
    null when valid.

    @param {*} name - Value to validate as a family name

    @return {Object|null} - Error object or null
    *********************************************************************/
    validateFamilyName: function (name) {

      // Reject non-string or empty names
      if (!Lib.Utils.isString(name) || Lib.Utils.isEmptyString(name)) {
        return ERRORS.INVALID_FAMILY_NAME;
      }

      // Valid family name
      return null;

    },


    // ~~~~~~~~~~~~~~~~~~~~ Programmer-Error Assertions ~~~~~~~~~~~~~~~~~~~~
    // Throw TypeError on bad arguments. Used by is* functions that return
    // bare Boolean per the function-naming doctrine.


    /********************************************************************
    Throw TypeError if family name is missing or not a non-empty string.

    @param {*} name - Value to validate as a family name
    @param {String} fn_name - Public function name for error message

    @return {void}
    *********************************************************************/
    assertFamilyName: function (name, fn_name) {

      // Throw on non-string or empty names
      if (!Lib.Utils.isString(name) || Lib.Utils.isEmptyString(name)) {
        throw new TypeError(
          '[helper-font] ' + fn_name + ': family_name must be a non-empty string'
        );
      }

    },


    /********************************************************************
    Validate a token. Returns the error object when invalid,
    null when valid.

    @param {*} token - Value to validate as a token

    @return {Object|null} - Error object or null
    *********************************************************************/
    validateToken: function (token) {

      // Reject non-string or empty tokens
      if (!Lib.Utils.isString(token) || Lib.Utils.isEmptyString(token)) {
        return ERRORS.INVALID_TOKEN;
      }

      // Valid token
      return null;

    },


    /********************************************************************
    Validate a URL. Returns the error object when invalid,
    null when valid.

    @param {*} url - Value to validate as a URL

    @return {Object|null} - Error object or null
    *********************************************************************/
    validateUrl: function (url) {

      // Reject non-string or empty URLs
      if (!Lib.Utils.isString(url) || Lib.Utils.isEmptyString(url)) {
        return ERRORS.INVALID_URL;
      }

      // Valid URL
      return null;

    },


    /********************************************************************
    Validate a font weight. Returns the error object when invalid,
    null when valid.

    @param {*} weight - Value to validate as a weight

    @return {Object|null} - Error object or null
    *********************************************************************/
    validateWeight: function (weight) {

      // Null or undefined weight is valid (optional field)
      if (weight === null || weight === undefined) {
        return null;
      }

      // Reject non-string or empty weights
      if (!Lib.Utils.isString(weight) || Lib.Utils.isEmptyString(weight)) {
        return ERRORS.INVALID_WEIGHT;
      }

      // Accept only a three-digit hundred value (100-900) or a keyword.
      // This prevents CSS injection through the weight field.
      if (!/^(?:[1-9]00|normal|bold|lighter|bolder)$/.test(weight)) {
        return ERRORS.INVALID_WEIGHT;
      }

      // Valid weight
      return null;

    },


    /********************************************************************
    Validate a font style. Returns the error object when invalid,
    null when valid.

    @param {*} style - Value to validate as a style

    @return {Object|null} - Error object or null
    *********************************************************************/
    validateStyle: function (style) {

      // Undefined or null style is valid (optional field)
      if (style === undefined || style === null) {
        return null;
      }

      // Reject non-string or invalid style values
      if (!Lib.Utils.isString(style) || (style !== 'normal' && style !== 'italic')) {
        return ERRORS.INVALID_STYLE;
      }

      // Valid style
      return null;

    },


    /********************************************************************
    Validate a style entry from the manifest. Ensures at least one
    source field (url, path, or asset) is present. Returns the error
    object when invalid, null when valid.

    @param {*} entry - Style entry to validate

    @return {Object|null} - Error object or null
    *********************************************************************/
    validateStyleEntry: function (entry) {

      // Reject non-object entries
      if (!Lib.Utils.isObject(entry)) {
        return ERRORS.MISSING_SOURCE;
      }

      // Check for at least one source field
      const hasUrl = Lib.Utils.isString(entry.url) && !Lib.Utils.isEmptyString(entry.url);
      const hasPath = Lib.Utils.isString(entry.path) && !Lib.Utils.isEmptyString(entry.path);
      const hasAsset = entry.asset !== undefined && entry.asset !== null;

      // Reject entries with no source field
      if (!hasUrl && !hasPath && !hasAsset) {
        return ERRORS.MISSING_SOURCE;
      }

      // Valid entry
      return null;

    },


    /********************************************************************
    Validate a roles mapping object. Returns the error object when
    invalid, null when valid.

    @param {*} roles - Value to validate as a roles mapping

    @return {Object|null} - Error object or null
    *********************************************************************/
    validateRoles: function (roles) {

      // Reject non-object or array roles
      if (!Lib.Utils.isObject(roles) || Array.isArray(roles)) {
        return ERRORS.INVALID_ROLES;
      }

      // Valid roles mapping
      return null;

    }

  };

  return Validators;

};
