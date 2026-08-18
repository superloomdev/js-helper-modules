// Info: Device and platform helper for the RNW pipeline.
//
// Class I standalone module. Wraps the React Native Platform, Dimensions,
// AppState, NetInfo, and SafeArea APIs behind a unified device interface.
// All platform APIs are injected via shared_libs so the module is testable
// in pure Node with stubs. No direct require('react-native').
//
// Provides: getPlatform, getViewport, onViewportChange, getNetworkState,
//           onAppStateChange, getSafeAreaInsets.
//
// The module reads React Native Platform, not Expo. It targets the RNW
// pipeline because
// react-native Platform works across web, iOS, and Android via Metro.
//
// Compatibility: React Native Web (web, iOS, Android). Requires the RNW
// runtime. Node.js for testing with injected stubs.
//
// Factory pattern: each loader call returns an independent instance with
// its own subscription state.
'use strict';


/////////////////////////// Module-Loader START ////////////////////////////////

/********************************************************************
Factory loader. One call = one independent instance with its own
subscription state and injected platform APIs.

@param {Object} shared_libs - Lib container; requires Platform and
                              Dimensions; optional AppState, NetInfo,
                              SafeArea, Utils, Debug
@param {Object} config      - Overrides merged over defaults

@return {Object} - Public Device interface
*********************************************************************/
module.exports = function loader (shared_libs, config) {

  // Dependencies for this instance
  const Lib = {
    Utils: shared_libs.Utils,
    Debug: shared_libs.Debug,
    Platform: shared_libs.Platform,
    Dimensions: shared_libs.Dimensions,
    AppState: shared_libs.AppState,
    NetInfo: shared_libs.NetInfo,
    SafeArea: shared_libs.SafeArea
  };

  // Merge overrides over defaults
  const CONFIG = Object.assign(
    {},
    require('./device.config'),
    config || {}
  );

  // Error catalog (frozen, owned by the main module)
  const ERRORS = require('./device.errors');

  // Validators singleton - Lib, ERRORS injected here
  const Validators = require('./device.validators')(Lib, ERRORS);

  // Validate config immediately so misconfiguration fails at startup
  Validators.validateConfig(CONFIG);

  // Validate required injections
  if (Lib.Utils.isNullOrUndefined(Lib.Platform)) {
    throw new TypeError('helper-device: shared_libs.Platform is required (the react-native Platform module)');
  }

  if (Lib.Utils.isNullOrUndefined(Lib.Dimensions)) {
    throw new TypeError('helper-device: shared_libs.Dimensions is required (the react-native Dimensions module)');
  }

  // Mutable per-instance state
  const state = {
    viewportSubscriptions: [],
    appStateSubscriptions: [],
    viewportDebounceTimer: null
  };

  // Wire event listeners
  _wireDimensions(Lib, CONFIG, state);
  _wireAppState(Lib, state);

  return createInterface(Lib, CONFIG, ERRORS, Validators, state);

};///////////////////////////// Module-Loader END ///////////////////////////////


/////////////////////////// createInterface START //////////////////////////////

/********************************************************************
Builds the public interface for one instance. Public and private
functions close over the provided Lib, CONFIG, ERRORS, Validators,
and state.

@param {Object} Lib       - Dependency container
@param {Object} CONFIG    - Merged configuration for this instance
@param {Object} ERRORS    - Frozen error catalog
@param {Object} Validators - Validators singleton
@param {Object} state     - Mutable state holder

@return {Object} - Public interface for this module
*********************************************************************/
const createInterface = function (Lib, CONFIG, ERRORS, Validators, state) {

  ///////////////////////////Public Functions START//////////////////////////////
  const Device = {


    // ~~~~~~~~~~~~~~~~~~~~ Platform ~~~~~~~~~~~~~~~~~~~~

    /********************************************************************
    Get the current platform OS string.

@return {Object} - { success, platform, error }
    *********************************************************************/
    getPlatform: function () {

      // Read platform from the injected Platform module
      return {
        success: true,
        platform: Lib.Platform.OS,
        error: null
      };

    },


    // ~~~~~~~~~~~~~~~~~~~~ Viewport ~~~~~~~~~~~~~~~~~~~~

    /********************************************************************
    Get the current viewport dimensions.

@return {Object} - { success, width, height, error }
    *********************************************************************/
    getViewport: function () {

      // Read the window dimensions from the injected Dimensions module
      try {

        const dims = Lib.Dimensions.get('window');

        return {
          success: true,
          width: dims.width,
          height: dims.height,
          error: null
        };

      } catch (dimError) {

        if (Lib.Debug) {
          Lib.Debug.debug('helper-device getViewport failed', {
            message: dimError.message
          });
        }

        return {
          success: false,
          width: null,
          height: null,
          error: ERRORS.DIMENSIONS_UNAVAILABLE
        };

      }

    },


    /********************************************************************
    Subscribe to viewport dimension changes. The callback receives
    { width, height } on each change. Returns an unsubscribe function.

@param {Function} callback - Called with { width, height } on change

@return {Object} - { success, unsubscribe, error }
    *********************************************************************/
    onViewportChange: function (callback) {

      // Validate callback
      const callbackError = Validators.validateCallback(callback);
      if (callbackError) {

        return {
          success: false,
          unsubscribe: null,
          error: callbackError
        };

      }

      // Register the callback
      state.viewportSubscriptions.push(callback);

      // Return an unsubscribe function
      return {
        success: true,
        unsubscribe: function () {

          _removeSubscription(state.viewportSubscriptions, callback);

        },
        error: null
      };

    },


    // ~~~~~~~~~~~~~~~~~~~~ Network ~~~~~~~~~~~~~~~~~~~~

    /********************************************************************
    Get the current network state. Requires NetInfo to be injected.

@return {Promise<Object>} - { success, isConnected, type, error }
    *********************************************************************/
    getNetworkState: async function () {

      // Check NetInfo availability
      if (Lib.Utils.isNullOrUndefined(Lib.NetInfo)) {

        return {
          success: false,
          isConnected: null,
          type: null,
          error: ERRORS.NETINFO_UNAVAILABLE
        };

      }

      try {

        const netState = await Lib.NetInfo.fetch();

        return {
          success: true,
          isConnected: netState.isConnected,
          type: netState.type,
          error: null
        };

      } catch (netError) {

        if (Lib.Debug) {
          Lib.Debug.debug('helper-device getNetworkState failed', {
            message: netError.message
          });
        }

        return {
          success: false,
          isConnected: null,
          type: null,
          error: ERRORS.NETINFO_UNAVAILABLE
        };

      }

    },


    // ~~~~~~~~~~~~~~~~~~~~ App State ~~~~~~~~~~~~~~~~~~~~

    /********************************************************************
    Subscribe to app state changes. The callback receives the new
    state string ('active' | 'background' | 'inactive'). Requires
    AppState to be injected. Returns an unsubscribe function.

@param {Function} callback - Called with the new state string

@return {Object} - { success, unsubscribe, error }
    *********************************************************************/
    onAppStateChange: function (callback) {

      // Validate callback
      const callbackError = Validators.validateCallback(callback);
      if (callbackError) {

        return {
          success: false,
          unsubscribe: null,
          error: callbackError
        };

      }

      // Check AppState availability
      if (Lib.Utils.isNullOrUndefined(Lib.AppState)) {

        return {
          success: false,
          unsubscribe: null,
          error: ERRORS.APPSTATE_UNAVAILABLE
        };

      }

      // Register the callback
      state.appStateSubscriptions.push(callback);

      // Return an unsubscribe function
      return {
        success: true,
        unsubscribe: function () {

          _removeSubscription(state.appStateSubscriptions, callback);

        },
        error: null
      };

    },


    // ~~~~~~~~~~~~~~~~~~~~ Safe Area ~~~~~~~~~~~~~~~~~~~~

    /********************************************************************
    Get safe-area insets. Requires SafeArea to be injected.

@return {Object} - { success, top, bottom, left, right, error }
    *********************************************************************/
    getSafeAreaInsets: function () {

      // Check SafeArea availability
      if (Lib.Utils.isNullOrUndefined(Lib.SafeArea)) {

        return {
          success: false,
          top: null,
          bottom: null,
          left: null,
          right: null,
          error: ERRORS.SAFEAREA_UNAVAILABLE
        };

      }

      try {

        const insets = Lib.SafeArea.getSafeAreaInsetsForView();

        return {
          success: true,
          top: insets.top,
          bottom: insets.bottom,
          left: insets.left,
          right: insets.right,
          error: null
        };

      } catch (safeAreaError) {

        if (Lib.Debug) {
          Lib.Debug.debug('helper-device getSafeAreaInsets failed', {
            message: safeAreaError.message
          });
        }

        return {
          success: false,
          top: null,
          bottom: null,
          left: null,
          right: null,
          error: ERRORS.SAFEAREA_UNAVAILABLE
        };

      }

    }

  };///////////////////////////Public Functions END//////////////////////////////

  return Device;

};/////////////////////////// createInterface END //////////////////////////////


/////////////////////////// Private Functions START ////////////////////////////

/********************************************************************
Remove a callback from a subscription array.

@param {Array}    list     - Subscription array
@param {Function} callback - The callback to remove

@return {void}
*********************************************************************/
const _removeSubscription = function (list, callback) {

  const index = list.indexOf(callback);

  if (index !== -1) {
    list.splice(index, 1);
  }

};


/********************************************************************
Wire the Dimensions change event to notify all viewport
subscribers. Applies debounce when VIEWPORT_DEBOUNCE_MS > 0.

@param {Object} Lib    - Dependency container
@param {Object} CONFIG - Merged config
@param {Object} state  - Mutable state holder

@return {void}
*********************************************************************/
const _wireDimensions = function (Lib, CONFIG, state) {

  // Attach the change listener to the injected Dimensions module
  if (Lib.Utils.isFunction(Lib.Dimensions.addEventListener)) {

    Lib.Dimensions.addEventListener('change', function (dims) {

      // Debounce if configured
      if (CONFIG.VIEWPORT_DEBOUNCE_MS > 0) {

        if (state.viewportDebounceTimer !== null) {
          clearTimeout(state.viewportDebounceTimer);
        }

        state.viewportDebounceTimer = setTimeout(function () {

          _notifyViewportSubscribers(state, Lib, dims);
          state.viewportDebounceTimer = null;

        }, CONFIG.VIEWPORT_DEBOUNCE_MS);

      } else {

        _notifyViewportSubscribers(state, Lib, dims);

      }

    });

  }

};


/********************************************************************
Wire the AppState change event to notify all app state
subscribers.

@param {Object} Lib   - Dependency container
@param {Object} state - Mutable state holder

@return {void}
*********************************************************************/
const _wireAppState = function (Lib, state) {

  // Attach the change listener to the injected AppState module
  if (!Lib.Utils.isNullOrUndefined(Lib.AppState) && Lib.Utils.isFunction(Lib.AppState.addEventListener)) {

    Lib.AppState.addEventListener('change', function (nextAppState) {

      _notifyAppStateSubscribers(state, Lib, nextAppState);

    });

  }

};


/********************************************************************
Notify all viewport subscribers with the new dimensions.

@param {Object} state - Mutable state holder
@param {Object} Lib   - Dependency container
@param {Object} dims  - { window: { width, height }, screen: { width, height } }

@return {void}
*********************************************************************/
const _notifyViewportSubscribers = function (state, Lib, dims) {

  // Extract window dimensions from the event
  const window = (dims && dims.window) || dims || {};

  // Notify each subscriber
  for (let i = 0; i < state.viewportSubscriptions.length; i++) {

    try {

      state.viewportSubscriptions[i]({
        width: window.width,
        height: window.height
      });

    } catch (cbError) {

      if (Lib.Debug) {
        Lib.Debug.debug('helper-device viewport callback threw', {
          message: cbError.message
        });
      }

    }

  }

};


/********************************************************************
Notify all app state subscribers with the new state.

@param {Object} state        - Mutable state holder
@param {Object} Lib          - Dependency container
@param {String} nextAppState - The new app state string

@return {void}
*********************************************************************/
const _notifyAppStateSubscribers = function (state, Lib, nextAppState) {

  // Notify each subscriber
  for (let i = 0; i < state.appStateSubscriptions.length; i++) {

    try {

      state.appStateSubscriptions[i](nextAppState);

    } catch (cbError) {

      if (Lib.Debug) {
        Lib.Debug.debug('helper-device appState callback threw', {
          message: cbError.message
        });
      }

    }

  }

};////////////////////////// Private Functions END ////////////////////////////
