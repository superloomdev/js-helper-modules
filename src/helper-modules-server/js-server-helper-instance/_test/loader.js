// Info: Test loader for helper-instance
// Mirrors the main project loader pattern: loads dependencies from environment
// process.env is ONLY read here - nowhere else in test code
import utilsLoader from 'helper-utils';
import debugLoader from 'helper-debug';
import instanceLoader from 'helper-instance';


/********************************************************************
Load all test dependencies, build Lib container

Returns a default Lib configured as a persistent deployment
(CLOSE_ON_CLEANUP false), plus a builder so a test can construct an
Instance configured as a serverless deployment (CLOSE_ON_CLEANUP true).
Each builder call returns an independent module with its own process
cleanup queue, so tests cannot leak state into one another.

@return {Object} result - Runtime objects for testing
@return {Object} result.Lib - Dependency container (Utils, Debug, Instance)
@return {Function} result.buildInstance - (config) => Instance interface
*********************************************************************/
export default function loader () {

  // ========================= CONFIGURATION ========================= //

  // Sub-configs: each helper module receives ONLY its relevant config slice
  const config_debug = {
    LOG_LEVEL: 'error'
  };


  // ==================== DEPENDENCY CONTAINER ======================= //

  const Lib = {};


  // ==================== HELPER MODULES ============================= //

  Lib.Utils = utilsLoader(Lib, {});
  Lib.Debug = debugLoader(Lib, config_debug);


  // ==================== SERVER HELPER MODULES ====================== //

  // Default: persistent deployment. Process-scoped teardown waits for
  // an explicit runProcessCleanup() call.
  Lib.Instance = instanceLoader(Lib, { CLOSE_ON_CLEANUP: false });


  // ==================== TEST BUILDERS ============================== //

  // Build an independent Instance module with its own process cleanup
  // queue, so a test can exercise either deployment shape in isolation
  const buildInstance = function (config) {
    return instanceLoader(Lib, config);
  };


  // Return runtime objects
  return { Lib, buildInstance };

};
