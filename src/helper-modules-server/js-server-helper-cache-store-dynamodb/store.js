// Info: DynamoDB store adapter for helper-cache. Fully independent
// module that owns its own CONFIG, ERRORS, and Validators. Uses a
// single-table design with partition key = namespace and sort key =
// cache_code, giving O(1) get/set/delete and partition-scoped clear/list.
//
// The cache module forwards namespace and cache_code as separate
// parameters; this adapter maps them to the DynamoDB primary key
// (PARTITION_KEY, SORT_KEY). No key flattening or separator is needed
// because DynamoDB has a native composite key.
//
// TTL is handled via DynamoDB native TTL on the EXPIRY_FIELD attribute.
// The adapter writes a Unix epoch timestamp (seconds) to EXPIRY_FIELD
// when ttl_seconds is provided. DynamoDB's background sweeper deletes
// expired items within ~48 hours. For immediate expiry correctness,
// the adapter also checks expiry on read and treats expired items as
// misses (the item may still be physically present before the sweeper
// runs).
//
// clear and list use Query with begins_with on the sort key, scoped to
// one partition key (namespace). This is O(N) over the partition, not
// the entire table - a significant advantage over the flat-keyspace
// Valkey adapter.
//
// Standard factory shape: receives shared_libs, picks DynamoDB driver as
// Lib.DynamoDB (capability-named key, not vendor-named).
//
// Store contract (identical shape across all adapters):
//   - get(instance, namespace, cache_code)                       -> { success, value, error }
//   - set(instance, namespace, cache_code, value, ttl_seconds)   -> { success, error }
//   - delete(instance, namespace, cache_code)                    -> { success, error }
//   - clear(instance, namespace, cache_code_prefix?)             -> { success, deleted_count, error }
//   - list(instance, namespace, cache_code_prefix?)              -> { success, cache_codes, error }
//   - has(instance, namespace, cache_code)                       -> { success, exists, error }
//   - setLock(instance, namespace, cache_code, options)          -> { success, applied, error }
//   - releaseLock(instance, namespace, cache_code)               -> { success, error }
//
// Serialization: this adapter owns JSON.stringify on set and JSON.parse on
// get. The cache module passes raw JavaScript objects; the adapter serializes
// before handing to Lib.DynamoDB and deserializes before returning to the
// cache module. DynamoDB's Document Client stores the JSON string as a
// single string attribute (VALUE_FIELD).
//
// Lock keys use a separate sort-key prefix (LOCK_SORT_KEY_PREFIX) within
// the same table and partition, so lock items are distinct from cache
// entry items. setLock uses Lib.DynamoDB.writeRecordIfNotExists (atomic
// PutItem with attribute_not_exists condition) with an expiry timestamp.

'use strict';



/////////////////////////// Module-Loader START ////////////////////////////////

/********************************************************************
Thin loader. Picks dependencies from the injected container, merges
config over defaults, validates config via the Validators singleton,
then delegates to createInterface. Each call returns an independent
Store instance.

@param {Object} shared_libs - Dependency container (Utils, Debug, DynamoDB)
@param {Object} config      - Overrides merged over adapter config defaults

@return {Object} - Store interface (8 methods: get, set, delete, clear, list, has, setLock, releaseLock)
*********************************************************************/
module.exports = function loader (shared_libs, config) {

  // Dependencies for this instance - by reference from the shared container
  const Lib = {
    Utils: shared_libs.Utils,
    Debug: shared_libs.Debug,
    DynamoDB: shared_libs.DynamoDB
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

@param {Object} Lib        - Dependency container (Utils, Debug, DynamoDB)
@param {Object} CONFIG     - Merged adapter configuration (validated)
@param {Object} ERRORS     - Frozen error catalog
@param {Object} Validators - Validators singleton (Lib + ERRORS injected)

@return {Object} - Store interface (8 methods: get, set, delete, clear, list, has, setLock, releaseLock)
*********************************************************************/
const createInterface = function (Lib, CONFIG, ERRORS, Validators) { // eslint-disable-line no-unused-vars

  //////////////////////////// Private Functions START //////////////////////////
  const _Store = {

    /******************************************************************
    Build the DynamoDB primary key object for one cache entry.

    @param {String} namespace
    @param {String} cache_code

    @return {Object} - { [PARTITION_KEY]: namespace, [SORT_KEY]: cache_code }
    ******************************************************************/
    composeKey: function (namespace, cache_code) {
      const key = {};
      key[CONFIG.PARTITION_KEY] = namespace;
      key[CONFIG.SORT_KEY] = cache_code;
      return key;
    },


    /******************************************************************
    Build the DynamoDB primary key object for a distributed lock.
    Lock items share the same partition key (namespace) as cache
    entries but use a distinct sort-key prefix so they do not collide
    with cache_code values.

    @param {String} namespace
    @param {String} cache_code

    @return {Object} - { [PARTITION_KEY]: namespace, [SORT_KEY]: LOCK_SORT_KEY_PREFIX + cache_code }
    ******************************************************************/
    composeLockKey: function (namespace, cache_code) {
      const key = {};
      key[CONFIG.PARTITION_KEY] = namespace;
      key[CONFIG.SORT_KEY] = CONFIG.LOCK_SORT_KEY_PREFIX + cache_code;
      return key;
    },


    /******************************************************************
    Build the full DynamoDB item for a cache entry. The item includes
    the primary key attributes, the serialized value, and the expiry
    timestamp (when ttl_seconds is provided).

    @param {String} namespace
    @param {String} cache_code
    @param {String} serialized_value - JSON string
    @param {Number|undefined} expiry_seconds - Unix epoch seconds, or undefined for no expiry

    @return {Object} - DynamoDB item
    ******************************************************************/
    composeItem: function (namespace, cache_code, serialized_value, expiry_seconds) {
      const item = _Store.composeKey(namespace, cache_code);
      item[CONFIG.VALUE_FIELD] = serialized_value;
      if (!Lib.Utils.isNullOrUndefined(expiry_seconds)) {
        item[CONFIG.EXPIRY_FIELD] = expiry_seconds;
      }
      return item;
    },


    /******************************************************************
    Build the full DynamoDB item for a distributed lock. The item
    includes the lock primary key and the expiry timestamp.

    @param {String} namespace
    @param {String} cache_code
    @param {Number} expiry_seconds - Unix epoch seconds

    @return {Object} - DynamoDB item
    ******************************************************************/
    composeLockItem: function (namespace, cache_code, expiry_seconds) {
      const item = _Store.composeLockKey(namespace, cache_code);
      item[CONFIG.EXPIRY_FIELD] = expiry_seconds;
      return item;
    },


    /******************************************************************
    Check whether a retrieved item has expired. Compares the
    EXPIRY_FIELD attribute against the current instance time. Returns
    true when the item has expired (even if the DynamoDB sweeper has
    not yet deleted it).

    @param {Object} item    - DynamoDB item
    @param {Object} instance - Request instance (for current time)

    @return {Boolean} - true if expired, false otherwise
    ******************************************************************/
    isExpired: function (item, instance) {
      if (Lib.Utils.isNullOrUndefined(item[CONFIG.EXPIRY_FIELD])) {
        return false;
      }
      const now_seconds = instance.time;
      return item[CONFIG.EXPIRY_FIELD] <= now_seconds;
    },


    /******************************************************************
    Log a driver failure at debug level. The driver's own error type
    and message never leak through to the caller; only the adapter's
    own SERVICE_UNAVAILABLE envelope is returned.

    @param {String} method        - Public method name
    @param {Object} driver_error  - Error object from Lib.DynamoDB

    @return {void}
    ******************************************************************/
    logDriverFailure: function (method, driver_error) {
      Lib.Debug.debug('[helper-cache-store-dynamodb] ' + method + ' failed', {
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
    miss (key absent or expired). The stored JSON string is
    deserialized to a JavaScript object before being returned to the
    cache module. Delegates to Lib.DynamoDB.getRecord.

    If the item exists but its EXPIRY_FIELD timestamp has passed, the
    adapter treats it as a miss (the DynamoDB TTL sweeper may not have
    deleted it yet) and deletes the stale item.

    @param {Object} instance   - Request instance
    @param {String} namespace  - Logical group for the cache entry
    @param {String} cache_code - Specific entry identifier within the namespace

    @return {Promise<Object>} - { success, value, error }
    *********************************************************************/
    get: async function (instance, namespace, cache_code) {

      // Fetch the item by composite primary key with strongly consistent read
      // (cache reads must see the most recent write, especially in getOrFetch
      // double-check locking where a concurrent caller may have just stored the value)
      const result = await Lib.DynamoDB.getRecord(
        instance,
        CONFIG.TABLE_NAME,
        _Store.composeKey(namespace, cache_code),
        { consistentRead: true }
      );

      // Return a service error if the driver call failed
      if (result.success === false) {
        _Store.logDriverFailure('get', result.error);
        return {
          success: false,
          value: null,
          error: ERRORS.SERVICE_UNAVAILABLE
        };
      }

      // A miss is not an error - pass null straight through
      if (result.item === null || result.item === undefined) {
        return {
          success: true,
          value: null,
          error: null
        };
      }

      // Check whether the item has expired (DynamoDB TTL sweeper may lag)
      if (_Store.isExpired(result.item, instance)) {

        // Delete the stale item so subsequent reads do not pay the cost
        await Lib.DynamoDB.deleteRecord(
          instance,
          CONFIG.TABLE_NAME,
          _Store.composeKey(namespace, cache_code)
        );

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
          value: JSON.parse(result.item[CONFIG.VALUE_FIELD]),
          error: null
        };
      } catch (err) {
        Lib.Debug.debug('[helper-cache-store-dynamodb] get deserialization failed', {
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
    it to JSON before handing it to Lib.DynamoDB. ttl_seconds is
    positional and optional - when absent, the item has no expiry.
    Delegates to Lib.DynamoDB.writeRecord (upsert).

    @param {Object} instance    - Request instance
    @param {String} namespace   - Logical group for the cache entry
    @param {String} cache_code  - Specific entry identifier within the namespace
    @param {*} value            - Raw JavaScript value to cache
    @param {Number} ttl_seconds - Optional lifetime in seconds

    @return {Promise<Object>} - { success, error }
    *********************************************************************/
    set: async function (instance, namespace, cache_code, value, ttl_seconds) {

      // Serialize the value to JSON - this adapter owns serialization
      let serialized;

      try {
        serialized = JSON.stringify(value);
      } catch (err) {
        Lib.Debug.debug('[helper-cache-store-dynamodb] set serialization failed', {
          namespace: namespace,
          cache_code: cache_code,
          error: err && err.message
        });
        return {
          success: false,
          error: ERRORS.SERIALIZATION_FAILED
        };
      }

      // Compute the expiry timestamp in Unix epoch seconds (when TTL is provided)
      let expiry_seconds;
      if (!Lib.Utils.isNullOrUndefined(ttl_seconds)) {
        expiry_seconds = instance.time + ttl_seconds;
      }

      // Build the DynamoDB item and write it (upsert)
      const item = _Store.composeItem(namespace, cache_code, serialized, expiry_seconds);
      const result = await Lib.DynamoDB.writeRecord(instance, CONFIG.TABLE_NAME, item);

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
    Idempotent delete of one cache entry. Delegates to
    Lib.DynamoDB.deleteRecord. A missing item is still success.

    @param {Object} instance   - Request instance
    @param {String} namespace  - Logical group for the cache entry
    @param {String} cache_code - Specific entry identifier within the namespace

    @return {Promise<Object>} - { success, error }
    *********************************************************************/
    delete: async function (instance, namespace, cache_code) {

      // Delete the item by its composite primary key
      const result = await Lib.DynamoDB.deleteRecord(
        instance,
        CONFIG.TABLE_NAME,
        _Store.composeKey(namespace, cache_code)
      );

      // Return a service error if the driver call failed
      if (result.success === false) {
        _Store.logDriverFailure('delete', result.error);
        return {
          success: false,
          error: ERRORS.SERVICE_UNAVAILABLE
        };
      }

      // Report success - idempotent
      return {
        success: true,
        error: null
      };

    },


    /********************************************************************
    Mass invalidation. Query for all items in the namespace matching
    the cache_code_prefix (or all items in the namespace when no
    prefix is given), then batch-delete them. Short-circuits on zero
    matches. O(N) over the partition, not the entire table.

    @param {Object} instance        - Request instance
    @param {String} namespace       - Logical group for the cache entries
    @param {String} cache_code_prefix - Optional prefix. Omit to clear the whole namespace

    @return {Promise<Object>} - { success, deleted_count, error }
    *********************************************************************/
    clear: async function (instance, namespace, cache_code_prefix) {

      // Build the query parameters - when a prefix is given, use begins_with
      // on the sort key; when no prefix is given, query by partition key only
      // (DynamoDB rejects empty string values for key attributes in begins_with)
      const query_params = {
        pk: namespace,
        pkName: CONFIG.PARTITION_KEY
      };

      if (cache_code_prefix) {
        query_params.skCondition = 'begins_with(' + CONFIG.SORT_KEY + ', :sk)';
        query_params.skValues = { ':sk': cache_code_prefix };
      }

      // Query for all items in the namespace matching the prefix
      const query_result = await Lib.DynamoDB.query(
        instance,
        CONFIG.TABLE_NAME,
        query_params
      );

      // Return a service error if the query failed
      if (query_result.success === false) {
        _Store.logDriverFailure('clear (query)', query_result.error);
        return {
          success: false,
          deleted_count: 0,
          error: ERRORS.SERVICE_UNAVAILABLE
        };
      }

      // Short-circuit on zero matches - no delete roundtrip needed
      if (query_result.items.length === 0) {
        return {
          success: true,
          deleted_count: 0,
          error: null
        };
      }

      // Filter out lock items - clear operates on cache entries only,
      // not on distributed lock items which share the same partition
      const cache_items = query_result.items.filter(function (item) {
        return item[CONFIG.SORT_KEY].indexOf(CONFIG.LOCK_SORT_KEY_PREFIX) !== 0;
      });

      // Short-circuit if only lock items were found
      if (cache_items.length === 0) {
        return {
          success: true,
          deleted_count: 0,
          error: null
        };
      }

      // Build the batch delete key map from the queried cache items
      const keysByTable = {};
      keysByTable[CONFIG.TABLE_NAME] = cache_items.map(function (item) {
        const key = {};
        key[CONFIG.PARTITION_KEY] = item[CONFIG.PARTITION_KEY];
        key[CONFIG.SORT_KEY] = item[CONFIG.SORT_KEY];
        return key;
      });

      // Delete all matched items in one (or more, if chunked) batch call
      const delete_result = await Lib.DynamoDB.batchDeleteRecords(instance, keysByTable);

      // Return a service error if the batch delete failed
      if (delete_result.success === false) {
        _Store.logDriverFailure('clear (batchDelete)', delete_result.error);
        return {
          success: false,
          deleted_count: 0,
          error: ERRORS.SERVICE_UNAVAILABLE
        };
      }

      // Report success with the count of deleted cache items
      return {
        success: true,
        deleted_count: cache_items.length,
        error: null
      };

    },


    /********************************************************************
    List cache_codes in the namespace matching the prefix. Query for
    all items in the namespace matching the sort-key prefix, extract
    the SORT_KEY attribute from each, return the cache_codes. O(N)
    over the partition, not the entire table.

    @param {Object} instance        - Request instance
    @param {String} namespace       - Logical group for the cache entries
    @param {String} cache_code_prefix - Optional prefix. Omit to list the whole namespace

    @return {Promise<Object>} - { success, cache_codes, error }
    *********************************************************************/
    list: async function (instance, namespace, cache_code_prefix) {

      // Build the query parameters - when a prefix is given, use begins_with
      // on the sort key; when no prefix is given, query by partition key only
      // (DynamoDB rejects empty string values for key attributes in begins_with)
      const query_params = {
        pk: namespace,
        pkName: CONFIG.PARTITION_KEY
      };

      if (cache_code_prefix) {
        query_params.skCondition = 'begins_with(' + CONFIG.SORT_KEY + ', :sk)';
        query_params.skValues = { ':sk': cache_code_prefix };
      }

      // Query for all items in the namespace matching the prefix
      const query_result = await Lib.DynamoDB.query(
        instance,
        CONFIG.TABLE_NAME,
        query_params
      );

      // Return a service error if the query failed
      if (query_result.success === false) {
        _Store.logDriverFailure('list (query)', query_result.error);
        return {
          success: false,
          cache_codes: [],
          error: ERRORS.SERVICE_UNAVAILABLE
        };
      }

      // Extract the sort key (cache_code) from each item, excluding lock items
      const cache_codes = query_result.items
        .filter(function (item) {
          return item[CONFIG.SORT_KEY].indexOf(CONFIG.LOCK_SORT_KEY_PREFIX) !== 0;
        })
        .map(function (item) {
          return item[CONFIG.SORT_KEY];
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
    Delegates to Lib.DynamoDB.getRecord and checks for item presence
    and expiry. Returns exists: true if the item is present and not
    expired, false otherwise.

    DynamoDB does not have a native "exists" check without fetching
    the item. A projection expression could reduce the data transfer,
    but the driver's getRecord does not support projections. The full
    item is fetched; the value is simply not deserialized.

    @param {Object} instance   - Request instance
    @param {String} namespace  - Logical group for the cache entry
    @param {String} cache_code - Specific entry identifier within the namespace

    @return {Promise<Object>} - { success, exists, error }
    *********************************************************************/
    has: async function (instance, namespace, cache_code) {

      // Fetch the item to check existence with strongly consistent read
      // (same rationale as get: must see the most recent write)
      const result = await Lib.DynamoDB.getRecord(
        instance,
        CONFIG.TABLE_NAME,
        _Store.composeKey(namespace, cache_code),
        { consistentRead: true }
      );

      // Return a service error if the driver call failed
      if (result.success === false) {
        _Store.logDriverFailure('has', result.error);
        return {
          success: false,
          exists: false,
          error: ERRORS.SERVICE_UNAVAILABLE
        };
      }

      // Item does not exist
      if (result.item === null || result.item === undefined) {
        return {
          success: true,
          exists: false,
          error: null
        };
      }

      // Check whether the item has expired
      if (_Store.isExpired(result.item, instance)) {
        return {
          success: true,
          exists: false,
          error: null
        };
      }

      // Item exists and has not expired
      return {
        success: true,
        exists: true,
        error: null
      };

    },


    /********************************************************************
    Acquire a distributed lock for a cache entry. Uses
    Lib.DynamoDB.writeRecordIfNotExists (atomic PutItem with
    attribute_not_exists condition) with an expiry timestamp derived
    from options.timeout_ms. The lock key is a separate sort key
    (LOCK_SORT_KEY_PREFIX + cache_code) within the same partition,
    so lock items do not collide with cache entry items.

    Returns applied: true if this caller acquired the lock, false if
    another caller already holds it. applied: false is not an error.

    The lock auto-expires via DynamoDB native TTL on EXPIRY_FIELD.
    Because the DynamoDB TTL sweeper may take up to 48 hours to delete
    expired items, the adapter also reclaims stale locks: when
    writeRecordIfNotExists returns applied: false, the adapter checks
    whether the existing lock item has expired. If it has, the stale
    lock is deleted and the atomic write is retried. The race window
    between the check and the retry is tiny and the worst case is two
    callers fetching instead of one - the stampede protection degrades
    gracefully, it does not fail.

    @param {Object} instance   - Request instance
    @param {String} namespace  - Logical group for the cache entry
    @param {String} cache_code - Specific entry identifier within the namespace
    @param {Object} options    - { timeout_ms: Number } lock auto-expiry in milliseconds

    @return {Promise<Object>} - { success, applied, error }
    *********************************************************************/
    setLock: async function (instance, namespace, cache_code, options) {

      // Convert milliseconds to seconds for the expiry timestamp
      const timeout_ms = (options && options.timeout_ms) || 3000;
      const ttl_seconds = Math.max(1, Math.ceil(timeout_ms / 1000));
      const expiry_seconds = instance.time + ttl_seconds;

      // Build the lock item and attempt an atomic create-only write
      const lock_key = _Store.composeLockKey(namespace, cache_code);
      const lock_item = _Store.composeLockItem(namespace, cache_code, expiry_seconds);
      const result = await Lib.DynamoDB.writeRecordIfNotExists(
        instance,
        CONFIG.TABLE_NAME,
        lock_key,
        lock_item
      );

      // Return a service error if the driver call failed
      if (result.success === false) {
        _Store.logDriverFailure('setLock', result.error);
        return {
          success: false,
          applied: false,
          error: ERRORS.SERVICE_UNAVAILABLE
        };
      }

      // Lock acquired on the first attempt
      if (result.applied === true) {
        return {
          success: true,
          applied: true,
          error: null
        };
      }

      // Lock not acquired - check whether the existing lock has expired
      // (DynamoDB TTL sweeper may not have deleted it yet). Use strongly
      // consistent read to avoid seeing a stale lock that was already released.
      const existing = await Lib.DynamoDB.getRecord(
        instance,
        CONFIG.TABLE_NAME,
        lock_key,
        { consistentRead: true }
      );

      // Return a service error if the driver call failed
      if (existing.success === false) {
        _Store.logDriverFailure('setLock (stale check)', existing.error);
        return {
          success: false,
          applied: false,
          error: ERRORS.SERVICE_UNAVAILABLE
        };
      }

      // If the existing lock has not expired, it is genuinely held
      if (existing.item !== null && existing.item !== undefined && !_Store.isExpired(existing.item, instance)) {
        return {
          success: true,
          applied: false,
          error: null
        };
      }

      // The existing lock has expired (or the item vanished between calls).
      // Delete the stale lock and retry the atomic write.
      await Lib.DynamoDB.deleteRecord(instance, CONFIG.TABLE_NAME, lock_key);

      // Retry the atomic create-only write
      const retry = await Lib.DynamoDB.writeRecordIfNotExists(
        instance,
        CONFIG.TABLE_NAME,
        lock_key,
        lock_item
      );

      // Return a service error if the retry failed
      if (retry.success === false) {
        _Store.logDriverFailure('setLock (retry)', retry.error);
        return {
          success: false,
          applied: false,
          error: ERRORS.SERVICE_UNAVAILABLE
        };
      }

      // Pass the retry's applied flag straight through
      return {
        success: true,
        applied: retry.applied,
        error: null
      };

    },


    /********************************************************************
    Release a distributed lock. Delegates to Lib.DynamoDB.deleteRecord.
    Idempotent: succeeds even if the lock was already released or
    expired via TTL.

    @param {Object} instance   - Request instance
    @param {String} namespace  - Logical group for the cache entry
    @param {String} cache_code - Specific entry identifier within the namespace

    @return {Promise<Object>} - { success, error }
    *********************************************************************/
    releaseLock: async function (instance, namespace, cache_code) {

      // Delete the lock item by its composite primary key
      const result = await Lib.DynamoDB.deleteRecord(
        instance,
        CONFIG.TABLE_NAME,
        _Store.composeLockKey(namespace, cache_code)
      );

      // Return a service error if the driver call failed
      if (result.success === false) {
        _Store.logDriverFailure('releaseLock', result.error);
        return {
          success: false,
          error: ERRORS.SERVICE_UNAVAILABLE
        };
      }

      // Report success - idempotent
      return {
        success: true,
        error: null
      };

    }

  };////////////////////////////// Public Functions END ////////////////////////


  return Store;

};///////////////////////////// createInterface END ////////////////////////////
