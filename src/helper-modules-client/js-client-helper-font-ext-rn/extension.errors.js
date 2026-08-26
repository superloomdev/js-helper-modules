// Info: Error catalog for helper-font-ext-rn.
//
// Frozen on export. Injected into the public interface.
export default Object.freeze({

  INVALID_MANIFEST: {
    type: 'helper-font-ext-rn/invalid-manifest',
    message: 'Manifest must be a plain object with family entries'
  },

  FONT_CORE_UNAVAILABLE: {
    type: 'helper-font-ext-rn/font-core-unavailable',
    message: 'Font core module is not injected. Provide shared_libs.Font (the js-client-helper-font instance)'
  },

  MISSING_PATH: {
    type: 'helper-font-ext-rn/missing-path',
    message: 'Native extensions require a local file path. Register fonts with path field, not url.'
  },

  LOAD_FAILED: {
    type: 'helper-font-ext-rn/load-failed',
    message: 'One or more fonts failed to load via the native loader'
  }

});
