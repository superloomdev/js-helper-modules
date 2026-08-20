// Info: Valkey/Redis store adapter for helper-cache. Fully independent
// module that owns its own CONFIG, ERRORS, and Validators. Composes a
// flat Valkey key from namespace and cache_code using KEY_PREFIX and
// KEY_SEPARATOR, then delegates to Lib.KV (the kv-valkey driver).
//
// The cache module forwards namespace and cache_code as separate
// parameters; this adapter composes them into one string key (write-only).
// It never splits a composed key back into parts. stripToCacheCode removes
// a known-length prefix, so a cache_code containing KEY_SEPARATOR
// round-trips correctly.
//
// clear and list use Lib.KV.scan, which is O(N) over the entire keyspace.
// Redis and Valkey expose a flat keyspace with no partition or sort key,
// so no prefix-scoped index exists. See docs/configuration.md for the
// cost implications on node-based versus serverless ElastiCache.
//
// Standard factory shape: receives shared_libs, picks KV driver as
// Lib.KV (capability-named key, not vendor-named).
//
// Store contract (identical shape across all adapters):
//   - get(instance, namespace, cache_code)                       -> { success, value, error }
//   - set(instance, namespace, cache_code, value, ttl_seconds)   -> { success, error }
//   - delete(instance, namespace, cache_code)                    -> { success, error }
//   - clear(instance, namespace, cache_code_prefix?)             -> { success, deleted_count, error }
//   - list(instance, namespace, cache_code_prefix?)              -> { success, cache_codes, error }

'use strict';



/////////////////////////// Module-Loader START ////////////////////////////////

/********************************************************************
Thin loader. Picks dependencies from the injected container, merges
config over defaults, validates config via the Validators singleton,
then delegates to createInterface. Each call returns an independent
Store instance.

@param {Object} shared_libs - Dependency container (Utils, Debug, KV)
@param {Object} config      - Overrides merged over adapter config defaults

@return {Object} - Store interface (5 methods: get, set, delete, clear, list)
*********************************************************************/
module.exports = function loader (shared_libs, config) {

  // Dependencies for this instance - by reference from the shared container
  const Lib = {
    Utils: shared_libs.Utils,
    Debug: shared_libs.Debug,
    KV: shared_libs.KV
  };

  // Merge overrides over adapter config defaults
  const CONFIG = Object.assign(
    {},
    require('./store.config'),
    config || {}
  );

  // Own frozen error catalog
  const ERRORS = require('./store.errors');

  // Load the validators singleton and inject Lib + ERRORS
  const Validators = require('./store.validators')(Lib, ERRORS);

  // Validate config - throws on misconfiguration
  Validators.validateConfig(CONFIG);

  // Build the public Store interface
  return createInterface(Lib, CONFIG, ERRORS, Validators);

};///////////////////////////// Module-Loader END ///////////////////////////////



/////////////////////////// createInterface START //////////////////////////////

/********************************************************************
Builds the public Store interface for one instance. All functions
close over the same Lib, CONFIG, and ERRORS.

@param {Object} Lib        - Dependency container (Utils, Debug, KV)
@param {Object} CONFIG     - Merged adapter configuration (validated)
@param {Object} ERRORS     - Frozen error catalog
@param {Object} Validators - Validators singleton (Lib + ERRORS injected)

@return {Object} - Store interface (5 methods: get, set, delete, clear, list)
*********************************************************************/
const createInterface = function (Lib, CONFIG, ERRORS, Validators) { // eslint-disable-line no-unused-vars

  //////////////////////////// Private Functions START //////////////////////////
  const _Store = {

    /******************************************************************
    Build the fixed-length prefix shared by every composed key in a
    namespace: KEY_PREFIX + namespace + KEY_SEPARATOR. Defining this
    once means the prefix and separator appear in exactly one place.

    @param {String} namespace

    @return {String}
    ******************************************************************/
    keyBase: function (namespace) {
      return CONFIG.KEY_PREFIX + namespace + CONFIG.KEY_SEPARATOR;
    },


    /******************************************************************
    Compose the full Valkey key for one cache entry.

    @param {String} namespace
    @param {String} cache_code

    @return {String}
    ******************************************************************/
    composeKey: function (namespace, cache_code) {
      return _Store.keyBase(namespace) + cache_code;
    },


    /******************************************************************
    Compose a SCAN glob pattern matching every cache_code in the
    namespace that starts with cache_code_prefix. When cache_code_prefix
    is omitted, matches every entry in the namespace.

    @param {String} namespace
    @param {String|undefined} cache_code_prefix

    @return {String}
    ******************************************************************/
    composeScanPattern: function (namespace, cache_code_prefix) {
      return _Store.keyBase(namespace) + (cache_code_prefix || '') + '*';
    },


    /******************************************************************
    Strip the known-length namespace prefix from a full Valkey key to
    recover the cache_code. This is not a split: the length is derived
    from keyBase, so a cache_code containing KEY_SEPARATOR round-trips
    correctly.

    @param {String} namespace
    @param {String} full_key

    @return {String}
    ******************************************************************/
    stripToCacheCode: function (namespace, full_key) {
      return full_key.slice(_Store.keyBase(namespace).length);
    },


    /******************************************************************
    Log a driver failure at debug level. The driver's own error type
    and message never leak through to the caller; only the adapter's
    own SERVICE_UNAVAILABLE envelope is returned.

    @param {String} method        - Public method name
    @param {Object} driver_error  - Error object from Lib.KV

    @return {void}
    ******************************************************************/
    logDriverFailure: function (method, driver_error) {
      Lib.Debug.debug('[helper-cache-store-valkey] ' + method + ' failed', {
        type: ERRORS.SERVICE_UNAVAILABLE.type,
        driver_type: driver_error && driver_error.type,
        driver_message: driver_error && driver_error.message
      });
    }

  };///////////////////////////// Private Functions END ////////////////////////



  ////////////////////////////// Public Functions START ////////////////////////
  const Store = {


    /********************************************************************
    Read one cached value by composite key. Returns value: null on a
    miss (key absent or expired via native Valkey TTL). Delegates to
    Lib.KV.get.

    @param {Object} instance   - Request instance
    @param {String} namespace  - Logical group for the cache entry
    @param {String} cache_code - Specific entry identifier within the namespace

    @return {Promise<Object>} - { success, value, error }
    *********************************************************************/
    get: async function (instance, namespace, cache_code) {

      // Compose the flat Valkey key and delegate to the KV driver
      const result = await Lib.KV.get(instance, _Store.composeKey(namespace, cache_code));

      // Return a service error if the driver call failed
      if (result.success === false) {
        _Store.logDriverFailure('get', result.error);
        return {
          success: false,
          value: null,
          error: ERRORS.SERVICE_UNAVAILABLE
        };
      }

      // Pass the driver's value straight through - null means miss
      return {
        success: true,
        value: result.value,
        error: null
      };

    },


    /********************************************************************
    Write one cached value with an optional TTL. ttl_seconds is
    positional and optional - when absent, the key has no expiry.
    Delegates to Lib.KV.set.

    @param {Object} instance    - Request instance
    @param {String} namespace   - Logical group for the cache entry
    @param {String} cache_code  - Specific entry identifier within the namespace
    @param {String} value       - JSON-serialized value (from the cache module)
    @param {Number} ttl_seconds - Optional lifetime in seconds

    @return {Promise<Object>} - { success, error }
    *********************************************************************/
    set: async function (instance, namespace, cache_code, value, ttl_seconds) {

      // Compose the flat Valkey key and delegate to the KV driver
      const result = await Lib.KV.set(instance, _Store.composeKey(namespace, cache_code), value, ttl_seconds);

      // Return a service error if the driver call failed
      if (result.success === false) {
        _Store.logDriverFailure('set', result.error);
        return {
          success: false,
          error: ERRORS.SERVICE_UNAVAILABLE
        };
      }

      // Report success
      return {
        success: true,
        error: null
      };

    },


    /********************************************************************
    Idempotent delete of one cache entry. Delegates to Lib.KV.delete.
    A deleted_count of 0 is still success.

    @param {Object} instance   - Request instance
    @param {String} namespace  - Logical group for the cache entry
    @param {String} cache_code - Specific entry identifier within the namespace

    @return {Promise<Object>} - { success, error }
    *********************************************************************/
    delete: async function (instance, namespace, cache_code) {

      // Compose the flat Valkey key and delegate to the KV driver
      const result = await Lib.KV.delete(instance, _Store.composeKey(namespace, cache_code));

      // Return a service error if the driver call failed
      if (result.success === false) {
        _Store.logDriverFailure('delete', result.error);
        return {
          success: false,
          error: ERRORS.SERVICE_UNAVAILABLE
        };
      }

      // Report success - idempotent, deleted_count of 0 is fine
      return {
        success: true,
        error: null
      };

    },


    /********************************************************************
    Mass invalidation. SCAN for matching keys, then delete them in one
    deleteMany call. Short-circuits on zero matches to avoid a needless
    roundtrip. O(N) over the entire keyspace - see docs/configuration.md.

    @param {Object} instance        - Request instance
    @param {String} namespace       - Logical group for the cache entries
    @param {String} cache_code_prefix - Optional prefix. Omit to clear the whole namespace

    @return {Promise<Object>} - { success, deleted_count, error }
    *********************************************************************/
    clear: async function (instance, namespace, cache_code_prefix) {

      // Scan for every key matching the namespace prefix
      const scan_result = await Lib.KV.scan(instance, _Store.composeScanPattern(namespace, cache_code_prefix));

      // Return a service error if the scan failed
      if (scan_result.success === false) {
        _Store.logDriverFailure('clear (scan)', scan_result.error);
        return {
          success: false,
          deleted_count: 0,
          error: ERRORS.SERVICE_UNAVAILABLE
        };
      }

      // Short-circuit on zero matches - no delete roundtrip needed
      if (scan_result.keys.length === 0) {
        return {
          success: true,
          deleted_count: 0,
          error: null
        };
      }

      // Delete all matched keys in one batch call
      const delete_result = await Lib.KV.deleteMany(instance, scan_result.keys);

      // Return a service error if the delete failed
      if (delete_result.success === false) {
        _Store.logDriverFailure('clear (deleteMany)', delete_result.error);
        return {
          success: false,
          deleted_count: 0,
          error: ERRORS.SERVICE_UNAVAILABLE
        };
      }

      // Report success with the count of deleted keys
      return {
        success: true,
        deleted_count: delete_result.deleted_count,
        error: null
      };

    },


    /********************************************************************
    List cache_codes in the namespace matching the prefix. SCAN for
    matching keys, strip the namespace prefix from each, return the
    cache_codes. O(N) over the entire keyspace - see docs/configuration.md.

    @param {Object} instance        - Request instance
    @param {String} namespace       - Logical group for the cache entries
    @param {String} cache_code_prefix - Optional prefix. Omit to list the whole namespace

    @return {Promise<Object>} - { success, cache_codes, error }
    *********************************************************************/
    list: async function (instance, namespace, cache_code_prefix) {

      // Scan for every key matching the namespace prefix
      const scan_result = await Lib.KV.scan(instance, _Store.composeScanPattern(namespace, cache_code_prefix));

      // Return a service error if the scan failed
      if (scan_result.success === false) {
        _Store.logDriverFailure('list (scan)', scan_result.error);
        return {
          success: false,
          cache_codes: [],
          error: ERRORS.SERVICE_UNAVAILABLE
        };
      }

      // Strip the namespace prefix from each key to recover cache_codes
      const cache_codes = scan_result.keys.map(function (full_key) {
        return _Store.stripToCacheCode(namespace, full_key);
      });

      // Report success with the list of cache_codes
      return {
        success: true,
        cache_codes: cache_codes,
        error: null
      };

    }

  };////////////////////////////// Public Functions END ////////////////////////


  return Store;

};///////////////////////////// createInterface END ////////////////////////////
