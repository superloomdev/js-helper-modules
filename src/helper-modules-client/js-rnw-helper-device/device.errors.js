// Info: Error catalog for helper-device.
//
// Frozen on export. Injected into validators and the public interface.
'use strict';

module.exports = Object.freeze({

  PLATFORM_UNAVAILABLE: {
    type: 'helper-device/platform-unavailable',
    message: 'Platform API is not injected. Provide shared_libs.Platform (the react-native Platform module)'
  },

  DIMENSIONS_UNAVAILABLE: {
    type: 'helper-device/dimensions-unavailable',
    message: 'Dimensions API is not injected. Provide shared_libs.Dimensions (the react-native Dimensions module)'
  },

  APPSTATE_UNAVAILABLE: {
    type: 'helper-device/appstate-unavailable',
    message: 'AppState API is not injected. Provide shared_libs.AppState (the react-native AppState module)'
  },

  NETINFO_UNAVAILABLE: {
    type: 'helper-device/netinfo-unavailable',
    message: 'NetInfo API is not injected. Provide shared_libs.NetInfo (the @react-native-community/netinfo module)'
  },

  SAFEAREA_UNAVAILABLE: {
    type: 'helper-device/safearea-unavailable',
    message: 'SafeArea API is not injected. Provide shared_libs.SafeArea (the react-native-safe-area-context module)'
  },

  INVALID_CALLBACK: {
    type: 'helper-device/invalid-callback',
    message: 'Callback must be a function'
  }

});
