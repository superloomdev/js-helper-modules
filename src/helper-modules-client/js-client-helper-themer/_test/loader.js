// Info: Test loader for js-client-helper-themer
// Mirrors the main project loader pattern: loads dependencies from environment
// process.env is ONLY read here - nowhere else in test code
'use strict';


/********************************************************************
Load all test dependencies and build the Lib container from environment.

process.env is ONLY read here - never in test files.

@return {Object} result - Runtime objects for testing
@return {Object} result.Lib - Dependency container (Utils, Debug)
@return {Object} result.Config - Test-wide environment values
*********************************************************************/
module.exports = function loader () {

  // ========================= CONFIGURATION ========================= //

  const Config = {};


  // ==================== DEPENDENCY CONTAINER ======================= //

  const Lib = {};


  // ==================== HELPER MODULES ============================= //

  // Utils - peer dependency for type checking and validation
  Lib.Utils = require('helper-utils')(Lib, {});

  // Debug - peer dependency for logging during tests
  Lib.Debug = require('helper-debug')(Lib, {});


  // Return runtime objects
  return { Lib, Config };

};
