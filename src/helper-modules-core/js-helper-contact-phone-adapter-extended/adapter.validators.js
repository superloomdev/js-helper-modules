// Info: All validators for helper-contact-phone-adapter-extended.
// Single role: config validation at construction time. Throw Error.


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


  /********************************************************************
  Validate the merged CONFIG. The extended adapter has no required config,
  so this is a no-op pass-through. Kept for structural conformance.

  @param {Object} CONFIG - Merged adapter configuration

  @return {void}
  *********************************************************************/
  validateConfig: function (CONFIG) { // eslint-disable-line no-unused-vars

    // No required config for the extended adapter
    return;

  }


};////////////////////////////// Public Functions END //////////////////////////
