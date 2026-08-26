// Info: Test loader for helper-cache
// Mirrors the main project loader pattern. The cache module under test is
// NOT loaded here - tests construct it per-case with their own STORE adapter
// so each test owns isolated state.
import utilsLoader from 'helper-utils';
import debugLoader from 'helper-debug';
import instanceLoader from 'helper-instance';


/********************************************************************
Load all peer dependencies and build the Lib container. The cache
module itself is constructed inside test.js with a per-test in-memory
adapter so tests stay independent.

@return {Object} result - Runtime objects for testing
@return {Object} result.Lib - Dependency container (Utils, Debug, Instance)
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

  Lib.Instance = instanceLoader(Lib, {});


  // Return runtime objects
  return { Lib };

};
