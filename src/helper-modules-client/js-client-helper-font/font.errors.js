// Info: Error catalog for helper-font.
//
// Frozen on export. Injected into validators and the public interface.
export default Object.freeze({

  INVALID_MANIFEST: {
    type: 'helper-font/invalid-manifest',
    message: 'Manifest must be a plain object with family entries'
  },

  INVALID_FAMILY_NAME: {
    type: 'helper-font/invalid-family-name',
    message: 'Family name must be a non-empty string'
  },

  INVALID_TOKEN: {
    type: 'helper-font/invalid-token',
    message: 'Token must be a non-empty string'
  },

  INVALID_URL: {
    type: 'helper-font/invalid-url',
    message: 'URL must be a non-empty string'
  },

  INVALID_WEIGHT: {
    type: 'helper-font/invalid-weight',
    message: 'Weight must be a string (e.g. "400", "600") or null'
  },

  INVALID_STYLE: {
    type: 'helper-font/invalid-style',
    message: 'Style must be "normal" or "italic"'
  },

  UNREGISTERED_FAMILY: {
    type: 'helper-font/unregistered-family',
    message: 'Token resolves to a family not in the registry'
  },

  MISSING_SOURCE: {
    type: 'helper-font/missing-source',
    message: 'Style entry must have at least one of: url, path, asset'
  },

  INVALID_ROLES: {
    type: 'helper-font/invalid-roles',
    message: 'Roles must be a plain object mapping role names to family names'
  }

});
