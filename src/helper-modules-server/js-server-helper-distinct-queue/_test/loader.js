// Info: Test loader for js-server-helper-distinct-queue
// Mirrors the main project loader pattern. The distinct-queue module under
// test is NOT loaded here - tests construct it per-case with their own STORE
// adapter so each test owns isolated state.

import Utils from 'helper-utils';
import Debug from 'helper-debug';
import Crypto from 'helper-crypto';
import Instance from 'helper-instance';


/********************************************************************
Load all peer dependencies and build the Lib container. The distinct-
queue module itself is constructed inside test.js with a per-test
in-memory adapter so tests stay independent.

@return {Object} result - Runtime objects for testing
@return {Object} result.Lib - Dependency container (Utils, Debug, Crypto, Instance)
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

  Lib.Utils = Utils(Lib, {});
  Lib.Debug = Debug(Lib, config_debug);
  Lib.Crypto = Crypto(Lib, {});


  // ==================== SERVER HELPER MODULES ====================== //

  Lib.Instance = Instance(Lib, {});


  // Return runtime objects
  return { Lib };

};
