// Info: Validators for helper-contact-phone-adapter-basic.
// The basic adapter needs no config validation - the country data is
// generated and committed. This file exists per the Universal Companion
// Files rule and returns a no-op validateConfig.
'use strict';


// Shared dependencies injected by loader
let Lib; // eslint-disable-line no-unused-vars
let ERRORS; // eslint-disable-line no-unused-vars


/////////////////////////// Module-Loader START ////////////////////////////////

/********************************************************************
Singleton loader. Injects Lib and ERRORS, then returns the module-scope
Validators object.

@param {Object} shared_libs - Dependency container (Utils)
@param {Object} errors - Frozen error catalog (adapter.errors.js)

@return {Object} - Public Validators interface
*********************************************************************/
module.exports = function loader (shared_libs, errors) {

  // Inject shared dependencies
  Lib = shared_libs;
  ERRORS = errors;

  // Return the Validators interface
  return Validators;

};///////////////////////////// Module-Loader END ///////////////////////////////



////////////////////////////// Public Functions START ////////////////////////
const Validators = {


  /********************************************************************
  Validate the merged CONFIG. The basic adapter has no config keys,
  so this is a no-op. Exists per the Universal Companion Files rule.

    @param {Object} CONFIG - Merged adapter configuration

    @return {void}
  *********************************************************************/
  validateConfig: function (CONFIG) { // eslint-disable-line no-unused-vars

    // No config to validate - country data is generated and committed

  }


};////////////////////////////// Public Functions END ////////////////////////
