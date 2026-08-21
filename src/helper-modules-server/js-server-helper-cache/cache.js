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

  // When distributed locking is enabled, validate the store supports it
  if (CONFIG.GET_OR_FETCH_LOCK_ENABLED === true) {
    Validators.validateLockSupport(store);
  }

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
    passed to the store as a raw JavaScript object; the store adapter
    handles backend-specific serialization.

    @param {Object} instance     - Request instance for time and lifecycle
    @param {String} namespace    - Logical group for the cache entry
    @param {String} cache_code   - Specific entry identifier within the namespace
    @param {*} value             - Value to cache
    @param {Number} [ttl_seconds] - Optional lifetime in seconds. Omit for no expiry

    @return {Promise<Object>} - { success, error }
    *********************************************************************/
    set: async function (instance, namespace, cache_code, value, ttl_seconds) {

      // Programmer errors (bad args) throw synchronously - never returned as envelope
      Validators.validateIdentifiers(namespace, cache_code);
      Validators.validateOptionalTtl(ttl_seconds);

      // Delegate to the store - no serialization in the cache module
      try {
        const result = await store.set(instance, namespace, cache_code, value, ttl_seconds);

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
    (entry absent or expired) - a miss is not an error. The store
    returns a raw JavaScript object; the store adapter handled
    backend-specific deserialization.

    @param {Object} instance  - Request instance for time and lifecycle
    @param {String} namespace - Logical group for the cache entry
    @param {String} cache_code - Specific entry identifier within the namespace

    @return {Promise<Object>} - { success, value, error }
    *********************************************************************/
    get: async function (instance, namespace, cache_code) {

      // Programmer errors (bad args) throw synchronously - never returned as envelope
      Validators.validateIdentifiers(namespace, cache_code);

      // Delegate to the store - no deserialization in the cache module
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

        // A cache miss is not an error - pass the store's value straight through
        return {
          success: true,
          value: result.value,
          error: null
        };
      } catch (err) {
        Lib.Debug.debug('Cache store get threw', { namespace: namespace, cache_code: cache_code, error: err && err.message });
        return {
          success: false,
          value: null,
          error: ERRORS.CACHE_STORE_UNAVAILABLE
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

    },


    /********************************************************************
    Check whether a cache entry exists without fetching its value.
    Returns exists: true if the key is present and not expired, false
    if absent or expired. Useful for marker keys and conditional logic
    that only needs presence, not the payload.

    @param {Object} instance  - Request instance for time and lifecycle
    @param {String} namespace - Logical group for the cache entry
    @param {String} cache_code - Specific entry identifier within the namespace

    @return {Promise<Object>} - { success, exists, error }
    *********************************************************************/
    has: async function (instance, namespace, cache_code) {

      // Programmer errors (bad args) throw synchronously - never returned as envelope
      Validators.validateIdentifiers(namespace, cache_code);

      // Delegate to the store and translate any driver failure
      try {
        const result = await store.has(instance, namespace, cache_code);

        if (result.success === false) {
          Lib.Debug.debug('Cache store has failed', { namespace: namespace, cache_code: cache_code, error: result.error });
          return {
            success: false,
            exists: false,
            error: ERRORS.CACHE_STORE_UNAVAILABLE
          };
        }

        return {
          success: true,
          exists: result.exists,
          error: null
        };
      } catch (err) {
        Lib.Debug.debug('Cache store has threw', { namespace: namespace, cache_code: cache_code, error: err && err.message });
        return {
          success: false,
          exists: false,
          error: ERRORS.CACHE_STORE_UNAVAILABLE
        };
      }

    },


    /********************************************************************
    Cache-aside with optional distributed stampede protection.

    On a cache hit: returns the cached value. The fetcher is never called.
    On a cache miss:
      - If GET_OR_FETCH_LOCK_ENABLED is false: calls the fetcher, caches
        the result, returns it. Same as manual get-then-set.
      - If GET_OR_FETCH_LOCK_ENABLED is true: acquires a distributed lock
        in the store, calls the fetcher, caches the result, releases the
        lock, returns the value. Concurrent requests for the same key
        wait and retry the cache read until the value appears or the lock
        expires and they acquire it themselves.

    The fetcher is a function the caller provides. If it returns a value
    (including null), that value is cached and returned. If it throws,
    nothing is cached, the lock is released immediately, and the error is
    returned as CACHE_FETCHER_FAILED.

    This is NOT cache-through. The cache module does not know about the
    source database. The caller provides the fetcher; the cache module
    calls it on a miss.

    @param {Object} instance     - Request instance for time and lifecycle
    @param {String} namespace    - Logical group for the cache entry
    @param {String} cache_code   - Specific entry identifier within the namespace
    @param {Number} ttl_seconds  - TTL for the cached value (seconds)
    @param {Function} fetcher    - async function() -> returns any value or throws

    @return {Promise<Object>} - { success, value, error }
    *********************************************************************/
    getOrFetch: async function (instance, namespace, cache_code, ttl_seconds, fetcher) {

      // Programmer errors (bad args) throw synchronously - never returned as envelope
      Validators.validateIdentifiers(namespace, cache_code);
      Validators.validateOptionalTtl(ttl_seconds);
      if (!Lib.Utils.isFunction(fetcher)) {
        throw new TypeError('[helper-cache] getOrFetch: fetcher must be a function');
      }

      // 1. Check the cache first
      try {
        const cached = await store.get(instance, namespace, cache_code);

        if (cached.success === false) {
          Lib.Debug.debug('Cache store get (getOrFetch) failed', { namespace: namespace, cache_code: cache_code, error: cached.error });
          return {
            success: false,
            value: null,
            error: ERRORS.CACHE_STORE_UNAVAILABLE
          };
        }

        // Cache hit - return immediately, fetcher is never called
        if (cached.value !== null && !Lib.Utils.isNullOrUndefined(cached.value)) {
          return {
            success: true,
            value: cached.value,
            error: null
          };
        }
      } catch (err) {
        Lib.Debug.debug('Cache store get (getOrFetch) threw', { namespace: namespace, cache_code: cache_code, error: err && err.message });
        return {
          success: false,
          value: null,
          error: ERRORS.CACHE_STORE_UNAVAILABLE
        };
      }

      // 2. Cache miss. If lock is disabled, just fetch and cache.
      if (CONFIG.GET_OR_FETCH_LOCK_ENABLED === false) {
        return await _Cache.fetchAndStore(instance, namespace, cache_code, ttl_seconds, fetcher);
      }

      // 3. Lock enabled - try to acquire
      try {
        const lock_result = await store.setLock(
          instance, namespace, cache_code,
          { timeout_ms: CONFIG.GET_OR_FETCH_LOCK_TIMEOUT_MS }
        );

        if (lock_result.success === false) {
          Lib.Debug.debug('Cache store setLock (getOrFetch) failed', { namespace: namespace, cache_code: cache_code, error: lock_result.error });
          return {
            success: false,
            value: null,
            error: ERRORS.CACHE_STORE_UNAVAILABLE
          };
        }

        // 3a. We won the lock - fetch, cache, release
        if (lock_result.applied) {
          try {
            return await _Cache.fetchAndStore(instance, namespace, cache_code, ttl_seconds, fetcher);
          } finally {

            // Always release the lock, even if the fetcher threw
            try {
              await store.releaseLock(instance, namespace, cache_code);
            } catch (err) {
              // Lock release failure is not fatal - the lock has a TTL and will expire
              Lib.Debug.debug('Cache store releaseLock (getOrFetch) threw', { namespace: namespace, cache_code: cache_code, error: err && err.message });
            }

          }
        }
      } catch (err) {
        Lib.Debug.debug('Cache store setLock (getOrFetch) threw', { namespace: namespace, cache_code: cache_code, error: err && err.message });
        return {
          success: false,
          value: null,
          error: ERRORS.CACHE_STORE_UNAVAILABLE
        };
      }

      // 3b. We did not win the lock - wait and retry the cache read.
      //     No wait timeout: retry indefinitely until the value appears
      //     or the lock expires and we acquire it ourselves.
      while (true) {

        // Sleep for retry interval + random jitter
        const jitter = Math.random() * CONFIG.GET_OR_FETCH_LOCK_RETRY_JITTER_MS;
        const sleep_ms = CONFIG.GET_OR_FETCH_LOCK_RETRY_MS + jitter;
        await new Promise(function (resolve) {
          setTimeout(resolve, sleep_ms);
        });

        // Check if the value has appeared in the cache
        try {
          const retry = await store.get(instance, namespace, cache_code);

          if (retry.success === false) {
            Lib.Debug.debug('Cache store get (getOrFetch retry) failed', { namespace: namespace, cache_code: cache_code, error: retry.error });
            return {
              success: false,
              value: null,
              error: ERRORS.CACHE_STORE_UNAVAILABLE
            };
          }

          // Value appeared - return it
          if (retry.value !== null && !Lib.Utils.isNullOrUndefined(retry.value)) {
            return {
              success: true,
              value: retry.value,
              error: null
            };
          }
        } catch (err) {
          Lib.Debug.debug('Cache store get (getOrFetch retry) threw', { namespace: namespace, cache_code: cache_code, error: err && err.message });
          return {
            success: false,
            value: null,
            error: ERRORS.CACHE_STORE_UNAVAILABLE
          };
        }

        // Value not yet available. Try to acquire the lock ourselves.
        // If the previous lock holder crashed or was too slow, the lock
        // has expired (its TTL passed) and our setLock will succeed.
        try {
          const lock_result = await store.setLock(
            instance, namespace, cache_code,
            { timeout_ms: CONFIG.GET_OR_FETCH_LOCK_TIMEOUT_MS }
          );

          if (lock_result.success === false) {
            Lib.Debug.debug('Cache store setLock (getOrFetch retry) failed', { namespace: namespace, cache_code: cache_code, error: lock_result.error });
            return {
              success: false,
              value: null,
              error: ERRORS.CACHE_STORE_UNAVAILABLE
            };
          }

          if (lock_result.applied) {

            // We now hold the lock - become the fetcher
            try {
              return await _Cache.fetchAndStore(instance, namespace, cache_code, ttl_seconds, fetcher);
            } finally {

              try {
                await store.releaseLock(instance, namespace, cache_code);
              } catch (err) {
                Lib.Debug.debug('Cache store releaseLock (getOrFetch retry) threw', { namespace: namespace, cache_code: cache_code, error: err && err.message });
              }

            }
          }
        } catch (err) {
          Lib.Debug.debug('Cache store setLock (getOrFetch retry) threw', { namespace: namespace, cache_code: cache_code, error: err && err.message });
          return {
            success: false,
            value: null,
            error: ERRORS.CACHE_STORE_UNAVAILABLE
          };
        }

        // Lock still held by someone else - keep waiting
      }

    }

  };////////////////////////////// Public Functions END ////////////////////////



  ///////////////////////////// Private Functions START ////////////////////////
  const _Cache = {

    /********************************************************************
    Private helper: call the fetcher, store the result, return it.
    Used by getOrFetch in both the locked and unlocked paths.

    If the fetcher throws, nothing is cached and CACHE_FETCHER_FAILED
    is returned. The caller (getOrFetch) handles lock release in a
    finally block.

    If the store set fails after a successful fetch, the value is still
    returned to the caller. The cache wasn't populated, so the next
    request will miss and re-fetch. This is the right behavior: the
    caller gets their data even if the cache is temporarily down.

    @param {Object} instance     - Request instance for time and lifecycle
    @param {String} namespace    - Logical group for the cache entry
    @param {String} cache_code   - Specific entry identifier within the namespace
    @param {Number} ttl_seconds  - TTL for the cached value (seconds)
    @param {Function} fetcher    - async function() -> returns any value or throws

    @return {Promise<Object>} - { success, value, error }
    *********************************************************************/
    fetchAndStore: async function (instance, namespace, cache_code, ttl_seconds, fetcher) {

      // Call the fetcher
      let value;

      try {
        value = await fetcher();
      } catch (err) {
        Lib.Debug.debug('Cache getOrFetch fetcher threw', { namespace: namespace, cache_code: cache_code, error: err && err.message });
        return {
          success: false,
          value: null,
          error: ERRORS.CACHE_FETCHER_FAILED
        };
      }

      // Cache the result - store set failure is not fatal to the return
      try {
        await store.set(instance, namespace, cache_code, value, ttl_seconds);
      } catch (err) {
        // Store failure during set is not fatal - we still have the value
        Lib.Debug.debug('Cache getOrFetch store set threw', { namespace: namespace, cache_code: cache_code, error: err && err.message });
      }

      // Return the value to the caller regardless of whether the store set succeeded
      return {
        success: true,
        value: value,
        error: null
      };

    }

  };///////////////////////////// Private Functions END ////////////////////////


  // Return public interface
  return Cache;

};///////////////////////////// createInterface END ////////////////////////////
