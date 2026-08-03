// Info: Error catalog for helper-font-ext-rn.
//
// Frozen on export. Injected into the public interface.
'use strict';

module.exports = Object.freeze({

  INVALID_MANIFEST: {
    type: 'helper-font-ext-rn/invalid-manifest',
    message: 'Manifest must be a plain object with family entries'
  },

  FONT_CORE_UNAVAILABLE: {
    type: 'helper-font-ext-rn/font-core-unavailable',
    message: 'Font core module is not injected. Provide shared_libs.Font (the js-client-helper-font instance)'
  },

  NATIVE_LOADER_UNAVAILABLE: {
    type: 'helper-font-ext-rn/native-loader-unavailable',
    message: 'Native font loader is not injected. Provide shared_libs.NativeFontLoader (the @vitrion/react-native-load-fonts module)'
  },

  LOAD_FAILED: {
    type: 'helper-font-ext-rn/load-failed',
    message: 'One or more fonts failed to load via the native loader'
  }

});
