// Info: All validators for helper-contact-email. Three roles:
//   1. Config validators - called once at loader time. Throw Error.
//   2. Adapter contract validators - called once after adapter is received.
//   3. Programmer-error assertions - called per request. Throw TypeError.
//
// Singleton: Lib and ERRORS injected once by loader.
'use strict';


// Shared dependencies injected by loader
let Lib;
let ERRORS; // eslint-disable-line no-unused-vars


/////////////////////////// Module-Loader START ////////////////////////////////

/********************************************************************
Singleton loader. Injects Lib and ERRORS, then returns the module-scope
Validators object.

@param {Object} shared_libs - Dependency container (Utils)
@param {Object} errors - Frozen error catalog (email.errors.js)

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
  Validate the merged CONFIG. Throws on any missing-required violation.

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
        '[helper-contact-email] CONFIG.Adapter must be a ready-to-use adapter object. ' +
        'Create it first: const Adapter = require("helper-contact-email-adapter-basic")(Lib, {})'
      );
    }

  },


  /********************************************************************
  Validate that an instantiated adapter exposes the required method
  contract. Throws at startup when any method is missing.

  The email adapter contract (3 methods):
    validateSyntax(email) -> { valid, reason }
    isDisposableDomain(domain) -> Boolean
    canonicalize(email) -> String | null

    @param {Object} adapter - Instantiated adapter object

    @return {void}
  *********************************************************************/
  validateAdapterContract: function (adapter) {

    // List the required adapter methods
    const required = [
      'validateSyntax',
      'isDisposableDomain',
      'canonicalize'
    ];

    // Check each method is present and callable
    required.forEach(function (name) {

      // Reject if method is missing or not a function
      if (Lib.Utils.isNullOrUndefined(adapter[name]) || !Lib.Utils.isFunction(adapter[name])) {
        throw new Error(
          '[helper-contact-email] Invalid adapter contract: missing method `' + name + '`'
        );
      }

    });

  },


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
        '[helper-contact-email] ' + name + ' must be a string'
      );
    }

  }


};////////////////////////////// Public Functions END //////////////////////////
