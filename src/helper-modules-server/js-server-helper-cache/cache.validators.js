// Info: Config and store contract validators for helper-cache.
// Called once at construction time from the loader: validateConfig (CONFIG
// shape) and validateStoreContract (instantiated store method checks).
// Called per-call from the public methods: validateIdentifiers and
// validateTtl. Throws on the first violation so misconfiguration and
// programmer errors surface immediately.
//
// Singleton: Lib is injected once by the loader. Node.js require
// cache guarantees the same reference on every subsequent require.
'use strict';


// Shared dependency injected by loader
let Lib;


/////////////////////////// Module-Loader START ////////////////////////////////

/********************************************************************
Singleton loader. Injects Lib and ERRORS, returns the module-namespace
Validators object.

@param {Object} shared_libs - Dependency container (Utils)
@param {Object} ERRORS    - Frozen error catalog for this module

@return {Object} - Public Validators interface
*********************************************************************/
module.exports = function loader (shared_libs, ERRORS) { // eslint-disable-line no-unused-vars

  // Inject shared dependencies
  Lib = shared_libs;

  return Validators;

};///////////////////////////// Module-Loader END ///////////////////////////////



////////////////////////////// Public Functions START ////////////////////////
const Validators = {


  /********************************************************************
  Validate the merged CONFIG object passed to the cache loader.
  Throws on the first violation so misconfiguration surfaces
  immediately at boot time.

  @param {Object} config - Merged configuration object

  @return {void}
  *********************************************************************/
  validateConfig: function (config) {

    // Store must be the ready-to-use store object
    if (
      Lib.Utils.isNullOrUndefined(config.Store) ||
      !Lib.Utils.isObject(config.Store)
    ) {
      throw new Error('[helper-cache] CONFIG.Store is required and must be a ready-to-use store object');
    }

    // GET_OR_FETCH_LOCK_ENABLED must be a Boolean
    if (!Lib.Utils.isBoolean(config.GET_OR_FETCH_LOCK_ENABLED)) {
      throw new TypeError('[helper-cache] GET_OR_FETCH_LOCK_ENABLED must be a Boolean');
    }

    // GET_OR_FETCH_LOCK_TIMEOUT_MS must be a positive Number
    if (!Lib.Utils.isNumber(config.GET_OR_FETCH_LOCK_TIMEOUT_MS) || config.GET_OR_FETCH_LOCK_TIMEOUT_MS <= 0) {
      throw new TypeError('[helper-cache] GET_OR_FETCH_LOCK_TIMEOUT_MS must be a positive Number');
    }

    // GET_OR_FETCH_LOCK_RETRY_MS must be a positive Number
    if (!Lib.Utils.isNumber(config.GET_OR_FETCH_LOCK_RETRY_MS) || config.GET_OR_FETCH_LOCK_RETRY_MS <= 0) {
      throw new TypeError('[helper-cache] GET_OR_FETCH_LOCK_RETRY_MS must be a positive Number');
    }

    // GET_OR_FETCH_LOCK_RETRY_JITTER_MS must be a non-negative Number (zero is valid)
    if (!Lib.Utils.isNumber(config.GET_OR_FETCH_LOCK_RETRY_JITTER_MS) || config.GET_OR_FETCH_LOCK_RETRY_JITTER_MS < 0) {
      throw new TypeError('[helper-cache] GET_OR_FETCH_LOCK_RETRY_JITTER_MS must be a non-negative Number');
    }

  },


  /********************************************************************
  Validate that an instantiated store exposes the required 6-method
  contract. Throws at startup when any method is missing so runtime
  requests never hit a partially-implemented store.

  @param {Object} store - Instantiated store object

  @return {void}
  *********************************************************************/
  validateStoreContract: function (store) {

    const required = [
      'get',
      'set',
      'delete',
      'clear',
      'list',
      'has'
    ];

    required.forEach(function (name) {

      if (Lib.Utils.isNullOrUndefined(store[name]) || !Lib.Utils.isFunction(store[name])) {
        throw new Error(
          '[helper-cache] Invalid store contract: missing method `' + name + '`'
        );
      }

    });

  },


  /********************************************************************
  Validate that the store supports distributed locking. Called only
  when GET_OR_FETCH_LOCK_ENABLED is true. Throws at startup when
  setLock or releaseLock is missing.

  @param {Object} store - Instantiated store object

  @return {void}
  *********************************************************************/
  validateLockSupport: function (store) {

    const lockRequired = [
      'setLock',
      'releaseLock'
    ];

    lockRequired.forEach(function (name) {

      if (Lib.Utils.isNullOrUndefined(store[name]) || !Lib.Utils.isFunction(store[name])) {
        throw new Error(
          '[helper-cache] GET_OR_FETCH_LOCK_ENABLED is true but store does not implement `' + name + '`'
        );
      }

    });

  },


  /********************************************************************
  Validate the namespace and cache_code identifier pair. Throws
  TypeError on any violation - these are programmer errors.

  @param {String} namespace   - Logical group for the cache entry
  @param {String} cache_code  - Specific entry identifier within the namespace

  @return {void}
  *********************************************************************/
  validateIdentifiers: function (namespace, cache_code) {

    if (!Lib.Utils.isString(namespace) || namespace === '') {
      throw new TypeError('[helper-cache] namespace is required (non-empty string)');
    }

    if (!Lib.Utils.isString(cache_code) || cache_code === '') {
      throw new TypeError('[helper-cache] cache_code is required (non-empty string)');
    }

  },


  /********************************************************************
  Validate an optional cache_code_prefix argument. Throws TypeError
  when present but not a string. A missing or empty value is allowed
  and means "no prefix - match the entire namespace".

  @param {String|undefined} cache_code_prefix

  @return {void}
  *********************************************************************/
  validateOptionalPrefix: function (cache_code_prefix) {

    if (!Lib.Utils.isNullOrUndefined(cache_code_prefix)) {
      if (!Lib.Utils.isString(cache_code_prefix)) {
        throw new TypeError('[helper-cache] cache_code_prefix must be a string when provided');
      }
    }

  },


  /********************************************************************
  Validate an optional ttl_seconds argument. Throws TypeError when
  present but not a positive number. A missing value is allowed and
  means "no expiry".

  @param {Number|undefined} ttl_seconds

  @return {void}
  *********************************************************************/
  validateOptionalTtl: function (ttl_seconds) {

    if (!Lib.Utils.isNullOrUndefined(ttl_seconds)) {
      if (!Lib.Utils.isNumber(ttl_seconds) || ttl_seconds <= 0) {
        throw new TypeError('[helper-cache] ttl_seconds must be a positive number when provided');
      }
    }

  }


};////////////////////////////// Public Functions END ////////////////////////
