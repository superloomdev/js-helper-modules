// Info: All validators for helper-contact-address.
'use strict';


let Lib;
let ERRORS; // eslint-disable-line no-unused-vars


/////////////////////////// Module-Loader START ////////////////////////////////
module.exports = function loader (shared_libs, errors) {

  Lib = shared_libs;
  ERRORS = errors;

  return Validators;

};///////////////////////////// Module-Loader END ///////////////////////////////



////////////////////////////// Public Functions START ////////////////////////
const Validators = {


  validateConfig: function (CONFIG) {

    if (
      Lib.Utils.isNullOrUndefined(CONFIG.Adapter) ||
      !Lib.Utils.isObject(CONFIG.Adapter)
    ) {
      throw new Error(
        '[helper-contact-address] CONFIG.Adapter must be a ready-to-use adapter object. ' +
        'Create it first: const Adapter = require("helper-contact-address-adapter-basic")(Lib, {})'
      );
    }

  },


  validateAdapterContract: function (adapter) {

    const required = [
      'listCountries',
      'getPostalRule',
      'listSubdivisions',
      'validatePostalCode',
      'validateSubdivision'
    ];

    required.forEach(function (name) {

      if (Lib.Utils.isNullOrUndefined(adapter[name]) || !Lib.Utils.isFunction(adapter[name])) {
        throw new Error(
          '[helper-contact-address] Invalid adapter contract: missing method `' + name + '`'
        );
      }

    });

  },


  assertString: function (name, value) {

    if (!Lib.Utils.isString(value)) {
      throw new TypeError(
        '[helper-contact-address] ' + name + ' must be a string'
      );
    }

  }


};////////////////////////////// Public Functions END //////////////////////////
