// Info: All validators for js-server-helper-http-gateway.
// Two concerns in one place:
//   1. Config validators        - called once at construction time, take CONFIG
//      as a parameter, throw Error on misconfiguration.
//   2. Adapter contract validators - called once after adapter instantiation,
//      take the adapter object as a parameter, throw Error on missing methods.
'use strict';


// Shared dependency injected by loader
let Lib;


/////////////////////////// Module-Loader START ////////////////////////////////

/********************************************************************
Singleton loader. Injects Lib and returns the module-scope Validators
object. Takes only Lib - no CONFIG or ERRORS - because validators run
before CONFIG is validated.

@param {Object} shared_libs - Dependency container (Utils)

@return {Object} - Public Validators interface
*********************************************************************/
module.exports = function loader (shared_libs) {

  Lib = shared_libs;

  return Validators;

};///////////////////////////// Module-Loader END ///////////////////////////////



////////////////////////////// Public Functions START ////////////////////////
const Validators = {


  // ~~~~~~~~~~~~~~~~~~~~ Config Validators ~~~~~~~~~~~~~~~~~~~~
  // Called once at construction time from the http-gateway.js loader.
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

    if (
      Lib.Utils.isNullOrUndefined(CONFIG.ADAPTER) ||
      typeof CONFIG.ADAPTER !== 'function'
    ) {
      throw new Error(
        '[js-server-helper-http-gateway] CONFIG.ADAPTER must be an adapter factory function ' +
        '(e.g. require("js-server-helper-http-gateway-adapter-aws-apigateway"))'
      );
    }

  },


  // ~~~~~~~~~~~~~~~~~~~~ Adapter Contract Validators ~~~~~~~~~~~~~~~~~~~~
  // Called once at construction time from the http-gateway.js loader,
  // after the adapter has been instantiated. Validates the returned
  // adapter object exposes the 3-method contract. Throw Error - a missing
  // adapter method is a setup error.

  /********************************************************************
  Validate that an instantiated adapter exposes the required method
  contract. Throws at startup when any method is missing so runtime
  requests never hit a partially-implemented adapter.

  @param {Object} adapter - Instantiated adapter object

  @return {void}
  *********************************************************************/
  validateAdapterContract: function (adapter) {

    const required = [
      'extractRequest',
      'buildResponseEnvelope',
      'getCountryCode'
    ];

    required.forEach(function (name) {

      if (Lib.Utils.isNullOrUndefined(adapter[name]) || !Lib.Utils.isFunction(adapter[name])) {
        throw new Error(
          '[js-server-helper-http-gateway] Invalid adapter contract: missing method `' + name + '`'
        );
      }

    });

  }

};
/////////////////////////////Public Functions END /////////////////////////////
