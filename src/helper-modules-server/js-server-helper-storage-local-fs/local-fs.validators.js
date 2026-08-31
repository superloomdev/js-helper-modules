// Info: All validators for helper-storage-local-fs. Config validation at
// loader time. Programmer errors (bad arguments) throw TypeError at call
// sites, not in validators.
//
// Singleton: Lib injected for Utils type-check primitives.


/////////////////////////// Module-Loader START ////////////////////////////////

/********************************************************************
Singleton loader. Returns the module-scope Validators object.
LocalFs validators need Lib injection for Utils type checks.

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

      // ROOT_DIRECTORY must be a non-empty string
      if (!Lib.Utils.isString(config.ROOT_DIRECTORY) || Lib.Utils.isEmptyString(config.ROOT_DIRECTORY)) {
        throw new TypeError('[helper-storage-local-fs] ROOT_DIRECTORY must be a non-empty string');
      }

    }

  };

}////////////////////////////// Public Functions END ////////////////////////////
