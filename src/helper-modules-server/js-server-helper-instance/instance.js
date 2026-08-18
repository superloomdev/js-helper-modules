// Info: Request instance lifecycle manager. Initialize, cleanup, and background routine tracking.
// Server-only: manages per-request state for Lambda and Express deployments.
//
// Factory pattern: each loader call returns an independent Instance interface
// with its own Lib, CONFIG, ERRORS, and Validators. Stateless - the per-request
// instance object is returned to callers and never held inside this module.
'use strict';



/////////////////////////// Module-Loader START ////////////////////////////////

/********************************************************************
Factory loader. One call = one independent instance with its own
Lib, CONFIG, ERRORS, and Validators.

@param {Object} shared_libs - Lib container with Utils
@param {Object} config - Overrides merged over module config defaults

@return {Object} - Public interface for this module
*********************************************************************/
module.exports = function loader (shared_libs, config) {

  // Dependencies for this instance
  const Lib = {
    Utils: shared_libs.Utils
  };

  // Merge overrides over defaults
  const CONFIG = Object.assign(
    {},
    require('./instance.config'),
    config || {}
  );

  // Error catalog (frozen, shared across instances)
  const ERRORS = require('./instance.errors');

  // Validators module (singleton, initialized with Lib, ERRORS)
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

@param {Object} Lib - Dependency container (Utils)
@param {Object} CONFIG - Merged configuration for this instance
@param {Object} ERRORS - Error catalog for this module (currently empty -
                         module has no operational errors, only programmer
                         TypeError; kept for cross-module consistency)
@param {Object} Validators - Validators module instance

@return {Object} - Public interface for this module
*********************************************************************/
const createInterface = function (Lib, CONFIG, ERRORS, Validators) { // eslint-disable-line no-unused-vars

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
        'background_queue': 0,
        'cleanup_queue': []
      };

      // Set initiation timestamps using Lib.Utils (DRY - not raw Date.now)
      obj['time'] = Lib.Utils.getUnixTime();
      obj['time_ms'] = Lib.Utils.getUnixTimeInMilliSeconds();

      return obj;

    },


    // ~~~~~~~~~~~~~~~~~~~~ Cleanup ~~~~~~~~~~~~~~~~~~~~
    // Cleanup queue management and execution.

    /********************************************************************
    Add a cleanup function to instance's cleanup queue.
    Cleanup functions are executed when the request completes and all background routines finish.
    Each cleanup function receives the instance as its only parameter.

    @param {Object} instance - Request instance object reference
    @param {Function} cleanup_function - Function to call during cleanup. Signature: fn(instance)

    @return {void}
    *********************************************************************/
    addCleanupRoutine: function (instance, cleanup_function) {

      // Append the cleanup function to the instance's queue
      instance['cleanup_queue'].push(cleanup_function);

    },


    /********************************************************************
    Run all cleanup functions in the cleanup queue.
    Only runs if all background routines have completed.

    @param {Object} instance - Request instance object reference

    @return {void}
    *********************************************************************/
    cleanup: function (instance) {

      // Only run if no pending background routines and cleanup queue is non-empty
      if (
        instance['background_queue'] <= 0 &&
        instance['cleanup_queue'].length > 0
      ) {

        // Execute each cleanup function
        instance['cleanup_queue'].forEach(function (cleanup_function) {
          cleanup_function(instance);
        });

        // Reset cleanup queue
        instance['cleanup_queue'] = [];

      }

    },


    /********************************************************************
    Register a new background routine on the instance.
    Background routines run in parallel and do not block the response.
    When a background routine completes, call the returned function to signal completion.
    Cleanup is automatically triggered when all background routines finish.

    @param {Object} instance - Request instance object reference

    @return {Function} - Completion callback. Call this when the background routine finishes.
    *********************************************************************/
    backgroundRoutine: function (instance) {

      // Increment counter for new parallel background routine
      instance['background_queue']++;

      // Return completion callback
      return function () {
        _Instance.backgroundRoutineComplete(instance);
      };

    },


    /********************************************************************
    Get the current number of pending background routines

    @param {Object} instance - Request instance object reference

    @return {Integer} - Number of pending background routines
    *********************************************************************/
    getBackgroundQueueCount: function (instance) {

      // Return the current background queue count
      return instance['background_queue'];

    },


    /********************************************************************
    Get the number of registered cleanup routines

    @param {Object} instance - Request instance object reference

    @return {Integer} - Number of cleanup functions in queue
    *********************************************************************/
    getCleanupQueueCount: function (instance) {

      // Return the number of registered cleanup routines
      return instance['cleanup_queue'].length;

    },


    /********************************************************************
    Get instance age in milliseconds (time since initialization)

    @param {Object} instance - Request instance object reference

    @return {Integer} - Milliseconds since instance was initialized
    *********************************************************************/
    getAge: function (instance) {

      // Calculate elapsed milliseconds since instance initialization
      return Lib.Utils.getUnixTimeInMilliSeconds() - instance['time_ms'];

    }

  };///////////////////////////Public Functions END//////////////////////////////



  //////////////////////////Private Functions START/////////////////////////////
  const _Instance = {

    /********************************************************************
    Callback executed when a background routine completes.
    Decrements the background counter and triggers cleanup if all routines are done.

    @param {Object} instance - Request instance object reference

    @return {void}
    *********************************************************************/
    backgroundRoutineComplete: function (instance) {

      // Decrement counter
      instance['background_queue']--;

      // Run cleanup if all background routines are done
      Instance.cleanup(instance);

    }

  };//////////////////////////Private Functions END/////////////////////////////



  // Return public interface
  return Instance;

};/////////////////////////// createInterface END ///////////////////////////////
