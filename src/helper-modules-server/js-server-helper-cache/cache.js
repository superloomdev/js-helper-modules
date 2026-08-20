// Info: Application-level cache with TTL and namespacing.
// Cache-aside pattern: the application fetches from the source database on a
// miss and populates the cache; this module never reads the source. Five
// operations cover the lifecycle of a cached value: set, get, delete, clear
// (mass invalidation by prefix), and list (enumerate cache_codes by prefix).
//
// Two identifier parameters - namespace and cache_code - locate every entry.
// The word "key" is avoided because it already means three different things
// across the target backends: a flat string in Valkey, a partition plus sort
// pair in DynamoDB, and `_id` in MongoDB. The cache module forwards both
// values to the store as separate parameters and composes no backend key.
//
// Storage backends are provided by standalone adapter packages. The caller
// passes the chosen ready-to-use store object directly as CONFIG.Store - no
// string dispatch inside this module. Configure and require only the adapter
// you need:
//   const Store = require('helper-cache-store-valkey')(Lib, config)
//
// Compatibility: Node.js 24+
'use strict';



/////////////////////////// Module-Loader START ////////////////////////////////

/********************************************************************
Factory loader. One call = one independent instance with its own
Lib, CONFIG, and store. Validates CONFIG at construction so
misconfiguration fails fast at startup, not on first request.

@param {Object} shared_libs - Lib container with Utils, Debug, Instance
@param {Object} config - Overrides merged over module config defaults

@return {Object} - Public interface for this module
*********************************************************************/
module.exports = function loader (shared_libs, config) {

  // Dependencies for this instance
  const Lib = {
    Utils: shared_libs.Utils,
    Debug: shared_libs.Debug,
    Instance: shared_libs.Instance
  };

  // Merge overrides over defaults
  const CONFIG = Object.assign(
    {},
    require('./cache.config'),
    config || {}
  );

  // Load internal error catalog
  const ERRORS = require('./cache.errors');

  // Load the validators singleton - Lib and ERRORS injected
  const Validators = require('./cache.validators')(Lib, ERRORS);

  // Validate CONFIG - throws on misconfiguration
  Validators.validateConfig(CONFIG);

  // Use the ready-to-use store object passed in by the caller.
  // The adapter is a fully independent module that owns its own Lib/Config/ERRORS.
  const store = CONFIG.Store;

  // Validate store contract immediately so missing methods fail at startup
  Validators.validateStoreContract(store);

  // Build the public interface, closing over Lib, CONFIG, ERRORS, Validators, and store
  return createInterface(Lib, CONFIG, ERRORS, Validators, store);

};///////////////////////////// Module-Loader END ///////////////////////////////



/////////////////////////// createInterface START //////////////////////////////

/********************************************************************
Builds the public interface for one instance. Public and private
functions close over the provided Lib, CONFIG, ERRORS, Validators,
and store.

@param {Object} Lib        - Dependency container (Utils, Debug, Instance)
@param {Object} CONFIG     - Merged configuration for this instance
@param {Object} ERRORS     - Frozen error catalog for this module
@param {Object} Validators - Validator singleton (validateConfig, validateIdentifiers, ...)
@param {Object} store      - Resolved storage backend interface

@return {Object} - Public interface for this module
*********************************************************************/
const createInterface = function (Lib, CONFIG, ERRORS, Validators, store) {

  ////////////////////////////// Public Functions START ////////////////////////
  const Cache = {


    /********************************************************************
    Store a value in the cache with an optional TTL (seconds). Overwrites
    any existing entry at the same (namespace, cache_code). The value is
    JSON-serialized before being handed to the store; the store handles
    backend-specific encoding.

    @param {Object} instance     - Request instance for time and lifecycle
    @param {String} namespace    - Logical group for the cache entry
    @param {String} cache_code   - Specific entry identifier within the namespace
    @param {*} value             - Value to cache (JSON-serializable)
    @param {Number} [ttl_seconds] - Optional lifetime in seconds. Omit for no expiry

    @return {Promise<Object>} - { success, error }
    *********************************************************************/
    set: async function (instance, namespace, cache_code, value, ttl_seconds) {

      // Programmer errors (bad args) throw synchronously - never returned as envelope
      Validators.validateIdentifiers(namespace, cache_code);
      Validators.validateOptionalTtl(ttl_seconds);

      // Serialize the value to JSON before handing it to the store
      let serialized;

      try {
        serialized = JSON.stringify(value);
      } catch (err) {
        Lib.Debug.debug('Cache serialization failed', { namespace: namespace, cache_code: cache_code, error: err && err.message });
        return {
          success: false,
          error: ERRORS.CACHE_SERIALIZATION_FAILED
        };
      }

      // Delegate to the store and translate any driver failure
      try {
        const result = await store.set(instance, namespace, cache_code, serialized, ttl_seconds);

        if (result.success === false) {
          Lib.Debug.debug('Cache store set failed', { namespace: namespace, cache_code: cache_code, error: result.error });
          return {
            success: false,
            error: ERRORS.CACHE_STORE_UNAVAILABLE
          };
        }

        return {
          success: true,
          error: null
        };
      } catch (err) {
        Lib.Debug.debug('Cache store set threw', { namespace: namespace, cache_code: cache_code, error: err && err.message });
        return {
          success: false,
          error: ERRORS.CACHE_STORE_UNAVAILABLE
        };
      }

    },


    /********************************************************************
    Read a value from the cache. Returns value: null on a cache miss
    (entry absent or expired) - a miss is not an error. The store's
    raw string is JSON-parsed before being returned.

    @param {Object} instance  - Request instance for time and lifecycle
    @param {String} namespace - Logical group for the cache entry
    @param {String} cache_code - Specific entry identifier within the namespace

    @return {Promise<Object>} - { success, value, error }
    *********************************************************************/
    get: async function (instance, namespace, cache_code) {

      // Programmer errors (bad args) throw synchronously - never returned as envelope
      Validators.validateIdentifiers(namespace, cache_code);

      // Delegate to the store and translate any driver failure
      let raw;

      try {
        const result = await store.get(instance, namespace, cache_code);

        if (result.success === false) {
          Lib.Debug.debug('Cache store get failed', { namespace: namespace, cache_code: cache_code, error: result.error });
          return {
            success: false,
            value: null,
            error: ERRORS.CACHE_STORE_UNAVAILABLE
          };
        }

        // A cache miss is not an error - short-circuit before any parse
        if (result.value === null || Lib.Utils.isNullOrUndefined(result.value)) {
          return {
            success: true,
            value: null,
            error: null
          };
        }

        raw = result.value;
      } catch (err) {
        Lib.Debug.debug('Cache store get threw', { namespace: namespace, cache_code: cache_code, error: err && err.message });
        return {
          success: false,
          value: null,
          error: ERRORS.CACHE_STORE_UNAVAILABLE
        };
      }

      // Parse the JSON string returned by the store
      try {
        return {
          success: true,
          value: JSON.parse(raw),
          error: null
        };
      } catch (err) {
        Lib.Debug.debug('Cache deserialization failed', { namespace: namespace, cache_code: cache_code, error: err && err.message });
        return {
          success: false,
          value: null,
          error: ERRORS.CACHE_SERIALIZATION_FAILED
        };
      }

    },


    /********************************************************************
    Remove one cache entry. Idempotent: succeeds even if the cache_code
    does not exist.

    @param {Object} instance  - Request instance for time and lifecycle
    @param {String} namespace - Logical group for the cache entry
    @param {String} cache_code - Specific entry identifier within the namespace

    @return {Promise<Object>} - { success, error }
    *********************************************************************/
    delete: async function (instance, namespace, cache_code) {

      // Programmer errors (bad args) throw synchronously - never returned as envelope
      Validators.validateIdentifiers(namespace, cache_code);

      // Delegate to the store and translate any driver failure
      try {
        const result = await store.delete(instance, namespace, cache_code);

        if (result.success === false) {
          Lib.Debug.debug('Cache store delete failed', { namespace: namespace, cache_code: cache_code, error: result.error });
          return {
            success: false,
            error: ERRORS.CACHE_STORE_UNAVAILABLE
          };
        }

        return {
          success: true,
          error: null
        };
      } catch (err) {
        Lib.Debug.debug('Cache store delete threw', { namespace: namespace, cache_code: cache_code, error: err && err.message });
        return {
          success: false,
          error: ERRORS.CACHE_STORE_UNAVAILABLE
        };
      }

    },


    /********************************************************************
    Mass invalidation. Remove all entries in namespace whose cache_code
    starts with cache_code_prefix. When cache_code_prefix is omitted,
    removes every entry in the namespace. Entries in other namespaces
    are never touched.

    @param {Object} instance       - Request instance for time and lifecycle
    @param {String} namespace      - Logical group for the cache entries
    @param {String} [cache_code_prefix] - Optional prefix. Omit to clear the whole namespace

    @return {Promise<Object>} - { success, deleted_count, error }
    *********************************************************************/
    clear: async function (instance, namespace, cache_code_prefix) {

      // Programmer errors (bad args) throw synchronously - never returned as envelope
      if (!Lib.Utils.isString(namespace) || namespace === '') {
        throw new TypeError('[helper-cache] namespace is required (non-empty string)');
      }
      Validators.validateOptionalPrefix(cache_code_prefix);

      // Delegate to the store and translate any driver failure
      try {
        const result = await store.clear(instance, namespace, cache_code_prefix);

        if (result.success === false) {
          Lib.Debug.debug('Cache store clear failed', { namespace: namespace, prefix: cache_code_prefix, error: result.error });
          return {
            success: false,
            deleted_count: 0,
            error: ERRORS.CACHE_STORE_UNAVAILABLE
          };
        }

        return {
          success: true,
          deleted_count: result.deleted_count,
          error: null
        };
      } catch (err) {
        Lib.Debug.debug('Cache store clear threw', { namespace: namespace, prefix: cache_code_prefix, error: err && err.message });
        return {
          success: false,
          deleted_count: 0,
          error: ERRORS.CACHE_STORE_UNAVAILABLE
        };
      }

    },


    /********************************************************************
    List cache_codes in namespace whose cache_code starts with
    cache_code_prefix. When cache_code_prefix is omitted, lists every
    cache_code in the namespace. Returns cache_codes without the
    namespace prefix - just the entity identifier portion.

    @param {Object} instance       - Request instance for time and lifecycle
    @param {String} namespace      - Logical group for the cache entries
    @param {String} [cache_code_prefix] - Optional prefix. Omit to list the whole namespace

    @return {Promise<Object>} - { success, cache_codes, error }
    *********************************************************************/
    list: async function (instance, namespace, cache_code_prefix) {

      // Programmer errors (bad args) throw synchronously - never returned as envelope
      if (!Lib.Utils.isString(namespace) || namespace === '') {
        throw new TypeError('[helper-cache] namespace is required (non-empty string)');
      }
      Validators.validateOptionalPrefix(cache_code_prefix);

      // Delegate to the store and translate any driver failure
      try {
        const result = await store.list(instance, namespace, cache_code_prefix);

        if (result.success === false) {
          Lib.Debug.debug('Cache store list failed', { namespace: namespace, prefix: cache_code_prefix, error: result.error });
          return {
            success: false,
            cache_codes: [],
            error: ERRORS.CACHE_STORE_UNAVAILABLE
          };
        }

        return {
          success: true,
          cache_codes: result.cache_codes,
          error: null
        };
      } catch (err) {
        Lib.Debug.debug('Cache store list threw', { namespace: namespace, prefix: cache_code_prefix, error: err && err.message });
        return {
          success: false,
          cache_codes: [],
          error: ERRORS.CACHE_STORE_UNAVAILABLE
        };
      }

    }

  };////////////////////////////// Public Functions END ////////////////////////



  ///////////////////////////// Private Functions START ////////////////////////
  // No private helpers are needed yet. The cache module is a thin delegation
  // layer over the store contract; every operation is a validate-then-delegate
  // call. When internal helpers become necessary, they go here following the
  // same banner and JSDoc conventions as the public functions above.
  ///////////////////////////// Private Functions END ////////////////////////


  // Return public interface
  return Cache;

};///////////////////////////// createInterface END ////////////////////////////
