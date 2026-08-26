// Info: Error catalog for helper-font-ext-expo.
//
// Frozen on export. Injected into the public interface.
export default Object.freeze({

  INVALID_MANIFEST: {
    type: 'helper-font-ext-expo/invalid-manifest',
    message: 'Manifest must be a plain object with family entries'
  },

  FONT_CORE_UNAVAILABLE: {
    type: 'helper-font-ext-expo/font-core-unavailable',
    message: 'Font core module is not injected. Provide shared_libs.Font (the js-client-helper-font instance)'
  },

  MISSING_SOURCE: {
    type: 'helper-font-ext-expo/missing-source',
    message: 'Expo extension requires an asset, path, or url field. At least one source must be present.'
  },

  LOAD_FAILED: {
    type: 'helper-font-ext-expo/load-failed',
    message: 'One or more fonts failed to load via expo-font'
  }

});
