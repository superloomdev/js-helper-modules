// Info: Request and process lifecycle manager. Tracks background routines,
// request-scoped teardown, and process-scoped teardown.
// Server-only: used by both Lambda and persistent (Express) deployments.
//
// Factory pattern: each loader call returns an independent Instance interface
// with its own Lib, CONFIG, ERRORS, and Validators.
//
// Three registries, two lifetimes:
//   background routines       - per request, held on the instance object.
//                               A gate, not teardown: cleanup waits for these
//                               before tearing anything down.
//   instance cleanup routines - per request, held on the instance object.
//                               Release a borrowed connection, close a temp
//                               file, drop a per-request handle.
//   process cleanup routines  - per process, held in this module's state.
//                               A connection pool outlives every request that
//                               used it, so its teardown cannot live on an
//                               instance object that is discarded with the
//                               response. state lives as long as Lib does.
'use strict';



/////////////////////////// Module-Loader START ////////////////////////////////

/********************************************************************
Factory loader. One call = one independent instance with its own
Lib, CONFIG, ERRORS, and Validators.

@param {Object} shared_libs - Lib container with Utils and Debug
@param {Object} config - Overrides merged over module config defaults

@return {Object} - Public interface for this module
*********************************************************************/
module.exports = function loader (shared_libs, config) {

  // Dependencies for this instance
  const Lib = {
    Utils: shared_libs.Utils,
    Debug: shared_libs.Debug
  };

  // Merge overrides over defaults
  const CONFIG = Object.assign(
    {},
    require('./instance.config'),
    config || {}
  );

  // Error catalog (frozen, shared across instances)
  const ERRORS = require('./instance.errors');

  // Validators module (initialized with Lib, ERRORS)
  const Validators = require('./instance.validators')(Lib, ERRORS);

  // Validate config immediately so misconfiguration fails at startup
  Validators.validateConfig(CONFIG);

  // Create and return the public interface
  return createInterface(Lib, CONFIG, ERRORS, Validators);

};///////////////////////////// Module-Loader END ///////////////////////////////



/////////////////////////// createInterface START //////////////////////////////

/********************************************************************
Builds the public interface for one instance. Public and private
functions close over the provided Lib, CONFIG, ERRORS, and Validators.

@param {Object} Lib - Dependency container (Utils, Debug)
@param {Object} CONFIG - Merged configuration for this instance
@param {Object} ERRORS - Error catalog for this module (currently empty -
                         module has no operational errors, only programmer
                         TypeError; kept for cross-module consistency)
@param {Object} Validators - Validators module instance

@return {Object} - Public interface for this module
*********************************************************************/
const createInterface = function (Lib, CONFIG, ERRORS, Validators) { // eslint-disable-line no-unused-vars

  // Process-scoped teardown routines. This closure is built once by the
  // composition root and stored on Lib.Instance, so it lives exactly as long
  // as Lib does - across every request, unlike the per-request instance
  // object which is discarded once the response is sent.
  const state = {
    process_cleanup_queue: []
  };


  ///////////////////////////Public Functions START//////////////////////////////
  const Instance = {

    // ~~~~~~~~~~~~~~~~~~~~ Lifecycle ~~~~~~~~~~~~~~~~~~~~
    // Instance creation and state initialization.

    /********************************************************************
    Initialize a new request instance object.
    The instance is a lightweight reference passed to all functions during a request.

    @return {Object} - New instance object with default properties
    *********************************************************************/
    initialize: function () {

      const obj = {
        'time': 0,
        'time_ms': 0,
        'logger_counter': 0,
        'background_routines': [],
        'cleanup_queue': []
      };

      // Set initiation timestamps using Lib.Utils (DRY - not raw Date.now)
      obj['time'] = Lib.Utils.getUnixTime();
      obj['time_ms'] = Lib.Utils.getUnixTimeInMilliSeconds();

      return obj;

    },


    // ~~~~~~~~~~~~~~~~~~~~ Background Routines ~~~~~~~~~~~~~~~~~~~~
    // Work that runs in parallel with the response and must finish before
    // anything is torn down.

    /********************************************************************
    Register a background routine that runs in parallel with the response.
    Call the returned function when the work settles, from a finally block
    so it fires on both success and failure.

    Tracked as a promise rather than a counter, so runInstanceCleanup can
    await completion instead of checking a count and giving up. A routine
    may itself register another background routine.

    @param {Object} instance - Request instance object reference

    @return {Function} - Completion signal. Call when the routine finishes.
    *********************************************************************/
    addBackgroundRoutine: function (instance) {

      // Track the routine as a promise so cleanup can await it. Resolve-only
      // by construction - the caller receives a signal function and has no
      // way to reject, so awaiting this can never throw.
      let signalComplete;
      const routine = new Promise(function (resolve) {
        signalComplete = resolve;
      });

      instance['background_routines'].push(routine);

      // Completion signal handed back to the caller
      return function () {

        // Drop from the list before resolving, so the count reports only
        // work still in flight
        const position = instance['background_routines'].indexOf(routine);
        if (position > -1) {
          instance['background_routines'].splice(position, 1);
        }

        signalComplete();

      };

    },


    /********************************************************************
    Get the number of background routines still in flight

    @param {Object} instance - Request instance object reference

    @return {Integer} - Number of unfinished background routines
    *********************************************************************/
    getBackgroundRoutineCount: function (instance) {

      // Return the count of routines yet to signal completion
      return instance['background_routines'].length;

    },


    // ~~~~~~~~~~~~~~~~~~~~ Instance Cleanup ~~~~~~~~~~~~~~~~~~~~
    // Teardown for resources that belong to this request alone.

    /********************************************************************
    Add a routine that releases a request-scoped resource, such as a
    connection borrowed from a pool or a temporary file.

    Runs at the end of this request on every deployment. Declare it async
    by convention; a synchronous routine also works because each is awaited.
    The routine receives the instance and may ignore it.

    @param {Object} instance - Request instance object reference
    @param {Function} cleanup_function - Routine to run. Signature: fn(instance)

    @return {void}
    *********************************************************************/
    addInstanceCleanupRoutine: function (instance, cleanup_function) {

      // Append to the per-request queue
      instance['cleanup_queue'].push(cleanup_function);

    },


    /********************************************************************
    Get the number of registered instance cleanup routines

    @param {Object} instance - Request instance object reference

    @return {Integer} - Number of routines waiting to run
    *********************************************************************/
    getInstanceCleanupRoutineCount: function (instance) {

      // Return the number of registered routines
      return instance['cleanup_queue'].length;

    },


    /********************************************************************
    Run teardown for this request. Called once by whatever returns the
    main thread, after the response has been sent.

    Waits for background routines rather than skipping while they are in
    flight, so nothing is abandoned when the runtime freezes after the
    response. Nothing re-triggers this function; it simply does not finish
    until the work it is waiting on has.

    @param {Object} instance - Request instance object reference

    @return {Promise<void>}
    *********************************************************************/
    runInstanceCleanup: async function (instance) {

      // Background work must land before anything it depends on is closed
      await _Instance.waitForBackgroundRoutines(instance);

      // Request-scoped routines run on every deployment
      const queue = instance['cleanup_queue'];
      instance['cleanup_queue'] = [];
      await _Instance.drainQueue(queue, instance);

      // On a runtime that must not hold handles between requests, the
      // resources registered as process-scoped are closed here too
      if (CONFIG.CLOSE_ON_CLEANUP) {
        await Instance.runProcessCleanup();
      }

    },


    // ~~~~~~~~~~~~~~~~~~~~ Process Cleanup ~~~~~~~~~~~~~~~~~~~~
    // Teardown for resources shared by every request in this process.

    /********************************************************************
    Add a routine that closes a process-scoped resource, such as a
    database connection pool. Registered once by whatever opened the
    resource, never once per request.

    The caller declares what the resource is and never decides when it
    closes. This function files it against the deployment's policy:
    CLOSE_ON_CLEANUP true files it with the current request, false files
    it against the process.

    @param {Object} instance - Request instance object reference
    @param {Function} cleanup_function - Routine to run. Signature: fn(instance)

    @return {void}
    *********************************************************************/
    addProcessCleanupRoutine: function (instance, cleanup_function) {

      // A runtime that must not hold handles between requests closes this
      // with the request that opened it
      if (CONFIG.CLOSE_ON_CLEANUP) {
        instance['cleanup_queue'].push(cleanup_function);
        return;
      }

      // Otherwise it is shared by every later request and closes once, at
      // shutdown, from this module's own state
      state.process_cleanup_queue.push(cleanup_function);

    },


    /********************************************************************
    Get the number of registered process cleanup routines.
    Takes no instance - there is no request in progress at shutdown.

    @return {Integer} - Number of routines waiting to run
    *********************************************************************/
    getProcessCleanupRoutineCount: function () {

      // Return the number of registered routines
      return state.process_cleanup_queue.length;

    },


    /********************************************************************
    Run teardown for process-scoped resources. A persistent deployment
    calls this from its SIGTERM handler. A deployment with
    CLOSE_ON_CLEANUP enabled reaches it through runInstanceCleanup and
    never calls it directly.

    @return {Promise<void>}
    *********************************************************************/
    runProcessCleanup: async function () {

      // Detach before draining so a routine that re-registers during
      // teardown is picked up by the next run rather than dropped
      const queue = state.process_cleanup_queue.splice(0, state.process_cleanup_queue.length);

      await _Instance.drainQueue(queue, null);

    },


    // ~~~~~~~~~~~~~~~~~~~~ Introspection ~~~~~~~~~~~~~~~~~~~~
    // Read-only views of instance state.

    /********************************************************************
    Get the age of this instance in milliseconds

    @param {Object} instance - Request instance object reference

    @return {Integer} - Milliseconds since the instance was initialized
    *********************************************************************/
    getAge: function (instance) {

      // Return elapsed time as a delta, never a raw clock read
      return Lib.Utils.getUnixTimeInMilliSeconds() - instance['time_ms'];

    }

  };//////////////////////////Public Functions END/////////////////////////////



  //////////////////////////Private Functions START/////////////////////////////
  const _Instance = {

    /********************************************************************
    Wait until no background routine is in flight.

    Loops rather than awaiting one batch, because a background routine may
    register another one while this is waiting. There is deliberately no
    timeout: abandoning a routine here would silently drop an audit row or
    leave a consumed one-time code reusable. A routine that never signals
    is a defect, and surfacing it as a runtime timeout in the platform log
    is preferable to hiding it.

    @param {Object} instance - Request instance object reference

    @return {Promise<void>}
    *********************************************************************/
    waitForBackgroundRoutines: async function (instance) {

      while (instance['background_routines'].length > 0) {

        // slice() takes a stable snapshot to await while the live array
        // shrinks as each routine signals completion. allSettled rather
        // than all, so one rejected routine can never prevent the teardown
        // that runs after this
        await Promise.allSettled(instance['background_routines'].slice());

      }

    },


    /********************************************************************
    Run a queue of teardown routines in registration order, one at a time.

    @param {Array} queue - Routines to run
    @param {Object} instance - Passed to each routine, or null when the
                              teardown is process-scoped and no request
                              is in progress

    @return {Promise<void>}
    *********************************************************************/
    drainQueue: async function (queue, instance) {

      for (const routine of queue) {

        // Awaiting a synchronous routine is harmless, so a routine may be
        // either. Each is caught individually: one failure must never
        // strand the routines registered after it
        try {
          await routine(instance);
        } catch (error) {
          Lib.Debug.error('Instance teardown routine failed', error);
        }

      }

    }

  };//////////////////////////Private Functions END/////////////////////////////



  // Return public interface
  return Instance;

};/////////////////////////// createInterface END ///////////////////////////////
