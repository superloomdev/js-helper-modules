// Info: Keyed count-down and count-up timers with drift correction and React hooks.
//
// Class I Framework Module: standalone module that depends on React by injection.
// No pure parent; no extensions. Framework-free logic (timer math, pause/resume,
// drift-corrected remaining/elapsed) lives alongside framework-bound logic
// (useTimer, useCountdown) in one package.
//
// Provides: start, pause, resume, stop, reset, stopAll, getRemaining,
//           getElapsed, getState, useTimer, useCountdown
//
// React arrives via shared_libs.React (never import React directly).
// This module never references document, window, or react-native.
// Schedule-at-hour-and-minute belongs in js-helper-time, not here.
//
// Compatibility: React 18+, React Native, React Native Web.
//
// Factory pattern: each loader call returns an independent instance with
// its own state and config.
//
'use strict';


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
module.exports = function loader (shared_libs, config) {

  // Dependencies for this instance (React picked off the injected container)
  const Lib = {
    Utils: shared_libs.Utils,
    Debug: shared_libs.Debug,
    React: shared_libs.React
  };

  // Merge overrides over defaults
  const CONFIG = Object.assign(
    {},
    require('./timer.config'),
    config || {}
  );

  // Error catalog (frozen, owned by the main module)
  const ERRORS = require('./timer.errors');

  // Validators singleton - Lib, ERRORS injected here
  const Validators = require('./timer.validators')(Lib, ERRORS);

  // Validate config immediately so misconfiguration fails at startup
  Validators.validateConfig(CONFIG);

  // Mutable per-instance state: keyed timer registry
  const state = {
    timers: {}
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
@param {Object} state     - Mutable state holder (timers registry)

@return {Object} - Public interface for this module
*********************************************************************/
const createInterface = function (Lib, CONFIG, ERRORS, Validators, state) {

  ///////////////////////////Public Functions START//////////////////////////////
  const Timer = {

    // ~~~~~~~~~~~~~~~~~~~~ Timer Lifecycle ~~~~~~~~~~~~~~~~~~~~
    // Start, pause, resume, stop, and reset keyed timers.

    /********************************************************************
    Start a keyed timer. If the key already exists, the previous timer
    is stopped and replaced.

@param {string} key              - Timer key (defaults to 'default')
@param {Object} options          - Timer options
@param {number} options.duration_ms  - Total duration in ms (required)
@param {string} options.direction    - 'down' or 'up' (default: 'down')
@param {number} options.tick_ms      - Tick interval in ms (default: 1000)
@param {Function} options.onTick     - Called on each tick with current value
@param {Function} options.onDone     - Called when countdown reaches zero

@return {Object} - { success, data, error }
    *********************************************************************/
    start: function (key, options) {

      // Normalize arguments: key is optional
      if (typeof key === 'object' && key !== null) {
        options = key;
        key = 'default';
      }
      key = key || 'default';
      options = options || {};

      // Validate options (throws TypeError on programmer error)
      Validators.validateStart(options);

      // Stop existing timer with this key if present
      _Timer.stopByKey(key);

      // Build the timer record
      const now = Lib.Utils.getUnixTimeInMilliSeconds();
      const direction = options.direction || 'down';
      const tick_ms = options.tick_ms || 1000;
      const duration_ms = options.duration_ms;

      const timerRecord = {
        key: key,
        direction: direction,
        duration_ms: duration_ms,
        tick_ms: tick_ms,
        onTick: options.onTick || null,
        onDone: options.onDone || null,
        start_ms: now,
        paused: false,
        pause_accumulated_ms: 0,
        pause_start_ms: null,
        tick_interval_id: null,
        done_timeout_id: null,
        state: 'running'
      };

      // Store the timer
      state.timers[key] = timerRecord;

      // Schedule the tick interval
      _Timer.scheduleTicks(key);

      // Schedule the done callback for countdown timers
      if (direction === 'down') {
        _Timer.scheduleDone(key);
      }

      // Return successful response
      return {
        success: true,
        data: { key: key, state: 'running' },
        error: null
      };

    },


    /********************************************************************
    Pause a keyed timer. Freezes the elapsed clock and clears pending
    tick/done timers.

@param {string} key - Timer key (defaults to 'default')

@return {Object} - { success, data, error }
    *********************************************************************/
    pause: function (key) {

      key = key || 'default';

      // Guard: timer does not exist
      if (!state.timers[key]) {

        // Return error for unknown timer
        return {
          success: false,
          data: { paused: null },
          error: ERRORS.TIMER_NOT_FOUND
        };

      }

      // Guard: already paused
      if (state.timers[key].paused) {

        // Early return: already paused
        return {
          success: true,
          data: { key: key, paused: true },
          error: null
        };

      }

      // Record pause start, clear timers, mark as paused
      state.timers[key].pause_start_ms = Lib.Utils.getUnixTimeInMilliSeconds();
      _Timer.clearTimers(key);
      state.timers[key].paused = true;
      state.timers[key].state = 'paused';

      // Return successful response
      return {
        success: true,
        data: { key: key, paused: true },
        error: null
      };

    },


    /********************************************************************
    Resume a paused timer. Adjusts the pause accumulator and
    reschedules tick/done timers for the remaining delta.

@param {string} key - Timer key (defaults to 'default')

@return {Object} - { success, data, error }
    *********************************************************************/
    resume: function (key) {

      key = key || 'default';

      // Guard: timer does not exist
      if (!state.timers[key]) {

        // Return error for unknown timer
        return {
          success: false,
          data: { paused: null },
          error: ERRORS.TIMER_NOT_FOUND
        };

      }

      // Guard: not paused
      if (!state.timers[key].paused) {

        // Early return: not paused
        return {
          success: true,
          data: { key: key, paused: false },
          error: null
        };

      }

      // Accumulate paused duration
      const now = Lib.Utils.getUnixTimeInMilliSeconds();
      state.timers[key].pause_accumulated_ms += now - state.timers[key].pause_start_ms;
      state.timers[key].pause_start_ms = null;
      state.timers[key].paused = false;
      state.timers[key].state = 'running';

      // Reschedule ticks and done
      _Timer.scheduleTicks(key);
      if (state.timers[key].direction === 'down') {
        _Timer.scheduleDone(key);
      }

      // Return successful response
      return {
        success: true,
        data: { key: key, paused: false },
        error: null
      };

    },


    /********************************************************************
    Stop a keyed timer. Clears all timers and removes the record.

@param {string} key - Timer key (defaults to 'default')

@return {Object} - { success, data, error }
    *********************************************************************/
    stop: function (key) {

      key = key || 'default';

      // Guard: timer does not exist
      if (!state.timers[key]) {

        // Return error for unknown timer
        return {
          success: false,
          data: { stopped: null },
          error: ERRORS.TIMER_NOT_FOUND
        };

      }

      // Clear timers and delete the record
      _Timer.stopByKey(key);

      // Return successful response
      return {
        success: true,
        data: { key: key, stopped: true },
        error: null
      };

    },


    /********************************************************************
    Reset a keyed timer to its initial state. Keeps the same options
    but restarts the clock from now.

@param {string} key - Timer key (defaults to 'default')

@return {Object} - { success, data, error }
    *********************************************************************/
    reset: function (key) {

      key = key || 'default';

      // Guard: timer does not exist
      if (!state.timers[key]) {

        // Return error for unknown timer
        return {
          success: false,
          data: { reset: null },
          error: ERRORS.TIMER_NOT_FOUND
        };

      }

      // Reset the clock to now, clear pause state
      _Timer.clearTimers(key);
      const now = Lib.Utils.getUnixTimeInMilliSeconds();
      state.timers[key].start_ms = now;
      state.timers[key].pause_accumulated_ms = 0;
      state.timers[key].pause_start_ms = null;
      state.timers[key].paused = false;
      state.timers[key].state = 'running';

      // Reschedule ticks and done
      _Timer.scheduleTicks(key);
      if (state.timers[key].direction === 'down') {
        _Timer.scheduleDone(key);
      }

      // Return successful response
      return {
        success: true,
        data: { key: key, state: 'running' },
        error: null
      };

    },


    /********************************************************************
    Stop every timer and clear the registry.

@return {Object} - { success, data, error }
    *********************************************************************/
    stopAll: function () {

      // Count and remove all timers
      let count = 0;
      const keys = Object.keys(state.timers);
      for (let i = 0; i < keys.length; i++) {
        _Timer.stopByKey(keys[i]);
        count += 1;
      }

      // Return successful response with the count
      return {
        success: true,
        data: { stopped_count: count },
        error: null
      };

    },


    // ~~~~~~~~~~~~~~~~~~~~ Query Functions ~~~~~~~~~~~~~~~~~~~~
    // Drift-corrected read-only accessors.

    /********************************************************************
    Get milliseconds remaining for a countdown timer. Computed from
    wall-clock arithmetic, never from a per-tick counter.

@param {string} key - Timer key (defaults to 'default')

@return {Object} - { success, data, error }
    *********************************************************************/
    getRemaining: function (key) {

      key = key || 'default';

      // Guard: timer does not exist
      if (!state.timers[key]) {

        // Return error for unknown timer
        return {
          success: false,
          data: { remaining_ms: null },
          error: ERRORS.TIMER_NOT_FOUND
        };

      }

      // Compute remaining from wall clock
      const remaining = _Timer.computeRemaining(key);

      // Return remaining time
      return {
        success: true,
        data: { remaining_ms: remaining },
        error: null
      };

    },


    /********************************************************************
    Get milliseconds elapsed since the timer started. Computed from
    wall-clock arithmetic, never from a per-tick counter.

@param {string} key - Timer key (defaults to 'default')

@return {Object} - { success, data, error }
    *********************************************************************/
    getElapsed: function (key) {

      key = key || 'default';

      // Guard: timer does not exist
      if (!state.timers[key]) {

        // Return error for unknown timer
        return {
          success: false,
          data: { elapsed_ms: null },
          error: ERRORS.TIMER_NOT_FOUND
        };

      }

      // Compute elapsed from wall clock
      const elapsed = _Timer.computeElapsed(key);

      // Return elapsed time
      return {
        success: true,
        data: { elapsed_ms: elapsed },
        error: null
      };

    },


    /********************************************************************
    Get the current state of a keyed timer.

@param {string} key - Timer key (defaults to 'default')

@return {Object} - { success, data, error }
    *********************************************************************/
    getState: function (key) {

      key = key || 'default';

      // Guard: timer does not exist
      if (!state.timers[key]) {

        // Return error for unknown timer
        return {
          success: false,
          data: { state: null },
          error: ERRORS.TIMER_NOT_FOUND
        };

      }

      // Return current state
      return {
        success: true,
        data: {
          key: key,
          state: state.timers[key].state,
          direction: state.timers[key].direction,
          paused: state.timers[key].paused
        },
        error: null
      };

    },


    // ~~~~~~~~~~~~~~~~~~~~ React Hooks ~~~~~~~~~~~~~~~~~~~~
    // useTimer and useCountdown bridge timer state into re-renders.

    /********************************************************************
    React hook for a keyed timer. Owns useState for the displayed
    value, feeds it from onTick, and stops the timer on unmount.

@param {string} key              - Timer key (defaults to 'default')
@param {Object} options          - Same options as start()

@return {Object} - { value, start, pause, resume, stop, reset, getRemaining, getElapsed }
    *********************************************************************/
    useTimer: function (key, options) {

      // Normalize arguments: key is optional
      if (typeof key === 'object' && key !== null) {
        options = key;
        key = 'default';
      }
      options = options || {};

      // Initialize React state for the displayed value
      const React = Lib.React;
      const initialValue = options.direction === 'up' ? 0 : (options.duration_ms || 0);
      const [value, setValue] = React.useState(initialValue);

      // Start the timer on mount, stop on unmount
      React.useEffect(function () {

        // Wrap onTick to update React state
        const userOnTick = options.onTick;
        options.onTick = function (v) {
          setValue(v);
          if (userOnTick) {
            userOnTick(v);
          }
        };

        // Wrap onDone to fire user callback
        const userOnDone = options.onDone;
        options.onDone = function () {
          if (userOnDone) {
            userOnDone();
          }
        };

        // Start the timer
        Timer.start(key, options);

        // Cleanup on unmount: stop the timer
        return function () {
          Timer.stop(key);
        };

      }, []);

      // Return the displayed value plus control functions
      return {
        value: value,
        start: function (opts) {
          return Timer.start(key, opts || options);
        },
        pause: function () {
          return Timer.pause(key);
        },
        resume: function () {
          return Timer.resume(key);
        },
        stop: function () {
          return Timer.stop(key);
        },
        reset: function () {
          return Timer.reset(key);
        },
        getRemaining: function () {
          return Timer.getRemaining(key);
        },
        getElapsed: function () {
          return Timer.getElapsed(key);
        }
      };

    },


    /********************************************************************
    React hook for a countdown timer. Convenience wrapper around
    useTimer with direction fixed to 'down'.

@param {string} key              - Timer key (defaults to 'default')
@param {number} duration_ms      - Countdown duration in ms

@return {Object} - { value, start, pause, resume, stop, reset, getRemaining, getElapsed }
    *********************************************************************/
    useCountdown: function (key, duration_ms) {

      // Normalize arguments: key is optional
      if (typeof key === 'number') {
        duration_ms = key;
        key = 'default';
      }

      // Delegate to useTimer with direction down
      return Timer.useTimer(key, {
        duration_ms: duration_ms,
        direction: 'down',
        tick_ms: 1000
      });

    }

  };///////////////////////////Public Functions END//////////////////////////////



  //////////////////////////Private Functions START//////////////////////////////

  const _Timer = {

    // ~~~~~~~~~~~~~~~~~~~~ Timer Math ~~~~~~~~~~~~~~~~~~~~
    // Drift-corrected computation from wall-clock arithmetic.

    /********************************************************************
    Compute elapsed ms for a timer, subtracting paused time.

@param {string} key - Timer key

@return {number} - Elapsed ms
    *********************************************************************/
    computeElapsed: function (key) {

      const t = state.timers[key];
      const now = Lib.Utils.getUnixTimeInMilliSeconds();

      // If paused, freeze at the pause point
      if (t.paused && t.pause_start_ms !== null) {
        return (t.pause_start_ms - t.start_ms) - t.pause_accumulated_ms;
      }

      // Wall-clock arithmetic: now - start - paused
      return (now - t.start_ms) - t.pause_accumulated_ms;

    },


    /********************************************************************
    Compute remaining ms for a countdown timer.

@param {string} key - Timer key

@return {number} - Remaining ms (never negative)
    *********************************************************************/
    computeRemaining: function (key) {

      const t = state.timers[key];

      // Count-up timers have no remaining concept
      if (t.direction === 'up') {
        return 0;
      }

      // Wall-clock arithmetic: duration - elapsed
      const remaining = t.duration_ms - _Timer.computeElapsed(key);

      // Return 0 if time has expired
      return remaining > 0 ? remaining : 0;

    },


    // ~~~~~~~~~~~~~~~~~~~~ Scheduling ~~~~~~~~~~~~~~~~~~~~
    // Tick intervals and done callbacks.

    /********************************************************************
    Schedule the tick interval for a timer. Each tick fires onTick
    with the current drift-corrected value.
    *********************************************************************/
    scheduleTicks: function (key) {

      const t = state.timers[key];

      // Guard: no onTick callback or no tick_ms
      if (!t.onTick || !t.tick_ms) {
        return;
      }

      // Schedule the tick interval
      t.tick_interval_id = setInterval(function () {

        // Compute the current value from wall clock
        const elapsed = _Timer.computeElapsed(key);
        let value;

        if (t.direction === 'down') {
          value = t.duration_ms - elapsed;
          if (value < 0) {
            value = 0;
          }
        } else {
          value = elapsed;
        }

        // Fire the onTick callback
        t.onTick(value);

      }, t.tick_ms);

    },


    /********************************************************************
    Schedule the done callback for a countdown timer. Fires once
    when the remaining delta reaches zero.
    *********************************************************************/
    scheduleDone: function (key) {

      const t = state.timers[key];

      // Guard: no onDone callback
      if (!t.onDone) {
        return;
      }

      // Compute remaining delta from wall clock
      const remaining = _Timer.computeRemaining(key);

      // If already expired, fire immediately
      if (remaining <= 0) {
        t.state = 'done';
        t.onDone();
        return;
      }

      // Schedule the done timeout
      t.done_timeout_id = setTimeout(function () {

        // Mark as done and fire the callback
        t.state = 'done';
        t.done_timeout_id = null;
        _Timer.clearTickInterval(key);
        t.onDone();

      }, remaining);

    },


    /********************************************************************
    Clear the tick interval for a timer.
    *********************************************************************/
    clearTickInterval: function (key) {

      const t = state.timers[key];

      if (t.tick_interval_id) {
        clearInterval(t.tick_interval_id);
        t.tick_interval_id = null;
      }

    },


    /********************************************************************
    Clear all pending timers (tick + done) for a timer.
    *********************************************************************/
    clearTimers: function (key) {

      const t = state.timers[key];

      _Timer.clearTickInterval(key);

      if (t.done_timeout_id) {
        clearTimeout(t.done_timeout_id);
        t.done_timeout_id = null;
      }

    },


    /********************************************************************
    Stop and delete a timer by key.
    *********************************************************************/
    stopByKey: function (key) {

      if (state.timers[key]) {
        _Timer.clearTimers(key);
        delete state.timers[key];
      }

    }

  };//////////////////////////Private Functions END//////////////////////////////


  return Timer;

};/////////////////////////// createInterface END //////////////////////////////
