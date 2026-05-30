// Info: All validators for js-helper-utils. Currently empty — Utils has no
// config and no domain-specific assertions. Placeholder for future validators.
//
// Singleton: No Lib dependency — Utils IS the foundation module.
'use strict';


/////////////////////////// Module-Loader START ////////////////////////////////

/********************************************************************
Singleton loader. Returns the module-scope Validators object.
Utils validators need no Lib injection — Utils is the foundation.

@param {Object} shared_libs - Lib container (unused — interface uniformity)

@return {Object} - Public Validators interface
*********************************************************************/
module.exports = function loader (shared_libs) { // eslint-disable-line no-unused-vars

  // Return the Validators interface
  return Validators;

};///////////////////////////// Module-Loader END ///////////////////////////////



////////////////////////////// Public Functions START ////////////////////////////

const Validators = {

  // No validators yet — Utils has no config to validate and no
  // domain-specific assertions. Add validators here as the module grows.

};////////////////////////////// Public Functions END ////////////////////////////
