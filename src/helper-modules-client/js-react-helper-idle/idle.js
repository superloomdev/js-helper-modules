// Info: Idle detection with a generic threshold registry and React hooks.
//
// Class I Framework Module: standalone module that depends on React by injection.
// No pure parent; no extensions. Framework-free logic (threshold registry,
// analytics accumulation) lives alongside framework-bound logic (hooks,
// effects) in one package.
//
// Provides: useIdle, touch, pause, resume, registerIdleHandler,
//           unregisterIdleHandler, clearIdleHandlers, getElapsed,
//           getLastActive, getTotalIdle, getTotalActive
//
// React arrives via shared_libs.React (never import React directly).
// Activity sources are injected by the host (DOM listeners, PanResponder,
// AppState). This module never references document, window, or react-native.
//
// Compatibility: React 18+, React Native, React Native Web.
//
// Factory pattern: each loader call returns an independent instance with
// its own state and config.
//
import CONFIG_DEFAULTS from './idle.config.js';
import ERRORS from './idle.errors.js';
import createValidators from './idle.validators.js';

/////////////////////////// Module-Loader START ////////////////////////////////

/********************************************************************
Factory loader. One call = one independent instance with its own
state and config.

React is injected via shared_libs.React (Class I delta). This keeps
react a peer dependency and lets _test/ inject a stub so tests run
in pure Node with no Metro and no emulator.

@param {Object} shared_libs - Lib container; requires shared_libs.React,
                              shared_libs.Utils, shared_libs.Debug
@param {Object} config      - Overrides merged over defaults

@return {Object} - Public interface for this module
*********************************************************************/
export default function loader (shared_libs, config) {

  // Dependencies for this instance (React picked off the injected container)
  const Lib = {
    Utils: shared_libs.Utils,
    Debug: shared_libs.Debug,
    React: shared_libs.React
  };

  // Merge overrides over defaults
  const CONFIG = Object.assign(
    {},
    CONFIG_DEFAULTS,
    config || {}
  );

  // Error catalog (frozen, owned by the main module)

  // Validators singleton - Lib, ERRORS injected here
  const Validators = createValidators(Lib, ERRORS);

  // Validate config immediately so misconfiguration fails at startup
  Validators.validateConfig(CONFIG);

  // Mutable per-instance state
  const state = {
    last_active_ms: null,
    total_idle_ms: 0,
    total_active_ms: 0,
    period_start_ms: null,
    period_is_idle: false,
    paused: false,
    pause_elapsed_ms: 0,
    next_handler_id: 1,
    handlers: {}
  };

  return createInterface(Lib, CONFIG, ERRORS, Validators, state);

};/////////////////////////// Module-Loader END /////////////////////////////////



/////////////////////////// createInterface START //////////////////////////////

/********************************************************************
Builds the public interface for one instance. Public and private
functions close over the provided Lib, CONFIG, ERRORS, Validators,
and state.

@param {Object} Lib       - Dependency container (Utils, Debug, React)
@param {Object} CONFIG    - Merged configuration for this instance
@param {Object} ERRORS    - Frozen error catalog
@param {Object} Validators - Validators singleton (Lib + ERRORS injected)
@param {Object} state     - Mutable state holder

@return {Object} - Public interface for this module
*********************************************************************/
const createInterface = function (Lib, CONFIG, ERRORS, Validators, state) {

  ///////////////////////////Public Functions START//////////////////////////////
  const Idle = {

    // ~~~~~~~~~~~~~~~~~~~~ React Hook ~~~~~~~~~~~~~~~~~~~~
    // useIdle bridges the threshold registry into React re-renders.

    /********************************************************************
    React hook that bridges idle state into re-renders. Subscribes to
    host-supplied activity sources on mount, unsubscribes on unmount.
    Registers thresholds on mount and unregisters them on unmount.

    @param {Object} options             - Hook options
    @param {Array}  options.sources     - Activity source subscribe/unsubscribe pairs
    @param {Array}  options.thresholds  - Array of { ms, callback } to register on mount

    @return {Object} - { isIdle, touch, pause, resume }
    *********************************************************************/
    useIdle: function (options) {

      // Validate options (throws TypeError on programmer error)
      Validators.validateUseIdle(options || {});

      // Initialize React state for isIdle
      const React = Lib.React;
      const [isIdle, setIsIdle] = React.useState(false);

      // Sync external state changes into React re-renders
      React.useEffect(function () {

        // Register a threshold at idle_ms to update isIdle
        const idleReg = Idle.registerIdleHandler(CONFIG.IDLE_MS, function () {
          setIsIdle(true);
        });

        // Register user-supplied thresholds
        const userRegs = [];
        if (options.thresholds && options.thresholds.length > 0) {
          for (let i = 0; i < options.thresholds.length; i++) {
            const t = options.thresholds[i];
            userRegs.push(Idle.registerIdleHandler(t.ms, t.callback));
          }
        }

        // Subscribe to host-supplied activity sources
        const unsubscribers = [];
        if (options.sources && options.sources.length > 0) {
          for (let i = 0; i < options.sources.length; i++) {
            const source = options.sources[i];
            if (source && typeof source.subscribe === 'function') {
              const unsub = source.subscribe(function () {
                setIsIdle(false);
                Idle.touch();
              });
              if (typeof unsub === 'function') {
                unsubscribers.push(unsub);
              }
            }
          }
        }

        // Cleanup on unmount: unregister thresholds and unsubscribe
        return function () {
          Idle.unregisterIdleHandler(idleReg.data.id);
          for (let i = 0; i < userRegs.length; i++) {
            Idle.unregisterIdleHandler(userRegs[i].data.id);
          }
          for (let j = 0; j < unsubscribers.length; j++) {
            unsubscribers[j]();
          }
        };

      }, []);

      // Return isIdle plus control functions
      return {
        isIdle: isIdle,
        touch: function () {
          setIsIdle(false);
          return Idle.touch();
        },
        pause: Idle.pause,
        resume: Idle.resume
      };

    },


    // ~~~~~~~~~~~~~~~~~~~~ Control Functions ~~~~~~~~~~~~~~~~~~~~
    // Direct control of idle detection without React.

    /********************************************************************
    Record user activity. Re-arms every registered threshold. Ignored
    while paused, reported as touched: false.

    @return {Object} - { success, data, error }
    *********************************************************************/
    touch: function () {

      // Guard: ignore touch while paused
      if (state.paused) {

        // Early return: paused, no activity recorded
        return {
          success: true,
          data: { touched: false },
          error: null
        };

      }

      // Record activity and re-arm thresholds
      _Idle.touch();

      // Return successful response
      return {
        success: true,
        data: { touched: true },
        error: null
      };

    },


    /********************************************************************
    Pause idle detection. Closes the current analytics period, clears
    all pending threshold timers, and freezes the elapsed clock.

    @return {Object} - { success, data, error }
    *********************************************************************/
    pause: function () {

      // Guard against double-pause
      if (state.paused) {

        // Early return: already paused
        return {
          success: true,
          data: { paused: true },
          error: null
        };

      }

      // Close the current analytics period
      _Idle.closePeriod();

      // Freeze the elapsed clock at the current value
      state.pause_elapsed_ms = _Idle.getElapsedMs();

      // Clear all pending threshold timers
      _Idle.clearAllTimers();
      state.paused = true;

      // Return successful response
      return {
        success: true,
        data: { paused: true },
        error: null
      };

    },


    /********************************************************************
    Resume idle detection from a paused state. Reschedules thresholds
    for their remaining delta. Idempotent.

    @return {Object} - { success, data, error }
    *********************************************************************/
    resume: function () {

      // Guard against resume when not paused
      if (!state.paused) {

        // Early return: not paused
        return {
          success: true,
          data: { paused: false },
          error: null
        };

      }

      // Unpause, adjust last_active_ms so getElapsedMs returns pause_elapsed_ms
      const now = Lib.Utils.getUnixTimeInMilliSeconds();
      state.paused = false;
      state.last_active_ms = now - state.pause_elapsed_ms;
      state.period_start_ms = now;
      state.period_is_idle = state.pause_elapsed_ms >= CONFIG.IDLE_MS;

      // Reschedule thresholds for their remaining delta
      _Idle.rescheduleThresholds();

      // Return successful response
      return {
        success: true,
        data: { paused: false },
        error: null
      };

    },


    // ~~~~~~~~~~~~~~~~~~~~ Threshold Registration ~~~~~~~~~~~~~~~~~~~~
    // Register callbacks to fire after ms of continuous inactivity.

    /********************************************************************
    Register a callback to fire after ms of continuous inactivity.

    @param {number} ms        - Threshold in milliseconds (must be positive)
    @param {Function} callback - Function called when threshold fires

    @return {Object} - { success, data: { id }, error }
    *********************************************************************/
    registerIdleHandler: function (ms, callback) {

      // Validate ms is a positive number
      if (!Lib.Utils.isNumber(ms) || ms <= 0) {

        // Return error for invalid threshold
        return {
          success: false,
          data: { id: null },
          error: ERRORS.INVALID_THRESHOLD
        };

      }

      // Validate callback is a function
      if (!Lib.Utils.isFunction(callback)) {

        // Return error for invalid callback
        return {
          success: false,
          data: { id: null },
          error: ERRORS.INVALID_CALLBACK
        };

      }

      // Assign a unique id and store the handler
      const id = state.next_handler_id;
      state.next_handler_id += 1;
      state.handlers[id] = {
        ms: ms,
        callback: callback,
        timeout_id: null,
        fired: false
      };

      // Schedule the threshold timer (or fire immediately if already elapsed)
      _Idle.scheduleThreshold(id);

      // Return successful response with the handler id
      return {
        success: true,
        data: { id: id },
        error: null
      };

    },


    /********************************************************************
    Unregister one handler by the id returned from registerIdleHandler.

    @param {number} id - Handler id to remove

    @return {Object} - { success, data: { removed }, error }
    *********************************************************************/
    unregisterIdleHandler: function (id) {

      // Check if the handler exists
      if (!state.handlers[id]) {

        // Early return: unknown id, not an error
        return {
          success: true,
          data: { removed: false },
          error: null
        };

      }

      // Clear the pending timer and delete the handler
      if (state.handlers[id].timeout_id) {
        clearTimeout(state.handlers[id].timeout_id);
      }
      delete state.handlers[id];

      // Return successful response
      return {
        success: true,
        data: { removed: true },
        error: null
      };

    },


    /********************************************************************
    Unregister every handler.

    @return {Object} - { success, data: { removed_count }, error }
    *********************************************************************/
    clearIdleHandlers: function () {

      // Count and remove all handlers
      let count = 0;
      const ids = Object.keys(state.handlers);

      for (let i = 0; i < ids.length; i++) {
        const id = ids[i];

        // Clear any pending timer for this handler
        if (state.handlers[id].timeout_id) {
          clearTimeout(state.handlers[id].timeout_id);
        }

        // Remove the handler from the registry
        delete state.handlers[id];

        // Count the removal
        count += 1;
      }

      // Return successful response with the count
      return {
        success: true,
        data: { removed_count: count },
        error: null
      };

    },


    // ~~~~~~~~~~~~~~~~~~~~ Query Functions ~~~~~~~~~~~~~~~~~~~~
    // Read-only accessors for idle state and analytics.

    /********************************************************************
    Get milliseconds elapsed since the last activity. Frozen while
    paused.

    @return {Number} - Elapsed milliseconds
    *********************************************************************/
    getElapsed: function () {

      // Return frozen value while paused
      if (state.paused) {
        return state.pause_elapsed_ms;
      }

      // Calculate elapsed time since last activity
      return _Idle.getElapsedMs();

    },


    /********************************************************************
    Get the timestamp of the last recorded activity.

    @return {Number} - Last active timestamp in milliseconds
    *********************************************************************/
    getLastActive: function () {

      // Return last active timestamp
      return state.last_active_ms;

    },


    /********************************************************************
    Get total milliseconds spent in the idle state, including the
    in-progress period.

    @return {Number} - Total idle milliseconds
    *********************************************************************/
    getTotalIdle: function () {

      // Sync the analytics period before computing
      _Idle.checkIdleTransition();

      // Return total plus in-progress idle period
      let total = state.total_idle_ms;
      if (!state.paused && state.period_is_idle && state.period_start_ms !== null) {
        total += Lib.Utils.getUnixTimeInMilliSeconds() - state.period_start_ms;
      }

      // Return total idle time
      return total;

    },


    /********************************************************************
    Get total milliseconds spent in the active state, including the
    in-progress period.

    @return {Number} - Total active milliseconds
    *********************************************************************/
    getTotalActive: function () {

      // Sync the analytics period before computing
      _Idle.checkIdleTransition();

      // Return total plus in-progress active period
      let total = state.total_active_ms;
      if (!state.paused && !state.period_is_idle && state.period_start_ms !== null) {
        total += Lib.Utils.getUnixTimeInMilliSeconds() - state.period_start_ms;
      }

      // Return total active time
      return total;

    }

  };///////////////////////////Public Functions END//////////////////////////////



  //////////////////////////Private Functions START//////////////////////////////

  const _Idle = {

    // ~~~~~~~~~~~~~~~~~~~~ Threshold Registry Internals ~~~~~~~~~~~~~~~~~~~~
    // Timer scheduling, analytics period tracking, and elapsed computation.

    /********************************************************************
    Record activity and re-arm all thresholds. Closes the idle
    analytics period and opens a fresh active period.
    *********************************************************************/
    touch: function () {

      // Capture the current timestamp
      const now = Lib.Utils.getUnixTimeInMilliSeconds();

      // Close the current analytics period if one is open
      if (state.period_start_ms !== null) {

        // If the current period was idle, accumulate idle time
        if (state.period_is_idle) {
          state.total_idle_ms += now - state.period_start_ms;
        } else {
          state.total_active_ms += now - state.period_start_ms;
        }

      }

      // Open a fresh active period
      state.period_start_ms = now;
      state.period_is_idle = false;

      // Update the last active timestamp
      state.last_active_ms = now;

      // Re-arm all thresholds
      _Idle.rescheduleThresholds();

    },


    /********************************************************************
    Close the current analytics period into its total. Called on
    pause and before rescheduling thresholds.
    *********************************************************************/
    closePeriod: function () {

      // Guard: no period open
      if (state.period_start_ms === null) {
        return;
      }

      // Capture the current timestamp
      const now = Lib.Utils.getUnixTimeInMilliSeconds();

      // Accumulate into the correct total
      if (state.period_is_idle) {
        state.total_idle_ms += now - state.period_start_ms;
      } else {
        state.total_active_ms += now - state.period_start_ms;
      }

      // Close the period
      state.period_start_ms = null;

    },


    /********************************************************************
    Schedule (or fire) a single threshold by id. If the threshold's
    ms has already elapsed, fire immediately.
    *********************************************************************/
    scheduleThreshold: function (id) {

      // Guard: do not schedule while paused
      if (state.paused) {
        return;
      }

      // Guard: handler may have been unregistered
      if (!state.handlers[id]) {
        return;
      }

      // Calculate remaining delta for this threshold
      const elapsed = _Idle.getElapsedMs();
      const delta = state.handlers[id].ms - elapsed;

      // If already elapsed, fire immediately
      if (delta <= 0) {
        state.handlers[id].fired = true;
        _Idle.checkIdleTransition();
        state.handlers[id].callback();
        return;
      }

      // Schedule the threshold timer
      state.handlers[id].fired = false;
      state.handlers[id].timeout_id = setTimeout(function () {

        // Mark as fired and invoke the callback
        state.handlers[id].fired = true;
        state.handlers[id].timeout_id = null;
        _Idle.checkIdleTransition();
        state.handlers[id].callback();

      }, delta);

    },


    /********************************************************************
    Reschedule all registered thresholds for their remaining delta.
    Called on touch and on resume.
    *********************************************************************/
    rescheduleThresholds: function () {

      // Clear all existing timers and reschedule
      const ids = Object.keys(state.handlers);
      for (let i = 0; i < ids.length; i++) {
        const id = ids[i];

        // Clear any existing timer
        if (state.handlers[id].timeout_id) {
          clearTimeout(state.handlers[id].timeout_id);
          state.handlers[id].timeout_id = null;
        }

        // Reschedule (or fire immediately if already elapsed)
        _Idle.scheduleThreshold(id);

      }

    },


    /********************************************************************
    Clear all pending threshold timers without removing handlers.
    *********************************************************************/
    clearAllTimers: function () {

      // Clear every handler's timer
      const ids = Object.keys(state.handlers);
      for (let i = 0; i < ids.length; i++) {
        if (state.handlers[ids[i]].timeout_id) {
          clearTimeout(state.handlers[ids[i]].timeout_id);
          state.handlers[ids[i]].timeout_id = null;
        }
      }

    },


    /********************************************************************
    Calculate milliseconds elapsed since last activity.

    @return {number} - Elapsed ms
    *********************************************************************/
    getElapsedMs: function () {

      // Return 0 if no activity recorded yet
      if (state.last_active_ms === null) {
        return 0;
      }

      // Calculate elapsed since last activity
      return Lib.Utils.getUnixTimeInMilliSeconds() - state.last_active_ms;

    },


    /********************************************************************
    Check if the idle classification has flipped and update the
    analytics period accordingly. Called before threshold callbacks
    fire.
    *********************************************************************/
    checkIdleTransition: function () {

      // Guard: no period open or already idle
      if (state.period_start_ms === null || state.period_is_idle) {
        return;
      }

      // Check if elapsed has crossed idle_ms
      const now = Lib.Utils.getUnixTimeInMilliSeconds();
      const elapsed = now - state.last_active_ms;

      if (elapsed >= CONFIG.IDLE_MS) {

        // Close the active period and open an idle period
        state.total_active_ms += CONFIG.IDLE_MS;
        state.period_start_ms = state.last_active_ms + CONFIG.IDLE_MS;
        state.period_is_idle = true;

      }

    }

  };//////////////////////////Private Functions END//////////////////////////////


  return Idle;

};/////////////////////////// createInterface END //////////////////////////////
