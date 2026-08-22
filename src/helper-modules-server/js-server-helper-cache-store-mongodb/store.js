// Info: MongoDB store adapter for helper-cache. Fully independent
// module that owns its own CONFIG, ERRORS, and Validators. Uses a
// single-collection design with composite string _id =
// namespace + '\u001F' + cache_code, giving O(1) getCache/setCache/deleteCache
// and O(K) deleteCacheByPrefix/clearCache/listCacheCodes via left-anchored
// regex on the _id index.
//
// The cache module forwards namespace and cache_code as separate
// parameters; this adapter joins them with the fixed \u001F separator
// into the MongoDB _id. No key flattening or separator is configurable
// because \u001F (ASCII Unit Separator) cannot appear in any
// human-readable identifier.
//
// TTL is handled via a MongoDB TTL index on the EXPIRY_FIELD attribute.
// The adapter writes a BSON Date to EXPIRY_FIELD when ttl_seconds is
// provided. MongoDB's background sweeper deletes expired documents
// within ~60 seconds. For immediate expiry correctness, the adapter
// also checks expiry on read and treats expired documents as misses
// (the document may still be physically present before the sweeper
// runs).
//
// deleteCacheByPrefix, clearCache, and listCacheCodes use left-anchored
// regex on _id, which MongoDB converts to an index range scan. This is
// O(K) where K = matching documents, not the entire collection.
//
// Standard factory shape: receives shared_libs, picks MongoDB driver as
// Lib.MongoDB (capability-named key, not vendor-named).
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
// Serialization: this adapter stores the value as a native BSON object
// field (VALUE_FIELD). No JSON.stringify/parse is needed - MongoDB
// stores JavaScript objects natively. The cache module passes raw
// JavaScript objects; the adapter passes them straight through to
// Lib.MongoDB.
//
// Lock keys use a separate _id prefix (LOCK_ID_PREFIX) within the same
// collection, so lock documents are distinct from cache entry documents.
// setCacheLock uses Lib.MongoDB.insertRecordIfNotExists (atomic insertOne
// that catches E11000 duplicate key error) with an expiry Date.

'use strict';



/////////////////////////// Module-Loader START ////////////////////////////////

/********************************************************************
Thin loader. Picks dependencies from the injected container, merges
config over defaults, validates config via the Validators singleton,
then delegates to createInterface. Each call returns an independent
Store instance.

@param {Object} shared_libs - Dependency container (Utils, Debug, MongoDB)
@param {Object} config      - Overrides merged over adapter config defaults

@return {Object} - Store interface (9 methods: getCache, setCache, deleteCache, deleteCacheByPrefix, clearCache, listCacheCodes, getCacheExists, setCacheLock, releaseCacheLock)
*********************************************************************/
module.exports = function loader (shared_libs, config) {

  // Dependencies for this instance - by reference from the shared container
  const Lib = {
    Utils: shared_libs.Utils,
    Debug: shared_libs.Debug,
    MongoDB: shared_libs.MongoDB
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

@param {Object} Lib        - Dependency container (Utils, Debug, MongoDB)
@param {Object} CONFIG     - Merged adapter configuration (validated)
@param {Object} ERRORS     - Frozen error catalog
@param {Object} Validators - Validators singleton (Lib + ERRORS injected)

@return {Object} - Store interface (9 methods: getCache, setCache, deleteCache, deleteCacheByPrefix, clearCache, listCacheCodes, getCacheExists, setCacheLock, releaseCacheLock)
*********************************************************************/
const createInterface = function (Lib, CONFIG, ERRORS, Validators) { // eslint-disable-line no-unused-vars

  ////////////////////////////// Public Functions START ////////////////////////
  const Store = {


    /********************************************************************
    Read one cached value by composite _id. Returns value: null on a
    miss (document absent or expired). The stored BSON object is
    returned directly - no deserialization needed because MongoDB
    stores native BSON. Delegates to Lib.MongoDB.getRecord.

    If the document exists but its EXPIRY_FIELD Date has passed, the
    adapter treats it as a miss (the MongoDB TTL sweeper may not have
    deleted it yet) and deletes the stale document.

    @param {Object} instance   - Request instance
    @param {String} namespace  - Logical group for the cache entry
    @param {String} cache_code - Specific entry identifier within the namespace

    @return {Promise<Object>} - { success, value, error }
    *********************************************************************/
    getCache: async function (instance, namespace, cache_code) {

      // Fetch the document by composite _id
      const result = await Lib.MongoDB.getRecord(
        instance,
        CONFIG.COLLECTION_NAME,
        { _id: _Store.composeKey(namespace, cache_code) }
      );

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
      if (result.document === null || result.document === undefined) {
        return {
          success: true,
          value: null,
          error: null
        };
      }

      // Check whether the document has expired (MongoDB TTL sweeper may lag)
      if (_Store.isExpired(result.document, instance)) {

        // Delete the stale document so subsequent reads do not pay the cost
        await Lib.MongoDB.deleteRecord(
          instance,
          CONFIG.COLLECTION_NAME,
          { _id: _Store.composeKey(namespace, cache_code) }
        );

        return {
          success: true,
          value: null,
          error: null
        };
      }

      // Return the stored value - MongoDB stores native BSON, no deserialization
      return {
        success: true,
        value: result.document[CONFIG.VALUE_FIELD],
        error: null
      };

    },


    /********************************************************************
    Write one cached value with an optional TTL. The value is a raw
    JavaScript object from the cache module; this adapter passes it
    straight through to Lib.MongoDB as a native BSON object.
    ttl_seconds is positional and optional - when absent, the document
    has no expiry. Delegates to Lib.MongoDB.writeRecord (upsert).

    @param {Object} instance    - Request instance
    @param {String} namespace   - Logical group for the cache entry
    @param {String} cache_code  - Specific entry identifier within the namespace
    @param {*} value            - Raw JavaScript value to cache
    @param {Number} ttl_seconds - Optional lifetime in seconds

    @return {Promise<Object>} - { success, error }
    *********************************************************************/
    setCache: async function (instance, namespace, cache_code, value, ttl_seconds) {

      // Build the document with the composite _id, value, and optional expiry
      const document = _Store.composeItem(namespace, cache_code, value, ttl_seconds, instance);

      // Write the document (upsert via replaceOne)
      const result = await Lib.MongoDB.writeRecord(
        instance,
        CONFIG.COLLECTION_NAME,
        { _id: document._id },
        document
      );

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
    Idempotent delete of one cache entry. Delegates to
    Lib.MongoDB.deleteRecord. A missing document is still success.

    @param {Object} instance   - Request instance
    @param {String} namespace  - Logical group for the cache entry
    @param {String} cache_code - Specific entry identifier within the namespace

    @return {Promise<Object>} - { success, error }
    *********************************************************************/
    deleteCache: async function (instance, namespace, cache_code) {

      // Delete the document by its composite _id
      const result = await Lib.MongoDB.deleteRecord(
        instance,
        CONFIG.COLLECTION_NAME,
        { _id: _Store.composeKey(namespace, cache_code) }
      );

      // Return a service error if the driver call failed
      if (result.success === false) {
        _Store.logDriverFailure('deleteCache', result.error);
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
    Selective mass invalidation. Queries for all documents in the
    namespace matching the cache_code_prefix via left-anchored regex
    on _id, then deletes them via deleteRecordsByFilter.
    Short-circuits on zero matches. O(K) where K = matching documents.
    The cache_code_prefix is required. To wipe every entry in a
    namespace, use clearCache instead.

    @param {Object} instance          - Request instance
    @param {String} namespace         - Logical group for the cache entries
    @param {String} cache_code_prefix - Required prefix. Only entries whose cache_code starts with this are deleted

    @return {Promise<Object>} - { success, deleted_count, error }
    *********************************************************************/
    deleteCacheByPrefix: async function (instance, namespace, cache_code_prefix) {

      // Build the left-anchored regex filter for the prefix
      const filter = _Store.composePrefixFilter(namespace, cache_code_prefix);

      // Delete all matching documents in one call
      const result = await Lib.MongoDB.deleteRecordsByFilter(
        instance,
        CONFIG.COLLECTION_NAME,
        filter
      );

      // Return a service error if the driver call failed
      if (result.success === false) {
        _Store.logDriverFailure('deleteCacheByPrefix', result.error);
        return {
          success: false,
          deleted_count: 0,
          error: ERRORS.SERVICE_UNAVAILABLE
        };
      }

      // Report success with the count of deleted documents
      // (includes expired-but-unswept items - see docs/cleanup.md)
      return {
        success: true,
        deleted_count: result.deletedCount,
        error: null
      };

    },


    /********************************************************************
    Wipe every cache entry in the namespace. Deletes all documents
    whose _id starts with the namespace prefix via deleteRecordsByFilter.
    Short-circuits on zero matches. O(K) where K = matching documents.

    @param {Object} instance   - Request instance
    @param {String} namespace  - Logical group for the cache entries

    @return {Promise<Object>} - { success, deleted_count, error }
    *********************************************************************/
    clearCache: async function (instance, namespace) {

      // Build the left-anchored regex filter for the whole namespace
      const filter = _Store.composeNamespaceFilter(namespace);

      // Delete all matching documents in one call
      const result = await Lib.MongoDB.deleteRecordsByFilter(
        instance,
        CONFIG.COLLECTION_NAME,
        filter
      );

      // Return a service error if the driver call failed
      if (result.success === false) {
        _Store.logDriverFailure('clearCache', result.error);
        return {
          success: false,
          deleted_count: 0,
          error: ERRORS.SERVICE_UNAVAILABLE
        };
      }

      // Report success with the count of deleted documents
      return {
        success: true,
        deleted_count: result.deletedCount,
        error: null
      };

    },


    /********************************************************************
    List cache_codes in the namespace matching the prefix. Queries for
    all documents whose _id starts with the namespace (+ optional
    prefix), extracts the cache_code from each _id by stripping the
    namespace + separator, return the cache_codes. O(K) where K =
    matching documents.

    Expired documents are filtered so list agrees with get.

    @param {Object} instance        - Request instance
    @param {String} namespace       - Logical group for the cache entries
    @param {String} cache_code_prefix - Optional prefix. Omit to list the whole namespace

    @return {Promise<Object>} - { success, cache_codes, error }
    *********************************************************************/
    listCacheCodes: async function (instance, namespace, cache_code_prefix) {

      // Build the filter - with or without cache_code_prefix
      const filter = cache_code_prefix
        ? _Store.composePrefixFilter(namespace, cache_code_prefix)
        : _Store.composeNamespaceFilter(namespace);

      // Query for all documents matching the filter
      const result = await Lib.MongoDB.query(
        instance,
        CONFIG.COLLECTION_NAME,
        filter
      );

      // Return a service error if the query failed
      if (result.success === false) {
        _Store.logDriverFailure('listCacheCodes', result.error);
        return {
          success: false,
          cache_codes: [],
          error: ERRORS.SERVICE_UNAVAILABLE
        };
      }

      // Extract cache_code from each _id, excluding lock documents and
      // entries whose TTL has passed but which the MongoDB sweeper has
      // not yet removed, so list agrees with get
      const cache_codes = result.documents
        .filter(function (doc) {
          return doc._id.indexOf(CONFIG.LOCK_ID_PREFIX) !== 0;
        })
        .filter(function (doc) {
          return !_Store.isExpired(doc, instance);
        })
        .map(function (doc) {
          return _Store.stripToCacheCode(namespace, doc._id);
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
    Delegates to Lib.MongoDB.getRecord and checks for document presence
    and expiry. Returns exists: true if the document is present and not
    expired, false otherwise.

    MongoDB does not have a native "exists" check without fetching the
    document. A projection could reduce the data transfer, but the
    overhead of fetching the full document is acceptable for a cache.
    The value is simply not returned to the caller.

    @param {Object} instance   - Request instance
    @param {String} namespace  - Logical group for the cache entry
    @param {String} cache_code - Specific entry identifier within the namespace

    @return {Promise<Object>} - { success, exists, error }
    *********************************************************************/
    getCacheExists: async function (instance, namespace, cache_code) {

      // Fetch the document to check existence
      const result = await Lib.MongoDB.getRecord(
        instance,
        CONFIG.COLLECTION_NAME,
        { _id: _Store.composeKey(namespace, cache_code) }
      );

      // Return a service error if the driver call failed
      if (result.success === false) {
        _Store.logDriverFailure('getCacheExists', result.error);
        return {
          success: false,
          exists: false,
          error: ERRORS.SERVICE_UNAVAILABLE
        };
      }

      // Document does not exist
      if (result.document === null || result.document === undefined) {
        return {
          success: true,
          exists: false,
          error: null
        };
      }

      // Check whether the document has expired
      if (_Store.isExpired(result.document, instance)) {
        return {
          success: true,
          exists: false,
          error: null
        };
      }

      // Document exists and has not expired
      return {
        success: true,
        exists: true,
        error: null
      };

    },


    /********************************************************************
    Acquire a distributed lock for a cache entry. Uses
    Lib.MongoDB.insertRecordIfNotExists (atomic insertOne that catches
    E11000 duplicate key error) with an expiry Date derived from
    options.timeout_ms. The lock _id is a separate prefix
    (LOCK_ID_PREFIX + namespace + separator + cache_code) within the
    same collection, so lock documents do not collide with cache entry
    documents.

    Returns applied: true if this caller acquired the lock, false if
    another caller already holds it. applied: false is not an error.

    The lock auto-expires via the MongoDB TTL index on EXPIRY_FIELD.
    Because the MongoDB TTL sweeper may take up to 60 seconds to delete
    expired documents, the adapter also reclaims stale locks: when
    insertRecordIfNotExists returns applied: false, the adapter checks
    whether the existing lock document has expired. If it has, the stale
    lock is deleted and the atomic insert is retried. The race window
    between the check and the retry is tiny and the worst case is two
    callers fetching instead of one - the stampede protection degrades
    gracefully, it does not fail.

    @param {Object} instance   - Request instance
    @param {String} namespace  - Logical group for the cache entry
    @param {String} cache_code - Specific entry identifier within the namespace
    @param {Object} options    - { timeout_ms: Number } lock auto-expiry in milliseconds

    @return {Promise<Object>} - { success, applied, error }
    *********************************************************************/
    setCacheLock: async function (instance, namespace, cache_code, options) {

      // Convert milliseconds to seconds for the expiry timestamp, clamped
      // to a minimum of one second, matching the other adapters
      const timeout_ms = (options && options.timeout_ms) || 3000;
      const ttl_seconds = Math.max(1, Math.ceil(timeout_ms / 1000));
      const expiry_seconds = instance.time + ttl_seconds;

      // Build the lock document and attempt an atomic insert
      const lock_id = _Store.composeLockKey(namespace, cache_code);
      const lock_doc = _Store.composeLockItem(namespace, cache_code, expiry_seconds);
      const result = await Lib.MongoDB.insertRecordIfNotExists(
        instance,
        CONFIG.COLLECTION_NAME,
        lock_doc
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

      // Lock acquired on the first attempt
      if (result.applied === true) {
        return {
          success: true,
          applied: true,
          error: null
        };
      }

      // Lock not acquired - check whether the existing lock has expired
      // (MongoDB TTL sweeper may not have deleted it yet)
      const existing = await Lib.MongoDB.getRecord(
        instance,
        CONFIG.COLLECTION_NAME,
        { _id: lock_id }
      );

      // Return a service error if the driver call failed
      if (existing.success === false) {
        _Store.logDriverFailure('setCacheLock (stale check)', existing.error);
        return {
          success: false,
          applied: false,
          error: ERRORS.SERVICE_UNAVAILABLE
        };
      }

      // If the existing lock has not expired, it is genuinely held
      if (existing.document !== null && existing.document !== undefined && !_Store.isExpired(existing.document, instance)) {
        return {
          success: true,
          applied: false,
          error: null
        };
      }

      // The existing lock has expired (or the document vanished between
      // calls). Delete the stale lock and retry the atomic insert.
      await Lib.MongoDB.deleteRecord(instance, CONFIG.COLLECTION_NAME, { _id: lock_id });

      // Retry the atomic insert
      const retry = await Lib.MongoDB.insertRecordIfNotExists(
        instance,
        CONFIG.COLLECTION_NAME,
        lock_doc
      );

      // Return a service error if the retry failed
      if (retry.success === false) {
        _Store.logDriverFailure('setCacheLock (retry)', retry.error);
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
    Release a distributed lock. Delegates to Lib.MongoDB.deleteRecord.
    Idempotent: succeeds even if the lock was already released or
    expired via TTL index.

    @param {Object} instance   - Request instance
    @param {String} namespace  - Logical group for the cache entry
    @param {String} cache_code - Specific entry identifier within the namespace

    @return {Promise<Object>} - { success, error }
    *********************************************************************/
    releaseCacheLock: async function (instance, namespace, cache_code) {

      // Delete the lock document by its _id
      const result = await Lib.MongoDB.deleteRecord(
        instance,
        CONFIG.COLLECTION_NAME,
        { _id: _Store.composeLockKey(namespace, cache_code) }
      );

      // Return a service error if the driver call failed
      if (result.success === false) {
        _Store.logDriverFailure('releaseCacheLock', result.error);
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



  //////////////////////////// Private Functions START //////////////////////////
  const _Store = {

    /******************************************************************
    Build the composite _id for one cache entry.

    @param {String} namespace
    @param {String} cache_code

    @return {String} - namespace + '\u001F' + cache_code
    ******************************************************************/
    composeKey: function (namespace, cache_code) {

      return namespace + '\u001F' + cache_code;

    },


    /******************************************************************
    Build the composite _id for a distributed lock. Lock documents
    use a distinct prefix so they do not collide with cache entry
    documents.

    @param {String} namespace
    @param {String} cache_code

    @return {String} - LOCK_ID_PREFIX + namespace + '\u001F' + cache_code
    ******************************************************************/
    composeLockKey: function (namespace, cache_code) {

      return CONFIG.LOCK_ID_PREFIX + namespace + '\u001F' + cache_code;

    },


    /******************************************************************
    Build the full document for a cache entry. The document includes
    the composite _id, the value (native BSON), and the expiry Date
    (when ttl_seconds is provided).

    @param {String} namespace
    @param {String} cache_code
    @param {*} value - Raw JavaScript value (stored as native BSON)
    @param {Number|undefined} ttl_seconds - Optional lifetime in seconds
    @param {Object} instance - Request instance (for current time)

    @return {Object} - MongoDB document
    ******************************************************************/
    composeItem: function (namespace, cache_code, value, ttl_seconds, instance) {

      const doc = {
        _id: _Store.composeKey(namespace, cache_code)
      };

      doc[CONFIG.VALUE_FIELD] = value;

      if (!Lib.Utils.isNullOrUndefined(ttl_seconds)) {
        doc[CONFIG.EXPIRY_FIELD] = new Date((instance.time + ttl_seconds) * 1000);
      }

      return doc;

    },


    /******************************************************************
    Build the full document for a distributed lock. The document
    includes the lock _id and the expiry Date.

    @param {String} namespace
    @param {String} cache_code
    @param {Number} expiry_seconds - Unix epoch seconds

    @return {Object} - MongoDB document
    ******************************************************************/
    composeLockItem: function (namespace, cache_code, expiry_seconds) {

      const doc = {
        _id: _Store.composeLockKey(namespace, cache_code)
      };

      doc[CONFIG.EXPIRY_FIELD] = new Date(expiry_seconds * 1000);

      return doc;

    },


    /******************************************************************
    Build a left-anchored regex filter for prefix matching on _id.
    MongoDB converts /^prefix/ to an index range scan on the _id
    B-tree, so this is O(K) where K = matching documents.

    The regex escapes regex special characters in the namespace and
    prefix to prevent injection.

    @param {String} namespace
    @param {String} cache_code_prefix

    @return {Object} - MongoDB filter { _id: { $regex: ... } }
    ******************************************************************/
    composePrefixFilter: function (namespace, cache_code_prefix) {

      const escaped = _Store.escapeRegex(namespace + '\u001F' + cache_code_prefix);

      return {
        _id: { $regex: new RegExp('^' + escaped) }
      };

    },


    /******************************************************************
    Build a left-anchored regex filter for all documents in a
    namespace.

    @param {String} namespace

    @return {Object} - MongoDB filter { _id: { $regex: ... } }
    ******************************************************************/
    composeNamespaceFilter: function (namespace) {

      const escaped = _Store.escapeRegex(namespace + '\u001F');

      return {
        _id: { $regex: new RegExp('^' + escaped) }
      };

    },


    /******************************************************************
    Strip the namespace + separator prefix from a composite _id to
    extract the cache_code.

    @param {String} namespace
    @param {String} full_id - The composite _id

    @return {String} - cache_code
    ******************************************************************/
    stripToCacheCode: function (namespace, full_id) {

      return full_id.substring(namespace.length + 1);

    },


    /******************************************************************
    Escape regex special characters in a string so it can be used
    safely inside a RegExp.

    @param {String} str

    @return {String} - Escaped string
    ******************************************************************/
    escapeRegex: function (str) {

      return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    },


    /******************************************************************
    Check whether a retrieved document has expired. Compares the
    EXPIRY_FIELD Date against the current instance time. Returns
    true when the document has expired (even if the MongoDB TTL
    sweeper has not yet deleted it).

    @param {Object} doc     - MongoDB document
    @param {Object} instance - Request instance (for current time)

    @return {Boolean} - true if expired, false otherwise
    ******************************************************************/
    isExpired: function (doc, instance) {

      if (Lib.Utils.isNullOrUndefined(doc[CONFIG.EXPIRY_FIELD])) {
        return false;
      }

      // EXPIRY_FIELD is a BSON Date; convert to Unix epoch seconds
      const expiry_seconds = Math.floor(doc[CONFIG.EXPIRY_FIELD].getTime() / 1000);
      const now_seconds = instance.time;

      return expiry_seconds <= now_seconds;

    },


    /******************************************************************
    Log a driver failure at debug level. The driver's own error type
    and message never leak through to the caller; only the adapter's
    own SERVICE_UNAVAILABLE envelope is returned.

    @param {String} method        - Public method name
    @param {Object} driver_error  - Error object from Lib.MongoDB

    @return {void}
    ******************************************************************/
    logDriverFailure: function (method, driver_error) {

      Lib.Debug.debug('[helper-cache-store-mongodb] ' + method + ' failed', {
        type: ERRORS.SERVICE_UNAVAILABLE.type,
        driver_type: driver_error && driver_error.type,
        driver_message: driver_error && driver_error.message
      });

    }

  };///////////////////////////// Private Functions END ////////////////////////



  return Store;

};///////////////////////////// createInterface END ////////////////////////////
