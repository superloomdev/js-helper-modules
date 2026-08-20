// Info: Key-value store over browser Web Storage (localStorage/sessionStorage).
//
// Class C Driver Wrapper: wraps the browser's Web Storage API and presents
// a unified KV interface identical to helper-kv-mmkv for platform
// interchangeability. Values are JSON round-tripped. Keys are namespaced.
//
// Provides: getRecord, writeRecord, deleteRecord, getRecordExists, getAllKeys,
//           batchGetRecords, batchWriteRecords, batchDeleteRecords, clear
//           (async) and their Sync counterparts.
//
// The storage engine is resolved at construction time: injected
// shared_libs.WebStorage first, then globalThis[localStorage|sessionStorage]
// per CONFIG.STORE. If neither is available, every call returns
// STORAGE_UNAVAILABLE.
//
// Compatibility: Browsers, Electron renderers, webviews. Node.js for testing
// with an injected stub.
//
// Factory pattern: each loader call returns an independent instance with
// its own namespace and engine reference.
//
'use strict';



/////////////////////////// Module-Loader START ////////////////////////////////

/********************************************************************
Factory loader. One call = one independent instance with its own
namespace and resolved storage engine.

@param {Object} shared_libs - Lib container; requires Utils, Debug.
                              Optional: WebStorage (injected engine for tests)
@param {Object} config      - Overrides merged over defaults

@return {Object} - Public interface for this module
*********************************************************************/
module.exports = function loader (shared_libs, config) {

  // Dependencies for this instance
  const Lib = {
    Utils: shared_libs.Utils,
    Debug: shared_libs.Debug
  };

  // Merge overrides over defaults
  const CONFIG = Object.assign(
    {},
    require('./localstorage.config'),
    config || {}
  );

  // Error catalog (frozen, owned by the main module)
  const ERRORS = require('./localstorage.errors');

  // Validators singleton - Lib, ERRORS injected here
  const Validators = require('./localstorage.validators')(Lib, ERRORS);

  // Validate config immediately so misconfiguration fails at startup
  Validators.validateConfig(CONFIG);

  // Resolve the storage engine: injected WebStorage first, then globalThis
  let engine = null;
  if (shared_libs.WebStorage) {

    // Use the injected engine (test stub or host-supplied shim)
    engine = shared_libs.WebStorage;

  } else {

    // Fall back to the global Web Storage API
    try {
      const storageKey = CONFIG.STORE + 'Storage';

      if (typeof globalThis[storageKey] !== 'undefined') {
        engine = globalThis[storageKey];
      }
    } catch {

      // SecurityError in some embedded-browser contexts: engine stays null
      engine = null;

    }

  }

  // Mutable per-instance state (resolved engine lives here)
  const state = {
    engine: engine
  };

  return createInterface(Lib, CONFIG, ERRORS, Validators, state);

};/////////////////////////// Module-Loader END /////////////////////////////////



/////////////////////////// createInterface START //////////////////////////////

/********************************************************************
Builds the public interface for one instance. Public and private
functions close over the provided Lib, CONFIG, ERRORS, Validators,
and state.

@param {Object} Lib       - Dependency container (Utils, Debug)
@param {Object} CONFIG    - Merged configuration for this instance
@param {Object} ERRORS    - Frozen error catalog
@param {Object} Validators - Validators singleton (Lib + ERRORS injected)
@param {Object} state     - Mutable state holder (resolved engine)

@return {Object} - Public interface for this module
*********************************************************************/
const createInterface = function (Lib, CONFIG, ERRORS, Validators, state) {

  ///////////////////////////Public Functions START//////////////////////////////
  const KvLocalstorage = {

    // ~~~~~~~~~~~~~~~~~~~~ Sync Surface ~~~~~~~~~~~~~~~~~~~~
    // Synchronous primitives. The async forms wrap these in resolved promises.

    /********************************************************************
    Get a single record by key. Returns found: false when the key is
    absent, found: true when present (including stored null).

    @param {String} key - Non-empty string without the namespace separator

    @return {Object} - { success, value, found, error }
    *********************************************************************/
    getRecordSync: function (key) {

      // Validate key
      const keyError = _KvLocalstorage.validateKey(key);
      if (keyError) {

        // Return validation error
        return {
          success: false,
          value: null,
          found: false,
          error: keyError
        };

      }

      // Ensure the storage engine is available
      if (Lib.Utils.isNullOrUndefined(state.engine)) {

        // Return unavailable error
        return {
          success: false,
          value: null,
          found: false,
          error: ERRORS.STORAGE_UNAVAILABLE
        };

      }

      try {

        // Read the raw value from the storage engine
        const raw = state.engine.getItem(_KvLocalstorage.buildKey(key));

        // Early return: key not found
        if (raw === null) {

          return {
            success: true,
            value: null,
            found: false,
            error: null
          };

        }

        // Deserialize the stored JSON value
        try {
          const parsed = JSON.parse(raw);

          // Return successful response with the deserialized value
          return {
            success: true,
            value: parsed,
            found: true,
            error: null
          };

        } catch (parseError) {

          Lib.Debug.debug('helper-kv-localstorage getRecordSync failed', {
            type: ERRORS.DESERIALIZE_FAILED.type,
            message: parseError.message,
            stack: parseError.stack
          });

          // Return deserialize error
          return {
            success: false,
            value: null,
            found: false,
            error: ERRORS.DESERIALIZE_FAILED
          };

        }

      } catch (engineError) {

        Lib.Debug.debug('helper-kv-localstorage getRecordSync failed', {
          type: ERRORS.STORAGE_READ_FAILED.type,
          message: engineError.message,
          stack: engineError.stack
        });

        // Return storage read error
        return {
          success: false,
          value: null,
          found: false,
          error: ERRORS.STORAGE_READ_FAILED
        };

      }

    },


    /********************************************************************
    Write a record by key. Always upsert. JSON-serializes the value.

    @param {String} key   - Non-empty string without the namespace separator
    @param {*}      value - Any JSON-serializable value (undefined rejected)

    @return {Object} - { success, error }
    *********************************************************************/
    writeRecordSync: function (key, value) {

      // Validate key
      const keyError = _KvLocalstorage.validateKey(key);
      if (keyError) {

        // Return validation error
        return {
          success: false,
          error: keyError
        };

      }

      // Validate value (undefined rejected, null allowed)
      if (value === undefined) {

        // Return invalid value error
        return {
          success: false,
          error: ERRORS.INVALID_VALUE
        };

      }

      // Ensure the storage engine is available
      if (Lib.Utils.isNullOrUndefined(state.engine)) {

        // Return unavailable error
        return {
          success: false,
          error: ERRORS.STORAGE_UNAVAILABLE
        };

      }

      try {

        // Serialize and write the value to the storage engine
        state.engine.setItem(_KvLocalstorage.buildKey(key), JSON.stringify(value));

        // Return successful response
        return {
          success: true,
          error: null
        };

      } catch (engineError) {

        Lib.Debug.debug('helper-kv-localstorage writeRecordSync failed', {
          type: ERRORS.STORAGE_WRITE_FAILED.type,
          message: engineError.message,
          stack: engineError.stack
        });

        // Return storage write error
        return {
          success: false,
          error: ERRORS.STORAGE_WRITE_FAILED
        };

      }

    },


    /********************************************************************
    Delete a record by key. Idempotent: deleting an absent key is
    still success: true.

    @param {String} key - Non-empty string without the namespace separator

    @return {Object} - { success, error }
    *********************************************************************/
    deleteRecordSync: function (key) {

      // Validate key
      const keyError = _KvLocalstorage.validateKey(key);
      if (keyError) {

        // Return validation error
        return {
          success: false,
          error: keyError
        };

      }

      // Ensure the storage engine is available
      if (Lib.Utils.isNullOrUndefined(state.engine)) {

        // Return unavailable error
        return {
          success: false,
          error: ERRORS.STORAGE_UNAVAILABLE
        };

      }

      try {

        // Remove the key from the storage engine
        state.engine.removeItem(_KvLocalstorage.buildKey(key));

        // Return successful response
        return {
          success: true,
          error: null
        };

      } catch (engineError) {

        Lib.Debug.debug('helper-kv-localstorage deleteRecordSync failed', {
          type: ERRORS.STORAGE_DELETE_FAILED.type,
          message: engineError.message,
          stack: engineError.stack
        });

        // Return storage delete error
        return {
          success: false,
          error: ERRORS.STORAGE_DELETE_FAILED
        };

      }

    },


    /********************************************************************
    Check whether a key exists in the store.

    @param {String} key - Non-empty string without the namespace separator

    @return {Object} - { success, exists, error }
    *********************************************************************/
    getRecordExistsSync: function (key) {

      // Validate key
      const keyError = _KvLocalstorage.validateKey(key);
      if (keyError) {

        // Return validation error
        return {
          success: false,
          exists: false,
          error: keyError
        };

      }

      // Ensure the storage engine is available
      if (Lib.Utils.isNullOrUndefined(state.engine)) {

        // Return unavailable error
        return {
          success: false,
          exists: false,
          error: ERRORS.STORAGE_UNAVAILABLE
        };

      }

      try {

        // Check key existence via getItem (null means absent)
        const raw = state.engine.getItem(_KvLocalstorage.buildKey(key));

        // Return successful response with existence flag
        return {
          success: true,
          exists: raw !== null,
          error: null
        };

      } catch (engineError) {

        Lib.Debug.debug('helper-kv-localstorage getRecordExistsSync failed', {
          type: ERRORS.STORAGE_READ_FAILED.type,
          message: engineError.message,
          stack: engineError.stack
        });

        // Return storage read error
        return {
          success: false,
          exists: false,
          error: ERRORS.STORAGE_READ_FAILED
        };

      }

    },


    /********************************************************************
    List all keys within the namespace, with the namespace prefix
    stripped. Only keys belonging to this namespace are returned.

    @return {Object} - { success, keys, count, error }
    *********************************************************************/
    getAllKeysSync: function () {

      // Ensure the storage engine is available
      if (Lib.Utils.isNullOrUndefined(state.engine)) {

        // Return unavailable error
        return {
          success: false,
          keys: null,
          count: 0,
          error: ERRORS.STORAGE_UNAVAILABLE
        };

      }

      try {
        const keys = [];

        // Iterate all storage keys and collect namespaced ones
        for (let i = 0; i < state.engine.length; i++) {
          const storedKey = state.engine.key(i);

          // Check if this key belongs to our namespace and collect it
          if (storedKey && _KvLocalstorage.isNamespacedKey(storedKey)) {
            keys.push(_KvLocalstorage.stripPrefix(storedKey));
          }
        }

        // Return successful response with the key list
        return {
          success: true,
          keys: keys,
          count: keys.length,
          error: null
        };

      } catch (engineError) {

        Lib.Debug.debug('helper-kv-localstorage getAllKeysSync failed', {
          type: ERRORS.STORAGE_READ_FAILED.type,
          message: engineError.message,
          stack: engineError.stack
        });

        // Return storage read error
        return {
          success: false,
          keys: null,
          count: 0,
          error: ERRORS.STORAGE_READ_FAILED
        };

      }

    },


    /********************************************************************
    Get multiple records by key. Returns a { key: value } map. Absent
    keys are omitted from the map.

    @param {Array<String>} keys - Array of valid key strings

    @return {Object} - { success, values, error }
    *********************************************************************/
    batchGetRecordsSync: function (keys) {

      // Validate keys argument
      const keysError = _KvLocalstorage.validateKeysArray(keys);
      if (keysError) {

        // Return validation error
        return {
          success: false,
          values: null,
          error: keysError
        };

      }

      const values = {};

      // Fetch each key and build the values map
      for (let i = 0; i < keys.length; i++) {

        // Read the record for this key
        const result = KvLocalstorage.getRecordSync(keys[i]);

        // Propagate error on failure
        if (!result.success) {

          return {
            success: false,
            values: null,
            error: result.error
          };

        }

        // Add found values to the map (absent keys omitted)
        if (result.found) {
          values[keys[i]] = result.value;
        }

      }

      // Return successful response with the values map
      return {
        success: true,
        values: values,
        error: null
      };

    },


    /********************************************************************
    Write multiple records. Takes a { key: value } object. Sequential
    writes; first failure stops and reports.

    @param {Object} pairs - Plain object of key-value pairs

    @return {Object} - { success, error }
    *********************************************************************/
    batchWriteRecordsSync: function (pairs) {

      // Validate pairs argument
      const pairsError = _KvLocalstorage.validatePairsObject(pairs);
      if (pairsError) {

        // Return validation error
        return {
          success: false,
          error: pairsError
        };

      }

      const keys = Object.keys(pairs);

      // Write each pair sequentially
      for (let i = 0; i < keys.length; i++) {

        // Write this key-value pair
        const result = KvLocalstorage.writeRecordSync(keys[i], pairs[keys[i]]);

        // Propagate error on failure (first failure stops)
        if (!result.success) {

          return result;

        }

      }

      // Return successful response
      return {
        success: true,
        error: null
      };

    },


    /********************************************************************
    Delete multiple records by key. Idempotent per key.

    @param {Array<String>} keys - Array of valid key strings

    @return {Object} - { success, error }
    *********************************************************************/
    batchDeleteRecordsSync: function (keys) {

      // Validate keys argument
      const keysError = _KvLocalstorage.validateKeysArray(keys);
      if (keysError) {

        // Return validation error
        return {
          success: false,
          error: keysError
        };

      }

      // Delete each key sequentially
      for (let i = 0; i < keys.length; i++) {

        // Delete this key
        const result = KvLocalstorage.deleteRecordSync(keys[i]);

        // Propagate error on failure (first failure stops)
        if (!result.success) {

          return result;

        }

      }

      // Return successful response
      return {
        success: true,
        error: null
      };

    },


    /********************************************************************
    Clear all keys within the namespace. When the namespace is empty,
    uses the engine clear directly. Otherwise iterates and removes only
    namespaced keys, preserving other tenants' data.

    @return {Object} - { success, cleared_count, error }
    *********************************************************************/
    clearSync: function () {

      // Ensure the storage engine is available
      if (Lib.Utils.isNullOrUndefined(state.engine)) {

        // Return unavailable error
        return {
          success: false,
          cleared_count: 0,
          error: ERRORS.STORAGE_UNAVAILABLE
        };

      }

      try {

        // With empty namespace, use the engine clear directly
        if (CONFIG.NAMESPACE === '') {

          const count = state.engine.length;

          state.engine.clear();

          // Return successful response with the cleared count
          return {
            success: true,
            cleared_count: count,
            error: null
          };

        }

        // Collect namespaced keys to remove (avoid index shifting during iteration)
        const prefix = _KvLocalstorage.getNamespacePrefix();
        const keysToRemove = [];

        for (let i = 0; i < state.engine.length; i++) {
          const storedKey = state.engine.key(i);

          // Check if this key belongs to our namespace
          if (storedKey && storedKey.indexOf(prefix) === 0) {
            keysToRemove.push(storedKey);
          }
        }

        // Remove each namespaced key
        for (let i = 0; i < keysToRemove.length; i++) {

          state.engine.removeItem(keysToRemove[i]);

        }

        // Return successful response with the cleared count
        return {
          success: true,
          cleared_count: keysToRemove.length,
          error: null
        };

      } catch (engineError) {

        Lib.Debug.debug('helper-kv-localstorage clearSync failed', {
          type: ERRORS.STORAGE_DELETE_FAILED.type,
          message: engineError.message,
          stack: engineError.stack
        });

        // Return storage delete error
        return {
          success: false,
          cleared_count: 0,
          error: ERRORS.STORAGE_DELETE_FAILED
        };

      }

    },


    // ~~~~~~~~~~~~~~~~~~~~ Async Surface ~~~~~~~~~~~~~~~~~~~~
    // Portable contract. Each wraps its sync sibling in a resolved promise.

    /********************************************************************
    Async version of getRecordSync.

    @param {String} key - Non-empty string without the namespace separator

    @return {Promise<Object>} - { success, value, found, error }
    *********************************************************************/
    getRecord: async function (key) {

      return KvLocalstorage.getRecordSync(key);

    },


    /********************************************************************
    Async version of writeRecordSync.

    @param {String} key   - Non-empty string without the namespace separator
    @param {*}      value - Any JSON-serializable value (undefined rejected)

    @return {Promise<Object>} - { success, error }
    *********************************************************************/
    writeRecord: async function (key, value) {

      return KvLocalstorage.writeRecordSync(key, value);

    },


    /********************************************************************
    Async version of deleteRecordSync.

    @param {String} key - Non-empty string without the namespace separator

    @return {Promise<Object>} - { success, error }
    *********************************************************************/
    deleteRecord: async function (key) {

      return KvLocalstorage.deleteRecordSync(key);

    },


    /********************************************************************
    Async version of getRecordExistsSync.

    @param {String} key - Non-empty string without the namespace separator

    @return {Promise<Object>} - { success, exists, error }
    *********************************************************************/
    getRecordExists: async function (key) {

      return KvLocalstorage.getRecordExistsSync(key);

    },


    /********************************************************************
    Async version of getAllKeysSync.

    @return {Promise<Object>} - { success, keys, count, error }
    *********************************************************************/
    getAllKeys: async function () {

      return KvLocalstorage.getAllKeysSync();

    },


    /********************************************************************
    Async version of batchGetRecordsSync.

    @param {Array<String>} keys - Array of valid key strings

    @return {Promise<Object>} - { success, values, error }
    *********************************************************************/
    batchGetRecords: async function (keys) {

      return KvLocalstorage.batchGetRecordsSync(keys);

    },


    /********************************************************************
    Async version of batchWriteRecordsSync.

    @param {Object} pairs - Plain object of key-value pairs

    @return {Promise<Object>} - { success, error }
    *********************************************************************/
    batchWriteRecords: async function (pairs) {

      return KvLocalstorage.batchWriteRecordsSync(pairs);

    },


    /********************************************************************
    Async version of batchDeleteRecordsSync.

    @param {Array<String>} keys - Array of valid key strings

    @return {Promise<Object>} - { success, error }
    *********************************************************************/
    batchDeleteRecords: async function (keys) {

      return KvLocalstorage.batchDeleteRecordsSync(keys);

    },


    /********************************************************************
    Async version of clearSync.

    @return {Promise<Object>} - { success, cleared_count, error }
    *********************************************************************/
    clear: async function () {

      return KvLocalstorage.clearSync();

    }

  };///////////////////////////Public Functions END//////////////////////////////



  //////////////////////////Private Functions START//////////////////////////////

  const _KvLocalstorage = {

    // ~~~~~~~~~~~~~~~~~~~~ Namespace Helpers ~~~~~~~~~~~~~~~~~~~~
    // Build, strip, and check namespaced keys.

    /********************************************************************
    Return the namespace prefix (NAMESPACE + ':' when non-empty, '' when
    empty).

    @return {String} - Namespace prefix
    *********************************************************************/
    getNamespacePrefix: function () {

      if (CONFIG.NAMESPACE === '') {
        return '';
      }

      return CONFIG.NAMESPACE + ':';

    },


    /********************************************************************
    Build the stored key by prepending the namespace prefix.

    @param {String} key - User-facing key

    @return {String} - Namespaced key for storage
    *********************************************************************/
    buildKey: function (key) {

      return _KvLocalstorage.getNamespacePrefix() + key;

    },


    /********************************************************************
    Strip the namespace prefix from a stored key.

    @param {String} storedKey - Key from the storage engine

    @return {String} - User-facing key without the prefix
    *********************************************************************/
    stripPrefix: function (storedKey) {

      const prefix = _KvLocalstorage.getNamespacePrefix();

      if (prefix === '') {
        return storedKey;
      }

      return storedKey.substring(prefix.length);

    },


    /********************************************************************
    Check whether a stored key belongs to this namespace.

    @param {String} storedKey - Key from the storage engine

    @return {boolean} - True if the key belongs to this namespace
    *********************************************************************/
    isNamespacedKey: function (storedKey) {

      const prefix = _KvLocalstorage.getNamespacePrefix();

      if (prefix === '') {
        return true;
      }

      return storedKey.indexOf(prefix) === 0;

    },


    // ~~~~~~~~~~~~~~~~~~~~ Validation Helpers ~~~~~~~~~~~~~~~~~~~~
    // Return the error object when invalid, null when valid.

    /********************************************************************
    Validate a single key. Returns the error object when invalid,
    null when valid.

    @param {String} key - Key to validate

    @return {Object|null} - Error object or null
    *********************************************************************/
    validateKey: function (key) {

      if (!Lib.Utils.isString(key) || key.length === 0 || key.indexOf(':') !== -1) {
        return ERRORS.INVALID_KEY;
      }

      return null;

    },


    /********************************************************************
    Validate an array of keys. Returns the error object when invalid,
    null when valid.

    @param {Array} keys - Keys to validate

    @return {Object|null} - Error object or null
    *********************************************************************/
    validateKeysArray: function (keys) {

      if (!Array.isArray(keys)) {
        return ERRORS.INVALID_KEYS;
      }

      for (let i = 0; i < keys.length; i++) {

        if (!Lib.Utils.isString(keys[i]) || keys[i].length === 0 || keys[i].indexOf(':') !== -1) {
          return ERRORS.INVALID_KEYS;
        }

      }

      return null;

    },


    /********************************************************************
    Validate a pairs object for batchWriteRecords. Returns the error
    object when invalid, null when valid.

    @param {Object} pairs - Key-value pairs to validate

    @return {Object|null} - Error object or null
    *********************************************************************/
    validatePairsObject: function (pairs) {

      if (!Lib.Utils.isObject(pairs) || Array.isArray(pairs)) {
        return ERRORS.INVALID_KEYS;
      }

      const keys = Object.keys(pairs);

      for (let i = 0; i < keys.length; i++) {

        if (keys[i].length === 0 || keys[i].indexOf(':') !== -1) {
          return ERRORS.INVALID_KEYS;
        }

      }

      return null;

    }

  };//////////////////////////Private Functions END//////////////////////////////


  return KvLocalstorage;

};/////////////////////////// createInterface END //////////////////////////////
