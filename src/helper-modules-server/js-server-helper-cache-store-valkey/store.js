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
// deleteCacheByPrefix, clearCache, and listCacheCodes use Lib.KV.scan,
// which is O(N) over the entire keyspace. Redis and Valkey expose a flat
// keyspace with no partition or sort key, so no prefix-scoped index
// exists. The cost implications on node-based versus serverless
// ElastiCache are documented in this module's configuration page.
//
// Standard factory shape: receives shared_libs, picks KV driver as
// Lib.KV (capability-named key, not vendor-named).
//
// Store contract (identical shape across all adapters):
//   - getCache(instance, namespace, cache_code)                       -> { success, value, error }
//   - setCache(instance, namespace, cache_code, value, ttl_seconds)   -> { success, error }
//   - deleteCache(instance, namespace, cache_code)                    -> { success, error }
//   - deleteCacheByPrefix(instance, namespace, cache_code_prefix)     -> { success, deleted_count, error }
//   - clearCache(instance, namespace)                                 -> { success, deleted_count, error }
//   - listCacheCodes(instance, namespace, cache_code_prefix?)         -> { success, cache_codes, error }
//   - getCacheExists(instance, namespace, cache_code)                 -> { success, exists, error }
//   - setCacheLock(instance, namespace, cache_code, options)          -> { success, applied, error }
//   - releaseCacheLock(instance, namespace, cache_code)               -> { success, error }
//
// Serialization: this adapter owns JSON.stringify on setCache and
// JSON.parse on getCache. The cache module passes raw JavaScript objects;
// the adapter serializes before handing to Lib.KV and deserializes before
// returning to the cache.
//
// Lock keys are separate from cache entry keys (LOCK_KEY_PREFIX instead of
// KEY_PREFIX), so deleting a cache entry never releases a lock, and a
// lock's TTL is independent of the cached value's TTL.

'use strict';



/////////////////////////// Module-Loader START ////////////////////////////////

/********************************************************************
Thin loader. Picks dependencies from the injected container, merges
config over defaults, validates config via the Validators singleton,
then delegates to createInterface. Each call returns an independent
Store instance.

@param {Object} shared_libs - Dependency container (Utils, Debug, KV)
@param {Object} config      - Overrides merged over adapter config defaults

@return {Object} - Store interface (9 methods: getCache, setCache, deleteCache, deleteCacheByPrefix, clearCache, listCacheCodes, getCacheExists, setCacheLock, releaseCacheLock)
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

@return {Object} - Store interface (9 methods: getCache, setCache, deleteCache, deleteCacheByPrefix, clearCache, listCacheCodes, getCacheExists, setCacheLock, releaseCacheLock)
*********************************************************************/
const createInterface = function (Lib, CONFIG, ERRORS, Validators) { // eslint-disable-line no-unused-vars

  ////////////////////////////// Public Functions START ////////////////////////
  const Store = {


    /********************************************************************
    Read one cached value by composite key. Returns value: null on a
    miss (key absent or expired via native Valkey TTL). The stored JSON
    string is deserialized to a JavaScript object before being returned
    to the cache module. Delegates to Lib.KV.get.

    @param {Object} instance   - Request instance
    @param {String} namespace  - Logical group for the cache entry
    @param {String} cache_code - Specific entry identifier within the namespace

    @return {Promise<Object>} - { success, value, error }
    *********************************************************************/
    getCache: async function (instance, namespace, cache_code) {

      // Compose the flat Valkey key and delegate to the KV driver
      const result = await Lib.KV.get(instance, _Store.composeKey(namespace, cache_code));

      // Return a service error if the driver call failed
      if (result.success === false) {
        _Store.logDriverFailure('getCache', result.error);
        return {
          success: false,
          value: null,
          error: ERRORS.SERVICE_UNAVAILABLE
        };
      }

      // A miss is not an error - pass null straight through
      if (result.value === null) {
        return {
          success: true,
          value: null,
          error: null
        };
      }

      // Deserialize the stored JSON string - this adapter owns deserialization
      try {
        return {
          success: true,
          value: JSON.parse(result.value),
          error: null
        };
      } catch (err) {
        Lib.Debug.debug('[helper-cache-store-valkey] getCache deserialization failed', {
          namespace: namespace,
          cache_code: cache_code,
          error: err && err.message
        });
        return {
          success: false,
          value: null,
          error: ERRORS.SERIALIZATION_FAILED
        };
      }

    },


    /********************************************************************
    Write one cached value with an optional TTL. The value is a raw
    JavaScript object from the cache module; this adapter serializes
    it to JSON before handing it to Lib.KV. ttl_seconds is positional
    and optional - when absent, the key has no expiry. Delegates to
    Lib.KV.set.

    @param {Object} instance    - Request instance
    @param {String} namespace   - Logical group for the cache entry
    @param {String} cache_code  - Specific entry identifier within the namespace
    @param {*} value            - Raw JavaScript value to cache
    @param {Number} ttl_seconds - Optional lifetime in seconds

    @return {Promise<Object>} - { success, error }
    *********************************************************************/
    setCache: async function (instance, namespace, cache_code, value, ttl_seconds) {

      // Serialize the value to JSON - this adapter owns serialization
      let serialized;

      try {
        serialized = JSON.stringify(value);
      } catch (err) {
        Lib.Debug.debug('[helper-cache-store-valkey] setCache serialization failed', {
          namespace: namespace,
          cache_code: cache_code,
          error: err && err.message
        });
        return {
          success: false,
          error: ERRORS.SERIALIZATION_FAILED
        };
      }

      // Compose the flat Valkey key and delegate to the KV driver
      const result = await Lib.KV.set(instance, _Store.composeKey(namespace, cache_code), serialized, ttl_seconds);

      // Return a service error if the driver call failed
      if (result.success === false) {
        _Store.logDriverFailure('setCache', result.error);
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
    deleteCache: async function (instance, namespace, cache_code) {

      // Compose the flat Valkey key and delegate to the KV driver
      const result = await Lib.KV.delete(instance, _Store.composeKey(namespace, cache_code));

      // Return a service error if the driver call failed
      if (result.success === false) {
        _Store.logDriverFailure('deleteCache', result.error);
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
    Selective mass invalidation. SCAN for keys matching the namespace
    and cache_code_prefix, then delete them in one deleteMany call.
    Short-circuits on zero matches to avoid a needless roundtrip.
    O(N) over the entire keyspace.

    The cache_code_prefix is required. To wipe every entry in a
    namespace, use clearCache instead.

    @param {Object} instance          - Request instance
    @param {String} namespace         - Logical group for the cache entries
    @param {String} cache_code_prefix - Required prefix. Only entries whose cache_code starts with this are deleted

    @return {Promise<Object>} - { success, deleted_count, error }
    *********************************************************************/
    deleteCacheByPrefix: async function (instance, namespace, cache_code_prefix) {

      // Scan for every key matching the namespace + prefix
      const scan_result = await Lib.KV.scan(instance, _Store.composeScanPattern(namespace, cache_code_prefix));

      // Return a service error if the scan failed
      if (scan_result.success === false) {
        _Store.logDriverFailure('deleteCacheByPrefix (scan)', scan_result.error);
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
        _Store.logDriverFailure('deleteCacheByPrefix (deleteMany)', delete_result.error);
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
    Wipe every cache entry in the namespace. SCAN for all keys under
    the namespace prefix, then delete them in one deleteMany call.
    Short-circuits on zero matches. O(N) over the entire keyspace.

    @param {Object} instance   - Request instance
    @param {String} namespace  - Logical group for the cache entries

    @return {Promise<Object>} - { success, deleted_count, error }
    *********************************************************************/
    clearCache: async function (instance, namespace) {

      // Scan for every key matching the namespace (no prefix = all entries)
      const scan_result = await Lib.KV.scan(instance, _Store.composeScanPattern(namespace, undefined));

      // Return a service error if the scan failed
      if (scan_result.success === false) {
        _Store.logDriverFailure('clearCache (scan)', scan_result.error);
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
        _Store.logDriverFailure('clearCache (deleteMany)', delete_result.error);
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
    cache_codes. O(N) over the entire keyspace.

    @param {Object} instance        - Request instance
    @param {String} namespace       - Logical group for the cache entries
    @param {String} cache_code_prefix - Optional prefix. Omit to list the whole namespace

    @return {Promise<Object>} - { success, cache_codes, error }
    *********************************************************************/
    listCacheCodes: async function (instance, namespace, cache_code_prefix) {

      // Scan for every key matching the namespace prefix
      const scan_result = await Lib.KV.scan(instance, _Store.composeScanPattern(namespace, cache_code_prefix));

      // Return a service error if the scan failed
      if (scan_result.success === false) {
        _Store.logDriverFailure('listCacheCodes (scan)', scan_result.error);
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

    },


    /********************************************************************
    Check whether a cache entry exists without fetching its value.
    Delegates to Lib.KV.getKeyExists. Returns exists: true if the key
    is present and not expired, false otherwise.

    @param {Object} instance   - Request instance
    @param {String} namespace  - Logical group for the cache entry
    @param {String} cache_code - Specific entry identifier within the namespace

    @return {Promise<Object>} - { success, exists, error }
    *********************************************************************/
    getCacheExists: async function (instance, namespace, cache_code) {

      // Compose the flat Valkey key and delegate to the KV driver
      const result = await Lib.KV.getKeyExists(instance, _Store.composeKey(namespace, cache_code));

      // Return a service error if the driver call failed
      if (result.success === false) {
        _Store.logDriverFailure('getCacheExists', result.error);
        return {
          success: false,
          exists: false,
          error: ERRORS.SERVICE_UNAVAILABLE
        };
      }

      // Pass the driver's exists flag straight through
      return {
        success: true,
        exists: result.exists,
        error: null
      };

    },


    /********************************************************************
    Acquire a distributed lock for a cache entry. Uses Lib.KV.setIfNotExists
    (atomic SET NX) with a TTL derived from options.timeout_ms. The lock
    key is separate from the cache entry key (LOCK_KEY_PREFIX instead of
    KEY_PREFIX), so deleting a cache entry never releases a lock.

    Returns applied: true if this caller acquired the lock, false if
    another caller already holds it. applied: false is not an error.

    @param {Object} instance   - Request instance
    @param {String} namespace  - Logical group for the cache entry
    @param {String} cache_code - Specific entry identifier within the namespace
    @param {Object} options    - { timeout_ms: Number } lock auto-expiry in milliseconds

    @return {Promise<Object>} - { success, applied, error }
    *********************************************************************/
    setCacheLock: async function (instance, namespace, cache_code, options) {

      // Convert milliseconds to seconds for the KV driver (ceil to avoid sub-second rounding to 0)
      const timeout_ms = (options && options.timeout_ms) || 3000;
      const ttl_seconds = Math.ceil(timeout_ms / 1000);

      // Compose the lock key and delegate to the KV driver's atomic setIfNotExists
      const result = await Lib.KV.setIfNotExists(
        instance,
        _Store.composeLockKey(namespace, cache_code),
        '1',
        ttl_seconds
      );

      // Return a service error if the driver call failed
      if (result.success === false) {
        _Store.logDriverFailure('setCacheLock', result.error);
        return {
          success: false,
          applied: false,
          error: ERRORS.SERVICE_UNAVAILABLE
        };
      }

      // Pass the driver's applied flag straight through
      return {
        success: true,
        applied: result.applied,
        error: null
      };

    },


    /********************************************************************
    Release a distributed lock. Delegates to Lib.KV.delete. Idempotent:
    succeeds even if the lock was already released or expired via TTL.

    @param {Object} instance   - Request instance
    @param {String} namespace  - Logical group for the cache entry
    @param {String} cache_code - Specific entry identifier within the namespace

    @return {Promise<Object>} - { success, error }
    *********************************************************************/
    releaseCacheLock: async function (instance, namespace, cache_code) {

      // Compose the lock key and delegate to the KV driver
      const result = await Lib.KV.delete(instance, _Store.composeLockKey(namespace, cache_code));

      // Return a service error if the driver call failed
      if (result.success === false) {
        _Store.logDriverFailure('releaseCacheLock', result.error);
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

    }

  };////////////////////////////// Public Functions END ////////////////////////



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
    Compose the full Valkey key for a distributed lock. Lock keys use
    LOCK_KEY_PREFIX instead of KEY_PREFIX so they are separate from
    cache entry keys. This means deleting a cache entry never releases
    a lock, and a lock's TTL is independent of the cached value's TTL.

    @param {String} namespace
    @param {String} cache_code

    @return {String}
    ******************************************************************/
    composeLockKey: function (namespace, cache_code) {
      return CONFIG.LOCK_KEY_PREFIX + namespace + CONFIG.KEY_SEPARATOR + cache_code;
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



  return Store;

};///////////////////////////// createInterface END ////////////////////////////
