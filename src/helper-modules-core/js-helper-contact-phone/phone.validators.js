// Info: All validators for helper-contact-phone. Three roles:
//   1. Config validators - called once at loader time. Throw Error.
//   2. Adapter contract validators - called once after adapter is received.
//      Throw Error on missing contract methods.
//   3. Programmer-error assertions - called per request. Throw TypeError.
//
// Singleton: Lib and ERRORS injected once by loader.


// Shared dependencies injected by loader
let Lib;
let ERRORS; // eslint-disable-line no-unused-vars


/////////////////////////// Module-Loader START ////////////////////////////////

/********************************************************************
Singleton loader. Injects Lib and ERRORS, then returns the module-scope
Validators object. Takes Lib and ERRORS - no CONFIG - because validators
run before CONFIG is validated.

@param {Object} shared_libs - Dependency container (Utils)
@param {Object} errors - Frozen error catalog (phone.errors.js)

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
  // Called once at construction time from the phone.js loader.
  // Take CONFIG as a parameter (not closed over) so they remain
  // testable in isolation. Throw Error (not TypeError) - misconfiguration
  // is a setup error, not a programmer call error.

  /********************************************************************
  Validate the merged CONFIG. Throws on any missing-required violation
  so the loader fails before serving a single request.

  @param {Object} CONFIG - Merged module configuration

  @return {void}
  *********************************************************************/
  validateConfig: function (CONFIG) {

    // Reject if Adapter is missing or not an object
    if (
      Lib.Utils.isNullOrUndefined(CONFIG.Adapter) ||
      !Lib.Utils.isObject(CONFIG.Adapter)
    ) {
      throw new Error(
        '[helper-contact-phone] CONFIG.Adapter must be a ready-to-use adapter object. ' +
        'Create it first: const Adapter = require("helper-contact-phone-adapter-basic")(Lib, {})'
      );
    }

  },


  // ~~~~~~~~~~~~~~~~~~~~ Adapter Contract Validators ~~~~~~~~~~~~~~~~~~~~
  // Called once at construction time from the phone.js loader,
  // after the adapter has been received. Validates the adapter object
  // exposes the 4-method contract. Throw Error - a missing adapter
  // method is a setup error.

  /********************************************************************
  Validate that an instantiated adapter exposes the required method
  contract. Throws at startup when any method is missing so runtime
  calls never hit a partially-implemented adapter.

  The phone adapter contract (4 methods):
  listCountries() -> [String]
  getMetadata(country_code) -> { calling_code, min_length, max_length } | null
  validateSyntax(country_code, national_number) -> { valid, reason }
  getNumberType(country_code, national_number) -> String | null

  @param {Object} adapter - Instantiated adapter object

  @return {void}
  *********************************************************************/
  validateAdapterContract: function (adapter) {

    // List the required adapter methods
    const required = [
      'listCountries',
      'getMetadata',
      'validateSyntax',
      'getNumberType'
    ];

    // Check each method is present and callable
    required.forEach(function (name) {

      // Reject if method is missing or not a function
      if (Lib.Utils.isNullOrUndefined(adapter[name]) || !Lib.Utils.isFunction(adapter[name])) {
        throw new Error(
          '[helper-contact-phone] Invalid adapter contract: missing method `' + name + '`'
        );
      }

    });

  },


  // ~~~~~~~~~~~~~~~~~~~~ Programmer-Error Assertions ~~~~~~~~~~~~~~~~~~~~
  // Called per request from public functions. Throw TypeError on bad
  // argument types - these are programmer errors, not validation failures.

  /********************************************************************
  Assert that a value is a string. Throws TypeError if not.

  @param {String} name - Argument name for the error message
  @param {*} value - The value to check

  @return {void}
  *********************************************************************/
  assertString: function (name, value) {

    // Reject if value is not a string
    if (!Lib.Utils.isString(value)) {
      throw new TypeError(
        '[helper-contact-phone] ' + name + ' must be a string'
      );
    }

  },


  /********************************************************************
  Assert that a value is a non-empty string. Throws TypeError if not.

  @param {String} name - Argument name for the error message
  @param {*} value - The value to check

  @return {void}
  *********************************************************************/
  assertNonEmptyString: function (name, value) {

    // Reject if value is not a string or is empty
    if (!Lib.Utils.isString(value) || Lib.Utils.isEmptyString(value)) {
      throw new TypeError(
        '[helper-contact-phone] ' + name + ' must be a non-empty string'
      );
    }

  }


};////////////////////////////// Public Functions END //////////////////////////
