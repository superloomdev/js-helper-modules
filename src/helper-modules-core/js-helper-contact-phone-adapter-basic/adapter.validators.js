// Info: All validators for helper-contact-phone-adapter-basic.
// Single role: config validation at construction time. Throw Error.
//
// Singleton: Lib and ERRORS injected once by loader.


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
export default function loader (shared_libs, errors) {

  // Inject shared dependencies
  Lib = shared_libs;
  ERRORS = errors;

  // Return the Validators interface
  return Validators;

};///////////////////////////// Module-Loader END ///////////////////////////////



////////////////////////////// Public Functions START ////////////////////////
const Validators = {


  // ~~~~~~~~~~~~~~~~~~~~ Config Validators ~~~~~~~~~~~~~~~~~~~~
  // Called once at construction time from the adapter.js loader.
  // Throw Error (not TypeError) - misconfiguration is a setup error.

  /********************************************************************
  Validate the merged CONFIG. The basic adapter has no required config,
  so this is a no-op pass-through. Kept for structural conformance.

  @param {Object} CONFIG - Merged adapter configuration

  @return {void}
  *********************************************************************/
  validateConfig: function (CONFIG) { // eslint-disable-line no-unused-vars

    // No required config for the basic adapter
    return;

  }


};////////////////////////////// Public Functions END //////////////////////////
