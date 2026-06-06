// Info: Config, options, and store contract validators for js-server-helper-distinct-queue.
// Called once at construction time from the loader: validateConfig (CONFIG shape)
// and validateStoreContract (instantiated store method checks). Called per-call
// from public methods: validateEnqueueOptions, validateClaimOptions,
// validateListByPrefixOptions.
// Throws on the first violation so misconfiguration and programmer errors
// surface immediately.
//
// Singleton: Lib is injected once by the loader. Node.js require
// cache guarantees the same reference on every subsequent require.
'use strict';


// Shared dependency injected by loader
let Lib;


/////////////////////////// Module-Loader START ////////////////////////////////

/********************************************************************
Singleton loader. Injects Lib and returns the module-scope
Validators object.

@param {Object} shared_libs - Dependency container (Utils)

@return {Object} - Public Validators interface
*********************************************************************/
module.exports = function loader (shared_libs) {

  // Inject shared dependency
  Lib = shared_libs;

  return Validators;

};///////////////////////////// Module-Loader END ///////////////////////////////



////////////////////////////// Public Functions START //////////////////////////////
const Validators = {


  // ~~~~~~~~~~~~~~~~~~~~ Config Validators ~~~~~~~~~~~~~~~~~~~~
  // Called once at construction time from the distinct-queue.js loader.

  /********************************************************************
  Validate the merged CONFIG object passed to the distinct-queue loader.
  Only STORE is validated here — adapter-specific config is validated
  inside the adapter's own configure() call.
  Throws on the first violation so misconfiguration surfaces
  immediately at boot time.

  @param {Object} config - Merged configuration object

  @return {void}
  *********************************************************************/
  validateConfig: function (config) {

    // STORE must be the pre-configured store factory function
    if (
      Lib.Utils.isNullOrUndefined(config.STORE) ||
      !Lib.Utils.isFunction(config.STORE)
    ) {
      throw new Error('[helper-distinct-queue] CONFIG.STORE is required and must be a store factory function');
    }

  },


  // ~~~~~~~~~~~~~~~~~~~~ Options Validators ~~~~~~~~~~~~~~~~~~~~
  // Called per-call from _DistinctQueue private methods. Throw TypeError
  // on programmer errors (bad args), not Error.

  /********************************************************************
  Shape check for enqueue() options.
  Throws TypeError on any violation - these are programmer errors.

  @param {Object} options - Caller-provided options object

  @return {void}
  *********************************************************************/
  validateEnqueueOptions: function (options) {

    // Programmer error: options object itself must be present
    if (Lib.Utils.isNullOrUndefined(options)) {
      throw new TypeError('[helper-distinct-queue] options object is required');
    }

    // tenant_id is required, non-empty string
    if (Lib.Utils.isEmpty(options.tenant_id)) {
      throw new TypeError('[helper-distinct-queue] options.tenant_id is required');
    }

    // resource_id is required, non-empty string
    if (Lib.Utils.isEmpty(options.resource_id)) {
      throw new TypeError('[helper-distinct-queue] options.resource_id is required');
    }

    // payload is required and must be an object
    if (Lib.Utils.isNullOrUndefined(options.payload) || !Lib.Utils.isObject(options.payload)) {
      throw new TypeError('[helper-distinct-queue] options.payload is required (plain object)');
    }

    // action is required, non-empty string
    if (Lib.Utils.isEmpty(options.action)) {
      throw new TypeError('[helper-distinct-queue] options.action is required');
    }

  },


  /********************************************************************
  Shape check for claim() options.
  Throws TypeError on any violation - these are programmer errors.

  @param {Object} options - Caller-provided options object

  @return {void}
  *********************************************************************/
  validateClaimOptions: function (options) {

    // Programmer error: options object itself must be present
    if (Lib.Utils.isNullOrUndefined(options)) {
      throw new TypeError('[helper-distinct-queue] options object is required');
    }

    // tenant_id is required, non-empty string
    if (Lib.Utils.isEmpty(options.tenant_id)) {
      throw new TypeError('[helper-distinct-queue] options.tenant_id is required');
    }

    // resource_id is required, non-empty string
    if (Lib.Utils.isEmpty(options.resource_id)) {
      throw new TypeError('[helper-distinct-queue] options.resource_id is required');
    }

  },


  /********************************************************************
  Shape check for listByPrefix() options.
  Throws TypeError on any violation - these are programmer errors.

  @param {Object} options - Caller-provided options object

  @return {void}
  *********************************************************************/
  validateListByPrefixOptions: function (options) {

    // Programmer error: options object itself must be present
    if (Lib.Utils.isNullOrUndefined(options)) {
      throw new TypeError('[helper-distinct-queue] options object is required');
    }

    // tenant_id is required, non-empty string
    if (Lib.Utils.isEmpty(options.tenant_id)) {
      throw new TypeError('[helper-distinct-queue] options.tenant_id is required');
    }

    // resource_id_prefix is required, non-empty string
    if (Lib.Utils.isEmpty(options.resource_id_prefix)) {
      throw new TypeError('[helper-distinct-queue] options.resource_id_prefix is required');
    }

  },


  // ~~~~~~~~~~~~~~~~~~~~ Store Contract Validators ~~~~~~~~~~~~~~~~~~~~
  // Validate that an instantiated store exposes the required method
  // contract. Called once at construction from the loader.

  /********************************************************************
  Validate that an instantiated store exposes the required method
  contract. Throws at startup when any method is missing so runtime
  requests never hit a partially-implemented store.

    @param {Object} store - Instantiated store object

    @return {void}
  *********************************************************************/
  validateStoreContract: function (store) {

    const required = [
      'writeRecord',
      'queryByResourceId',
      'deleteByDataVersionLte',
      'queryByResourceIdPrefix'
    ];

    required.forEach(function (name) {

      if (Lib.Utils.isNullOrUndefined(store[name]) || !Lib.Utils.isFunction(store[name])) {
        throw new Error(
          '[helper-distinct-queue] Invalid store contract: missing method `' + name + '`'
        );
      }

    });

  }

};////////////////////////////// Public Functions END //////////////////////////////
