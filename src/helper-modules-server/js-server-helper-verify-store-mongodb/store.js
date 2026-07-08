// Info: MongoDB store adapter for helper-verify. Fully independent
// module that owns its own CONFIG, ERRORS, and Validators. Uses a compound
// `_id` of `{ scope, id }` so reads/writes hit the implicit `_id` index
// without any secondary index. Native TTL is implemented via a `_ttl`
// Date field + a TTL index (`{ _ttl: 1 }, expireAfterSeconds: 0`); the
// Date mirror is the only field MongoDB's TTL sweeper recognises.
//
// `expires_at` (epoch seconds) is stored alongside `_ttl` because the
// verify module reads it directly during the consume-time expiry check.
//
// Standard factory shape: receives shared_libs, picks MongoDB driver as
// Lib.MongoDB (backend-specific key - not interchangeable with other NoSQL).
//
// Store contract (identical shape across all adapters):
//   - setupNewStore(instance)                        -> { success, error }
//   - getRecord(instance, scope, key)              -> { success, record, error }
//   - setRecord(instance, scope, key, record)      -> { success, error }
//   - incrementFailCount(instance, scope, key)     -> { success, error }
//   - deleteRecord(instance, scope, key)           -> { success, error }
//   - cleanupExpiredRecords(instance)              -> { success, deleted_count, error }

'use strict';



/////////////////////////// Module-Loader START ////////////////////////////////

/********************************************************************
Thin loader. Picks dependencies from the injected container, merges
config over defaults, validates config via the Validators singleton,
then delegates to createInterface. Each call returns an independent
Store instance.

@param {Object} shared_libs - Dependency container (Utils, Debug, MongoDB)
@param {Object} config      - Overrides merged over adapter config defaults

@return {Object} - Store interface (6 methods: setupNewStore, getRecord, setRecord, incrementFailCount, deleteRecord, cleanupExpiredRecords)
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

@return {Object} - Store interface (6 methods: setupNewStore, getRecord, setRecord, incrementFailCount, deleteRecord, cleanupExpiredRecords)
*********************************************************************/
const createInterface = function (Lib, CONFIG, ERRORS, Validators) { // eslint-disable-line no-unused-vars

  ////////////////////////////// Public Functions START ////////////////////////
  const Store = {


    // ~~~~~~~~~~~~~~~~~~~~ Schema Setup ~~~~~~~~~~~~~~~~~~~~

    /********************************************************************
    Idempotent setup. Creates the TTL index on `_ttl`. The compound
    `_id` index is implicit so no second index is needed for the
    primary access path.

    @param {Object} instance - Request instance

    @return {Promise<Object>} - { success, error }
    *********************************************************************/
    setupNewStore: async function (instance) {

      // Create the TTL index on `_ttl` - idempotent via createIndex
      const result = await Lib.MongoDB.createIndex(
        instance,
        CONFIG.collection_name,
        { _ttl: 1 },
        { name: 'verify_ttl_idx', expireAfterSeconds: 0 }
      );

      // Return a service error if the driver call failed
      if (result && result.success === false) {
        Lib.Debug.debug('Verify mongodb setupNewStore failed', {
          type: ERRORS.SERVICE_UNAVAILABLE.type,
          driver_type: result.error && result.error.type,
          driver_message: result.error && result.error.message
        });
        return {
          success: false,
          error: ERRORS.SERVICE_UNAVAILABLE
        };
      }

      // Report success - TTL index is ready
      return {
        success: true,
        error: null
      };

    },


    // ~~~~~~~~~~~~~~~~~~~~ CRUD ~~~~~~~~~~~~~~~~~~~~

    /********************************************************************
    Equality lookup on the compound `_id` - O(1) via the implicit index.
    Returns null when absent.

    @param {Object} instance - Request instance
    @param {String} scope    - Logical owner namespace
    @param {String} key      - Specific verification purpose

    @return {Promise<Object>} - { success, record, error }
    *********************************************************************/
    getRecord: async function (instance, scope, key) {

      // Equality lookup on the compound _id - O(1) via the implicit index
      const result = await Lib.MongoDB.getRecord(
        instance,
        CONFIG.collection_name,
        { _id: { scope: scope, id: key } }
      );

      // Return a service error if the driver call failed
      if (result.success === false) {
        Lib.Debug.debug('Verify mongodb getRecord failed', {
          type: ERRORS.SERVICE_UNAVAILABLE.type,
          driver_type: result.error && result.error.type,
          driver_message: result.error && result.error.message
        });
        return {
          success: false,
          record: null,
          error: ERRORS.SERVICE_UNAVAILABLE
        };
      }

      // Return early when the document does not exist
      if (result.document === null || result.document === undefined) {
        return {
          success: true,
          record: null,
          error: null
        };
      }

      // Map the MongoDB document to the canonical record shape
      return {
        success: true,
        record: {
          code: result.document.code,
          fail_count: result.document.fail_count,
          created_at: result.document.created_at,
          expires_at: result.document.expires_at
        },
        error: null
      };

    },


    /********************************************************************
    Upsert via replaceOne. The `_ttl` Date is computed from `expires_at`
    so a single source of truth (epoch seconds) feeds both the TTL
    sweeper and the verify-time expiry check.

    @param {Object} instance - Request instance
    @param {String} scope    - Logical owner namespace
    @param {String} key      - Specific verification purpose
    @param {Object} record   - { code, fail_count, created_at, expires_at }

    @return {Promise<Object>} - { success, error }
    *********************************************************************/
    setRecord: async function (instance, scope, key, record) {

      // Build the filter and full replacement document
      const filter = { _id: { scope: scope, id: key } };
      const document = {
        _id: { scope: scope, id: key },
        code: record.code,
        fail_count: record.fail_count,
        created_at: record.created_at,
        expires_at: record.expires_at,
        _ttl: new Date(record.expires_at * 1000)
      };

      // Upsert via replaceOne - always overwrites by compound _id
      const result = await Lib.MongoDB.writeRecord(
        instance,
        CONFIG.collection_name,
        filter,
        document
      );

      // Return a service error if the driver call failed
      if (result.success === false) {
        Lib.Debug.debug('Verify mongodb setRecord failed', {
          type: ERRORS.SERVICE_UNAVAILABLE.type,
          driver_type: result.error && result.error.type,
          driver_message: result.error && result.error.message
        });
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
    Atomic $inc - safe under concurrent verify attempts.

    @param {Object} instance - Request instance
    @param {String} scope    - Logical owner namespace
    @param {String} key      - Specific verification purpose

    @return {Promise<Object>} - { success, error }
    *********************************************************************/
    incrementFailCount: async function (instance, scope, key) {

      // Atomic $inc - safe under concurrent verify attempts
      const result = await Lib.MongoDB.updateRecord(
        instance,
        CONFIG.collection_name,
        { _id: { scope: scope, id: key } },
        { $inc: { fail_count: 1 } }
      );

      // Return a service error if the driver call failed
      if (result.success === false) {
        Lib.Debug.debug('Verify mongodb incrementFailCount failed', {
          type: ERRORS.SERVICE_UNAVAILABLE.type,
          driver_type: result.error && result.error.type,
          driver_message: result.error && result.error.message
        });
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
    Idempotent delete (missing _id is treated as success).

    @param {Object} instance - Request instance
    @param {String} scope    - Logical owner namespace
    @param {String} key      - Specific verification purpose

    @return {Promise<Object>} - { success, error }
    *********************************************************************/
    deleteRecord: async function (instance, scope, key) {

      // Delete by compound _id - idempotent (missing document is success)
      const result = await Lib.MongoDB.deleteRecord(
        instance,
        CONFIG.collection_name,
        { _id: { scope: scope, id: key } }
      );

      // Return a service error if the driver call failed
      if (result.success === false) {
        Lib.Debug.debug('Verify mongodb deleteRecord failed', {
          type: ERRORS.SERVICE_UNAVAILABLE.type,
          driver_type: result.error && result.error.type,
          driver_message: result.error && result.error.message
        });
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


    // ~~~~~~~~~~~~~~~~~~~~ Lifecycle ~~~~~~~~~~~~~~~~~~~~

    /********************************************************************
    Manual sweep mirroring the SQL stores. The native TTL index is the
    primary mechanism, but this method supports explicit lifecycle control.

    @param {Object} instance - Request instance

    @return {Promise<Object>} - { success, deleted_count, error }
    *********************************************************************/
    cleanupExpiredRecords: async function (instance) {

      // deleteMany all documents whose expires_at is in the past
      const now = instance.time;
      const result = await Lib.MongoDB.deleteRecordsByFilter(
        instance,
        CONFIG.collection_name,
        { expires_at: { $lt: now } }
      );

      // Return a service error if the driver call failed
      if (result.success === false) {
        Lib.Debug.debug('Verify mongodb cleanupExpiredRecords failed', {
          type: ERRORS.SERVICE_UNAVAILABLE.type,
          driver_type: result.error && result.error.type,
          driver_message: result.error && result.error.message
        });
        return {
          success: false,
          deleted_count: 0,
          error: ERRORS.SERVICE_UNAVAILABLE
        };
      }

      // Report success with the count of expired documents removed
      return {
        success: true,
        deleted_count: result.deletedCount,
        error: null
      };

    }

  };////////////////////////////// Public Functions END ////////////////////////

  return Store;

};///////////////////////////// createInterface END /////////////////////////////
