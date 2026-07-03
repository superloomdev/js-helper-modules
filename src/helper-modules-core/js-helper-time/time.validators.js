// Info: All validators for helper-time. Currently empty - Time has no
// domain-specific assertions. The validateConfig no-op is wired so that
// adding the first config key requires only filling in this file.
//
// Singleton: No Lib dependency - Time is a foundation module.
'use strict';


/////////////////////////// Module-Loader START ////////////////////////////////

/********************************************************************
Singleton loader. Returns the module-scope Validators object.
Time validators need no Lib injection - Time is a foundation module.

@param {Object} shared_libs - Lib container (unused - interface uniformity)
@param {Object} errors - Error catalog (unused - no domain errors yet)

@return {Object} - Public Validators interface
*********************************************************************/
module.exports = function loader (shared_libs, errors) { // eslint-disable-line no-unused-vars

  // Return the Validators interface
  return Validators;

};///////////////////////////// Module-Loader END ///////////////////////////////



///////////////////////////Public Functions START//////////////////////////////

const Validators = {


  // No-op config validator. Time has no config keys to validate.
  // Replace with real checks when the first config key is added.
  validateConfig: function (config) { // eslint-disable-line no-unused-vars

    // No config keys to validate yet

  }


};////////////////////////////// Public Functions END ////////////////////////////
