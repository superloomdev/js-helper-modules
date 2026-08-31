// Info: Test loader for helper-storage-local-fs
// Mirrors the main project loader pattern: loads dependencies from environment
// process.env is ONLY read here - nowhere else in test code
import utilsLoader from 'helper-utils';
import debugLoader from 'helper-debug';
import localFsLoader from 'helper-storage-local-fs';
import nodeOs from 'node:os';
import nodePath from 'node:path';


/********************************************************************
Load all test dependencies, build Lib container

@return {Object} result - Runtime objects for testing
@return {Object} result.Lib - Dependency container
*********************************************************************/
export default function loader () {

  // ========================= CONFIGURATION ========================= //

  const config_debug = {
    LOG_LEVEL: 'error'
  };

  // Use a temp directory for test storage
  const test_root = nodePath.join(nodeOs.tmpdir(), 'local-fs-test-' + process.pid);


  // ==================== DEPENDENCY CONTAINER ======================= //

  const Lib = {};


  // ==================== HELPER MODULES ============================= //

  Lib.Utils = utilsLoader(Lib, {});
  Lib.Debug = debugLoader(Lib, config_debug);


  // ==================== SERVER HELPER MODULES ====================== //

  Lib.LocalFs = localFsLoader(Lib, {
    ROOT_DIRECTORY: test_root
  });


  // Expose test root for cleanup
  Lib._testRoot = test_root;


  // Return runtime objects
  return { Lib };

}
