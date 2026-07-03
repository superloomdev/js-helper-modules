// Info: All validators for helper-crypto. Currently empty - Crypto has no
// domain-specific assertions. The validateConfig no-op is wired so that
// adding the first config key requires only filling in this file.
//
// Singleton: No Lib dependency - Crypto is a stateless wrapper.
'use strict';


/////////////////////////// Module-Loader START ////////////////////////////////

/********************************************************************
Singleton loader. Returns the module-scope Validators object.
Crypto validators need no Lib injection - Crypto is a stateless wrapper.

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


  // No-op config validator. Crypto has one config key (BASE36_CHARSET)
  // but no domain-specific validation rules yet. Add checks here when
  // constraints are needed (e.g. length, uniqueness, ordering).
  validateConfig: function (config) { // eslint-disable-line no-unused-vars

    // No validation rules to enforce yet

  }


};////////////////////////////// Public Functions END ////////////////////////////
