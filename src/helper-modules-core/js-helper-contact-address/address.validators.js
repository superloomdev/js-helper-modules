// Info: All validators for helper-contact-address.


let Lib;
let ERRORS; // eslint-disable-line no-unused-vars


/////////////////////////// Module-Loader START ////////////////////////////////
export default function loader (shared_libs, errors) {

  // Inject shared dependencies
  Lib = shared_libs;
  ERRORS = errors;

  // Return the Validators interface
  return Validators;

};///////////////////////////// Module-Loader END ///////////////////////////////



////////////////////////////// Public Functions START ////////////////////////
const Validators = {


  validateConfig: function (CONFIG) {

    // Reject if Adapter is missing or not an object
    if (
      Lib.Utils.isNullOrUndefined(CONFIG.Adapter) ||
      !Lib.Utils.isObject(CONFIG.Adapter)
    ) {
      throw new Error(
        '[helper-contact-address] CONFIG.Adapter must be a ready-to-use adapter object. ' +
        'Create it first: import contactAddressAdapterBasic from "helper-contact-address-adapter-basic"; const Adapter = contactAddressAdapterBasic(Lib, {})'
      );
    }

  },


  validateAdapterContract: function (adapter) {

    // List the required adapter methods
    const required = [
      'listCountries',
      'getPostalRule',
      'listSubdivisions',
      'validatePostalCode',
      'validateSubdivision'
    ];

    // Check each method is present and callable
    required.forEach(function (name) {

      // Reject if method is missing or not a function
      if (Lib.Utils.isNullOrUndefined(adapter[name]) || !Lib.Utils.isFunction(adapter[name])) {
        throw new Error(
          '[helper-contact-address] Invalid adapter contract: missing method `' + name + '`'
        );
      }

    });

  },


  assertString: function (name, value) {

    // Reject if value is not a string
    if (!Lib.Utils.isString(value)) {
      throw new TypeError(
        '[helper-contact-address] ' + name + ' must be a string'
      );
    }

  }


};////////////////////////////// Public Functions END //////////////////////////
