// Info: Test loader for js-client-helper-styler
// Mirrors the main project loader pattern: loads dependencies from environment
// process.env is ONLY read here — nowhere else in test code
'use strict';


/********************************************************************
Load all test dependencies and build the Lib container from environment.

process.env is ONLY read here — never in test files.

@return {Object} result - Runtime objects for testing
@return {Object} result.Lib - Dependency container (Styler, Utils, Debug)
@return {Object} result.Config - Test-wide environment values
*********************************************************************/
module.exports = function loader () {

  // ========================= CONFIGURATION ========================= //

  const Config = {};


  // ==================== DEPENDENCY CONTAINER ======================= //

  const Lib = {};


  // ==================== HELPER MODULES ============================= //

  // Utils — peer dependency for type checking and validation
  Lib.Utils = require('helper-utils')(Lib, {});

  // Debug — peer dependency for logging during tests
  Lib.Debug = require('helper-debug')(Lib, {});


  // ==================== STYLER MODULE =============================== //

  // Styler — the module under test, loaded through npm alias
  Lib.Styler = require('helper-styler')(Lib);


  // Return runtime objects
  return { Lib, Config };

};
