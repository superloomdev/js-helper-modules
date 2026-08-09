'use strict';


// --- Stubs for injected platform APIs ---

function createPlatformStub (os) {

  return { OS: os || 'web' };

}

function createDimensionsStub (width, height) {

  const listeners = [];

  let current = { width: width, height: height };

  return {

    get: function () {

      return { width: current.width, height: current.height };

    },

    addEventListener: function (event, callback) {

      listeners.push({ event: event, callback: callback });

    },

    // Test helper: simulate a dimension change event
    _emitChange: function (dims) {

      const window = (dims && dims.window) || dims || {};

      current = { width: window.width, height: window.height };

      for (let i = 0; i < listeners.length; i++) {

        listeners[i].callback(dims);

      }

    },

    _listenerCount: function () {

      return listeners.length;

    }

  };

}

function createAppStateStub () {

  const listeners = [];

  return {

    addEventListener: function (event, callback) {

      listeners.push({ event: event, callback: callback });

    },

    // Test helper: simulate an app state change event
    _emitChange: function (nextState) {

      for (let i = 0; i < listeners.length; i++) {

        listeners[i].callback(nextState);

      }

    },

    _listenerCount: function () {

      return listeners.length;

    }

  };

}

function createNetInfoStub (isConnected, type) {

  let state = { isConnected: isConnected, type: type };

  return {

    fetch: async function () {

      return { isConnected: state.isConnected, type: state.type };

    },

    // Test helper: change the network state returned by fetch
    _setState: function (next) {

      state = { isConnected: next.isConnected, type: next.type };

    }

  };

}

function createSafeAreaStub (insets) {

  return {

    getSafeAreaInsetsForView: function () {

      return insets || { top: 0, bottom: 0, left: 0, right: 0 };

    }

  };

}


// --- Build the Device module with stubs ---

const Utils = require('helper-utils')();
const Debug = require('helper-debug')({ Utils: Utils });

const platformStub = createPlatformStub('web');
const dimensionsStub = createDimensionsStub(375, 812);
const appStateStub = createAppStateStub();
const netInfoStub = createNetInfoStub(true, 'wifi');
const safeAreaStub = createSafeAreaStub({ top: 47, bottom: 34, left: 0, right: 0 });

const Device = require('helper-device')({
  Utils: Utils,
  Debug: Debug,
  Platform: platformStub,
  Dimensions: dimensionsStub,
  AppState: appStateStub,
  NetInfo: netInfoStub,
  SafeArea: safeAreaStub
});


// --- Device with only required injections (no optional APIs) ---

const DeviceMinimal = require('helper-device')({
  Utils: Utils,
  Debug: Debug,
  Platform: createPlatformStub('ios'),
  Dimensions: createDimensionsStub(393, 852)
});


// --- Device with debounce config ---

const dimensionsDebounceStub = createDimensionsStub(375, 812);

const DeviceDebounced = require('helper-device')({
  Utils: Utils,
  Debug: Debug,
  Platform: createPlatformStub('android'),
  Dimensions: dimensionsDebounceStub
}, {
  VIEWPORT_DEBOUNCE_MS: 50
});


module.exports = {
  Device: Device,
  DeviceMinimal: DeviceMinimal,
  DeviceDebounced: DeviceDebounced,
  platformStub: platformStub,
  dimensionsStub: dimensionsStub,
  dimensionsDebounceStub: dimensionsDebounceStub,
  appStateStub: appStateStub,
  netInfoStub: netInfoStub,
  safeAreaStub: safeAreaStub,
  Utils: Utils,
  Debug: Debug,
  createPlatformStub: createPlatformStub,
  createDimensionsStub: createDimensionsStub,
  createAppStateStub: createAppStateStub,
  createNetInfoStub: createNetInfoStub,
  createSafeAreaStub: createSafeAreaStub
};
