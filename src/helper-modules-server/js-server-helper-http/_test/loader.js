// Info: Test loader for js-server-helper-http
// Mirrors the main project loader pattern: loads dependencies from environment
// process.env is ONLY read here - nowhere else in test code
import utilsLoader from 'helper-utils';
import debugLoader from 'helper-debug';
import httpLoader from 'helper-http';


/********************************************************************
Load all test dependencies, build Lib container

@return {Object} result - Runtime objects for testing
@return {Object} result.Lib - Dependency container (Utils, Debug, Http)
*********************************************************************/
export default function loader () {

  // ========================= CONFIGURATION ========================= //

  const config_debug = {
    LOG_LEVEL: 'error'
  };


  // ==================== DEPENDENCY CONTAINER ======================= //

  const Lib = {};


  // ==================== HELPER MODULES ============================= //

  Lib.Utils = utilsLoader(Lib, {});
  Lib.Debug = debugLoader(Lib, config_debug);


  // ==================== SERVER HELPER MODULES ====================== //

  Lib.Http = httpLoader(Lib, {});


  // Return runtime objects
  return { Lib };

};
