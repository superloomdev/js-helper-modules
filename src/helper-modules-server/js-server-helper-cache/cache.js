// Info: Application-level cache with TTL and namespacing.
// Cache-aside pattern: the application fetches from the source database on a
// miss and populates the cache; this module never reads the source. Eight
// operations cover the lifecycle of a cached value: setCache, getCache,
// deleteCache, getOrFetchCache (cache-aside with optional stampede
// protection), getCacheExists (existence check), deleteCacheByPrefix
// (selective mass invalidation by prefix), clearCache (wipe all entries in
// a namespace), and listCacheCodes (enumerate cache_codes by prefix).
//
// Two identifier parameters - namespace and cache_code - locate every entry.
// The word "key" is avoided because it already means three different things
// across the target backends: a flat string in Valkey, a partition plus sort
// pair in DynamoDB, and `_id` in MongoDB. The cache module forwards both
// values to the store as separate parameters and composes no backend key.
//
// Storage backends are provided by standalone adapter packages. The caller
// passes the chosen ready-to-use store object directly as CONFIG.Store - no
// string dispatch inside this module. Configure and import only the adapter
// you need:
//   import cacheStoreValkey from 'helper-cache-store-valkey';
//   const Store = cacheStoreValkey(Lib, config);
//
// Compatibility: Node.js 24+
import CONFIG_DEFAULTS from './cache.config.js';
import ERRORS from './cache.errors.js';
import createValidators from './cache.validators.js';



/////////////////////////// Module-Loader START ////////////////////////////////

/********************************************************************
Factory loader. One call = one independent instance with its own
Lib, CONFIG, and store. Validates CONFIG at construction so
misconfiguration fails fast at startup, not on first request.

@param {Object} shared_libs - Lib container with Utils and Debug
@param {Object} config - Overrides merged over module config defaults

@return {Object} - Public interface for this module
*********************************************************************/
export default function loader (shared_libs, config) {

  // Dependencies for this instance
  const Lib = {
    Utils: shared_libs.Utils,
    Debug: shared_libs.Debug
  };

  // Merge overrides over defaults
  const CONFIG = Object.assign(
    {},
    CONFIG_DEFAULTS,
    config || {}
  );

  // Load the validators singleton - Lib and ERRORS injected
  const Validators = createValidators(Lib, ERRORS);

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

@param {Object} Lib        - Dependency container (Utils, Debug)
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
    setCache: async function (instance, namespace, cache_code, value, ttl_seconds) {

      // Programmer errors (bad args) throw synchronously - never returned as envelope
      Validators.validateIdentifiers(namespace, cache_code);
      Validators.validateOptionalTtl(ttl_seconds);

      // Delegate to the store - no serialization in the cache module
      try {
        const result = await store.setCache(instance, namespace, cache_code, value, ttl_seconds);

        // Store returned failure - translate and return
        if (result.success === false) {
          Lib.Debug.debug('Cache store setCache failed', { namespace: namespace, cache_code: cache_code, error: result.error });
          return {
            success: false,
            error: ERRORS.CACHE_STORE_UNAVAILABLE
          };
        }

        // Success - return
        return {
          success: true,
          error: null
        };
      } catch (err) {
        // Store threw - translate and return
        Lib.Debug.debug('Cache store setCache threw', { namespace: namespace, cache_code: cache_code, error: err && err.message });
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
    getCache: async function (instance, namespace, cache_code) {

      // Programmer errors (bad args) throw synchronously - never returned as envelope
      Validators.validateIdentifiers(namespace, cache_code);

      // Delegate to the store - no deserialization in the cache module
      try {
        const result = await store.getCache(instance, namespace, cache_code);

        // Store returned failure - translate and return
        if (result.success === false) {
          Lib.Debug.debug('Cache store getCache failed', { namespace: namespace, cache_code: cache_code, error: result.error });
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
        // Store threw - translate and return
        Lib.Debug.debug('Cache store getCache threw', { namespace: namespace, cache_code: cache_code, error: err && err.message });
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
    deleteCache: async function (instance, namespace, cache_code) {

      // Programmer errors (bad args) throw synchronously - never returned as envelope
      Validators.validateIdentifiers(namespace, cache_code);

      // Delegate to the store and translate any driver failure
      try {
        const result = await store.deleteCache(instance, namespace, cache_code);

        // Store returned failure - translate and return
        if (result.success === false) {
          Lib.Debug.debug('Cache store deleteCache failed', { namespace: namespace, cache_code: cache_code, error: result.error });
          return {
            success: false,
            error: ERRORS.CACHE_STORE_UNAVAILABLE
          };
        }

        // Success - return
        return {
          success: true,
          error: null
        };
      } catch (err) {
        // Store threw - translate and return
        Lib.Debug.debug('Cache store deleteCache threw', { namespace: namespace, cache_code: cache_code, error: err && err.message });
        return {
          success: false,
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
    wait and retry the cache read until the value appears, the lock
    expires and they acquire it themselves, or the wait timeout
    (GET_OR_FETCH_LOCK_WAIT_TIMEOUT_MS) is exceeded.

    The fetcher is a function the caller provides. If it returns a value
    (including null), that value is cached and returned. If it throws,
    nothing is cached, the lock is released immediately, and the error is
    returned as CACHE_FETCHER_FAILED.

    This is NOT cache-through. The cache module does not know about the
    source database. The caller provides the fetcher; the cache module
    calls it on a miss.

    @param {Object} instance      - Request instance for time and lifecycle
    @param {String} namespace     - Logical group for the cache entry
    @param {String} cache_code    - Specific entry identifier within the namespace
    @param {Number} [ttl_seconds] - Optional TTL for the cached value (seconds)
    @param {Function} fetcher     - async function() -> returns any value or throws

    @return {Promise<Object>} - { success, value, error }
    *********************************************************************/
    getOrFetchCache: async function (instance, namespace, cache_code, ttl_seconds, fetcher) {

      // Programmer errors (bad args) throw synchronously - never returned as envelope
      Validators.validateIdentifiers(namespace, cache_code);
      Validators.validateOptionalTtl(ttl_seconds);
      if (!Lib.Utils.isFunction(fetcher)) {
        throw new TypeError('[helper-cache] getOrFetchCache: fetcher must be a function');
      }

      // 1. Check the cache first
      try {
        const cached = await store.getCache(instance, namespace, cache_code);

        // Store returned failure - translate and return
        if (cached.success === false) {
          Lib.Debug.debug('Cache store getCache (getOrFetchCache) failed', { namespace: namespace, cache_code: cache_code, error: cached.error });
          return {
            success: false,
            value: null,
            error: ERRORS.CACHE_STORE_UNAVAILABLE
          };
        }

        // Cache hit - return immediately, fetcher is never called
        if (!Lib.Utils.isNullOrUndefined(cached.value)) {
          return {
            success: true,
            value: cached.value,
            error: null
          };
        }
      } catch (err) {
        // Store threw - translate and return
        Lib.Debug.debug('Cache store getCache (getOrFetchCache) threw', { namespace: namespace, cache_code: cache_code, error: err && err.message });
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
        const lock_result = await store.setCacheLock(
          instance, namespace, cache_code,
          { timeout_ms: CONFIG.GET_OR_FETCH_LOCK_TIMEOUT_MS }
        );

        // Store returned failure - translate and return
        if (lock_result.success === false) {
          Lib.Debug.debug('Cache store setCacheLock (getOrFetchCache) failed', { namespace: namespace, cache_code: cache_code, error: lock_result.error });
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
              await store.releaseCacheLock(instance, namespace, cache_code);
            } catch (err) {
              // Lock release failure is not fatal - the lock has a TTL and will expire
              Lib.Debug.debug('Cache store releaseCacheLock (getOrFetchCache) threw', { namespace: namespace, cache_code: cache_code, error: err && err.message });
            }

          }
        }
      } catch (err) {
        // Store threw - translate and return
        Lib.Debug.debug('Cache store setCacheLock (getOrFetchCache) threw', { namespace: namespace, cache_code: cache_code, error: err && err.message });
        return {
          success: false,
          value: null,
          error: ERRORS.CACHE_STORE_UNAVAILABLE
        };
      }

      // 3b. We did not win the lock - wait and retry the cache read.
      //     The retry loop is bounded by GET_OR_FETCH_LOCK_WAIT_TIMEOUT_MS.
      return await _Cache.waitForLockAndFetch(instance, namespace, cache_code, ttl_seconds, fetcher);

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
    getCacheExists: async function (instance, namespace, cache_code) {

      // Programmer errors (bad args) throw synchronously - never returned as envelope
      Validators.validateIdentifiers(namespace, cache_code);

      // Delegate to the store and translate any driver failure
      try {
        const result = await store.getCacheExists(instance, namespace, cache_code);

        // Store returned failure - translate and return
        if (result.success === false) {
          Lib.Debug.debug('Cache store getCacheExists failed', { namespace: namespace, cache_code: cache_code, error: result.error });
          return {
            success: false,
            exists: false,
            error: ERRORS.CACHE_STORE_UNAVAILABLE
          };
        }

        // Success - return the existence flag
        return {
          success: true,
          exists: result.exists,
          error: null
        };
      } catch (err) {
        // Store threw - translate and return
        Lib.Debug.debug('Cache store getCacheExists threw', { namespace: namespace, cache_code: cache_code, error: err && err.message });
        return {
          success: false,
          exists: false,
          error: ERRORS.CACHE_STORE_UNAVAILABLE
        };
      }

    },


    /********************************************************************
    Selective mass invalidation. Remove all entries in namespace whose
    cache_code starts with cache_code_prefix. The prefix is required -
    use clearCache to wipe every entry in a namespace. Entries in other
    namespaces are never touched.

    @param {Object} instance          - Request instance for time and lifecycle
    @param {String} namespace         - Logical group for the cache entries
    @param {String} cache_code_prefix - Required prefix. Only entries whose cache_code starts with this are removed

    @return {Promise<Object>} - { success, deleted_count, error }
    *********************************************************************/
    deleteCacheByPrefix: async function (instance, namespace, cache_code_prefix) {

      // Programmer errors (bad args) throw synchronously - never returned as envelope
      Validators.validateNamespace(namespace);
      Validators.validateRequiredPrefix(cache_code_prefix);

      // Delegate to the store and translate any driver failure
      try {
        const result = await store.deleteCacheByPrefix(instance, namespace, cache_code_prefix);

        // Store returned failure - translate and return
        if (result.success === false) {
          Lib.Debug.debug('Cache store deleteCacheByPrefix failed', { namespace: namespace, prefix: cache_code_prefix, error: result.error });
          return {
            success: false,
            deleted_count: 0,
            error: ERRORS.CACHE_STORE_UNAVAILABLE
          };
        }

        // Success - return the count
        return {
          success: true,
          deleted_count: result.deleted_count,
          error: null
        };
      } catch (err) {
        // Store threw - translate and return
        Lib.Debug.debug('Cache store deleteCacheByPrefix threw', { namespace: namespace, prefix: cache_code_prefix, error: err && err.message });
        return {
          success: false,
          deleted_count: 0,
          error: ERRORS.CACHE_STORE_UNAVAILABLE
        };
      }

    },


    /********************************************************************
    Wipe every entry in a namespace. Use deleteCacheByPrefix for
    selective removal by prefix. Entries in other namespaces are never
    touched.

    @param {Object} instance  - Request instance for time and lifecycle
    @param {String} namespace - Logical group for the cache entries

    @return {Promise<Object>} - { success, deleted_count, error }
    *********************************************************************/
    clearCache: async function (instance, namespace) {

      // Programmer errors (bad args) throw synchronously - never returned as envelope
      Validators.validateNamespace(namespace);

      // Delegate to the store and translate any driver failure
      try {
        const result = await store.clearCache(instance, namespace);

        // Store returned failure - translate and return
        if (result.success === false) {
          Lib.Debug.debug('Cache store clearCache failed', { namespace: namespace, error: result.error });
          return {
            success: false,
            deleted_count: 0,
            error: ERRORS.CACHE_STORE_UNAVAILABLE
          };
        }

        // Success - return the count
        return {
          success: true,
          deleted_count: result.deleted_count,
          error: null
        };
      } catch (err) {
        // Store threw - translate and return
        Lib.Debug.debug('Cache store clearCache threw', { namespace: namespace, error: err && err.message });
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
    listCacheCodes: async function (instance, namespace, cache_code_prefix) {

      // Programmer errors (bad args) throw synchronously - never returned as envelope
      Validators.validateNamespace(namespace);
      Validators.validateOptionalPrefix(cache_code_prefix);

      // Delegate to the store and translate any driver failure
      try {
        const result = await store.listCacheCodes(instance, namespace, cache_code_prefix);

        // Store returned failure - translate and return
        if (result.success === false) {
          Lib.Debug.debug('Cache store listCacheCodes failed', { namespace: namespace, prefix: cache_code_prefix, error: result.error });
          return {
            success: false,
            cache_codes: [],
            error: ERRORS.CACHE_STORE_UNAVAILABLE
          };
        }

        // Success - return the list
        return {
          success: true,
          cache_codes: result.cache_codes,
          error: null
        };
      } catch (err) {
        // Store threw - translate and return
        Lib.Debug.debug('Cache store listCacheCodes threw', { namespace: namespace, prefix: cache_code_prefix, error: err && err.message });
        return {
          success: false,
          cache_codes: [],
          error: ERRORS.CACHE_STORE_UNAVAILABLE
        };
      }

    }

  };////////////////////////////// Public Functions END ////////////////////////



  ///////////////////////////// Private Functions START ////////////////////////
  const _Cache = {


    /********************************************************************
    Private helper: call the fetcher, store the result, return it.
    Used by getOrFetchCache in both the locked and unlocked paths.

    If the fetcher throws, nothing is cached and CACHE_FETCHER_FAILED
    is returned. The caller (getOrFetchCache) handles lock release in a
    finally block.

    If the store set fails after a successful fetch (either returns
    {success: false} or throws), the value is still returned to the
    caller. The cache wasn't populated, so the next request will miss
    and re-fetch. This is the right behavior: the caller gets their
    data even if the cache is temporarily down.

    @param {Object} instance      - Request instance for time and lifecycle
    @param {String} namespace     - Logical group for the cache entry
    @param {String} cache_code    - Specific entry identifier within the namespace
    @param {Number} ttl_seconds   - TTL for the cached value (seconds)
    @param {Function} fetcher     - async function() -> returns any value or throws

    @return {Promise<Object>} - { success, value, error }
    *********************************************************************/
    fetchAndStore: async function (instance, namespace, cache_code, ttl_seconds, fetcher) {

      // Call the fetcher
      let value;

      try {
        value = await fetcher();
      } catch (err) {
        // Fetcher threw - nothing cached, return failure
        Lib.Debug.debug('Cache getOrFetchCache fetcher threw', { namespace: namespace, cache_code: cache_code, error: err && err.message });
        return {
          success: false,
          value: null,
          error: ERRORS.CACHE_FETCHER_FAILED
        };
      }

      // Cache the result - store set failure is not fatal to the return
      try {
        const result = await store.setCache(instance, namespace, cache_code, value, ttl_seconds);

        // Store returned failure - log but still return the value
        if (result.success === false) {
          Lib.Debug.debug('Cache getOrFetchCache store setCache failed', { namespace: namespace, cache_code: cache_code, error: result.error });
        }
      } catch (err) {
        // Store threw during set - not fatal, we still have the value
        Lib.Debug.debug('Cache getOrFetchCache store setCache threw', { namespace: namespace, cache_code: cache_code, error: err && err.message });
      }

      // Return the value to the caller regardless of whether the store set succeeded
      return {
        success: true,
        value: value,
        error: null
      };

    },


    /********************************************************************
    Private helper: wait for a lock holder to finish, then either return
    the cached value or acquire the lock and become the fetcher. Called
    by getOrFetchCache when the initial lock acquisition did not win.

    The retry loop is bounded by GET_OR_FETCH_LOCK_WAIT_TIMEOUT_MS.
    When the total elapsed wait exceeds the timeout, returns
    CACHE_LOCK_WAIT_TIMEOUT so the caller sees a data-access failure
    rather than hanging indefinitely.

    Each iteration:
    1. Sleep for retry interval + random jitter
    2. Check if the value appeared in the cache - return it if so
    3. Try to acquire the lock - if won, double-check the cache,
       then fetch or return the appeared value
    4. If the lock is still held, loop back (unless timeout exceeded)

    @param {Object} instance      - Request instance for time and lifecycle
    @param {String} namespace     - Logical group for the cache entry
    @param {String} cache_code    - Specific entry identifier within the namespace
    @param {Number} ttl_seconds   - TTL for the cached value (seconds)
    @param {Function} fetcher     - async function() -> returns any value or throws

    @return {Promise<Object>} - { success, value, error }
    *********************************************************************/
    waitForLockAndFetch: async function (instance, namespace, cache_code, ttl_seconds, fetcher) {

      // Track total elapsed wait time to bound the retry loop
      const wait_start = Lib.Utils.getUnixTimeInMilliSeconds();
      const wait_timeout_ms = CONFIG.GET_OR_FETCH_LOCK_WAIT_TIMEOUT_MS;

      // Retry loop: poll the cache, try to acquire the lock, or time out
      while (true) {

        // Check if the wait timeout has been exceeded
        if (Lib.Utils.getUnixTimeInMilliSeconds() - wait_start >= wait_timeout_ms) {

          // Wait timeout exceeded - return failure
          Lib.Debug.debug('Cache getOrFetchCache lock wait timed out', { namespace: namespace, cache_code: cache_code, wait_timeout_ms: wait_timeout_ms });
          return {
            success: false,
            value: null,
            error: ERRORS.CACHE_LOCK_WAIT_TIMEOUT
          };
        }

        // 1. Sleep for retry interval + random jitter
        const jitter = Math.random() * CONFIG.GET_OR_FETCH_LOCK_RETRY_JITTER_MS;
        const sleep_ms = CONFIG.GET_OR_FETCH_LOCK_RETRY_MS + jitter;
        await new Promise(function (resolve) {
          setTimeout(resolve, sleep_ms);
        });

        // 2. Check if the value has appeared in the cache
        try {
          const retry = await store.getCache(instance, namespace, cache_code);

          // Store returned failure - translate and return
          if (retry.success === false) {
            Lib.Debug.debug('Cache store getCache (getOrFetchCache retry) failed', { namespace: namespace, cache_code: cache_code, error: retry.error });
            return {
              success: false,
              value: null,
              error: ERRORS.CACHE_STORE_UNAVAILABLE
            };
          }

          // Value appeared - return it
          if (!Lib.Utils.isNullOrUndefined(retry.value)) {
            return {
              success: true,
              value: retry.value,
              error: null
            };
          }
        } catch (err) {
          // Store threw - translate and return
          Lib.Debug.debug('Cache store getCache (getOrFetchCache retry) threw', { namespace: namespace, cache_code: cache_code, error: err && err.message });
          return {
            success: false,
            value: null,
            error: ERRORS.CACHE_STORE_UNAVAILABLE
          };
        }

        // 3. Value not yet available. Try to acquire the lock ourselves.
        //    If the previous lock holder crashed or was too slow, the lock
        //    has expired (its TTL passed) and our setCacheLock will succeed.
        try {
          const lock_result = await store.setCacheLock(
            instance, namespace, cache_code,
            { timeout_ms: CONFIG.GET_OR_FETCH_LOCK_TIMEOUT_MS }
          );

          // Store returned failure - translate and return
          if (lock_result.success === false) {
            Lib.Debug.debug('Cache store setCacheLock (getOrFetchCache retry) failed', { namespace: namespace, cache_code: cache_code, error: lock_result.error });
            return {
              success: false,
              value: null,
              error: ERRORS.CACHE_STORE_UNAVAILABLE
            };
          }

          // 3a. We now hold the lock
          if (lock_result.applied) {

            // We now hold the lock - but the previous lock holder may have
            // stored the value between our cache check and our lock acquisition.
            // Double-check the cache before becoming the fetcher to avoid a
            // redundant fetch (double-check locking pattern).
            try {
              const recheck = await store.getCache(instance, namespace, cache_code);

              // Value appeared - release the lock and return it
              if (recheck.success === true && !Lib.Utils.isNullOrUndefined(recheck.value)) {

                try {
                  await store.releaseCacheLock(instance, namespace, cache_code);
                } catch (err) {
                  // Lock release failure is not fatal - the lock has a TTL and will expire
                  Lib.Debug.debug('Cache store releaseCacheLock (getOrFetchCache recheck) threw', { namespace: namespace, cache_code: cache_code, error: err && err.message });
                }

                return {
                  success: true,
                  value: recheck.value,
                  error: null
                };
              }
            } catch (err) {
              // Store threw during recheck - log and fall through to fetch
              Lib.Debug.debug('Cache store getCache (getOrFetchCache recheck) threw', { namespace: namespace, cache_code: cache_code, error: err && err.message });
            }

            // 3b. Still a miss - become the fetcher
            try {
              return await _Cache.fetchAndStore(instance, namespace, cache_code, ttl_seconds, fetcher);
            } finally {

              // Always release the lock, even if the fetcher threw
              try {
                await store.releaseCacheLock(instance, namespace, cache_code);
              } catch (err) {
                // Lock release failure is not fatal - the lock has a TTL and will expire
                Lib.Debug.debug('Cache store releaseCacheLock (getOrFetchCache retry) threw', { namespace: namespace, cache_code: cache_code, error: err && err.message });
              }

            }
          }
        } catch (err) {
          // Store threw - translate and return
          Lib.Debug.debug('Cache store setCacheLock (getOrFetchCache retry) threw', { namespace: namespace, cache_code: cache_code, error: err && err.message });
          return {
            success: false,
            value: null,
            error: ERRORS.CACHE_STORE_UNAVAILABLE
          };
        }

        // 4. Lock still held by someone else - keep waiting
      }

    }

  };///////////////////////////// Private Functions END ////////////////////////


  // Return public interface
  return Cache;

};///////////////////////////// createInterface END ////////////////////////////
