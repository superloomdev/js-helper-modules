// Info: All validators for helper-email. Config validation and adapter
// contract validation at loader time. Programmer errors (bad arguments)
// throw TypeError at call sites, not in validators.
//
// Singleton: Lib injected for Utils type-check primitives.


/////////////////////////// Module-Loader START ////////////////////////////////

/********************************************************************
Singleton loader. Returns the module-scope Validators object.
Email validators need Lib injection for Utils type checks.

@param {Object} Lib - Dependency container (Utils)
@param {Object} errors - Error catalog

@return {Object} - Public Validators interface
*********************************************************************/
export default function loader (Lib, errors) {

  // Return the Validators interface
  return Validators(Lib, errors);

};///////////////////////////// Module-Loader END ///////////////////////////////



///////////////////////////Public Functions START//////////////////////////////

function Validators (Lib, errors) { // eslint-disable-line no-unused-vars

  return {

    /********************************************************************
    Validate the module config at loader time. Programmer errors throw
    TypeError synchronously.

    @param {Object} config - Merged configuration object
    *********************************************************************/
    validateConfig: function (config) {

      // Adapter must be provided (null is the default, caller must override)
      if (Lib.Utils.isNullOrUndefined(config.Adapter)) {
        throw new TypeError('[helper-email] Adapter is required in config');
      }

      // DEFAULT_MESSAGE_TYPE must be 'transactional' or 'promotional' if set
      if (!Lib.Utils.isNullOrUndefined(config.DEFAULT_MESSAGE_TYPE)) {
        if (config.DEFAULT_MESSAGE_TYPE !== 'transactional' && config.DEFAULT_MESSAGE_TYPE !== 'promotional') {
          throw new TypeError('[helper-email] DEFAULT_MESSAGE_TYPE must be "transactional" or "promotional"');
        }
      }

    },


    /********************************************************************
    Validate that the adapter implements the required contract methods.
    Programmer errors throw TypeError synchronously.

    @param {Object} adapter - Ready-to-use adapter object
    *********************************************************************/
    validateAdapterContract: function (adapter) {

      // Adapter must be an object
      if (!Lib.Utils.isObject(adapter)) {
        throw new TypeError('[helper-email] Adapter must be an object');
      }

      // Adapter must implement send(instance, message)
      if (!Lib.Utils.isFunction(adapter.send)) {
        throw new TypeError('[helper-email] Adapter must implement send(instance, message)');
      }

    }

  };

}////////////////////////////// Public Functions END ////////////////////////////
