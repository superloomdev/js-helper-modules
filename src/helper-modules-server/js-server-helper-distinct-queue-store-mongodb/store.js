// Info: MongoDB store adapter for js-server-helper-distinct-queue. Implements
// the 4-method store contract using a subdocument _id.
//
// The _id field is a compound object: { t, r, d, s }
//   - t: tenant_id (string) - partition boundary
//   - r: resource_id (string) - supports prefix queries via $regex
//   - d: data_version (number) - millisecond timestamp for sorting
//   - s: random_suffix (string) - compact UUID for tie-breaking
//
// Query patterns:
//   - Exact resource: find({ "_id.t": t, "_id.r": r }).sort({ "_id.d": 1 })
//   - Prefix match:   find({ "_id.t": t, "_id.r": { $regex: '^prefix' } }).sort({ "_id.d": 1 })
//   - Delete stale:   deleteMany({ "_id.t": t, "_id.r": r, "_id.d": { $lte: N } })
//
// The implicit _id index on { t, r, d, s } covers all access patterns.
// No secondary indexes required.
//
// The application injects a ready-to-use MongoDB helper via
// STORE_CONFIG.lib_mongodb (typically Lib.MongoDB).
//
// Store contract (identical shape across all adapters):
//   - setupNewStore(instance)                                           -> { success, error }
//   - writeRecord(instance, record)                                    -> { success, error }
//   - queryByResourceId(instance, tenant_id, resource_id)                -> { success, records, error }
//   - queryByResourceIdPrefix(instance, tenant_id, resource_id_prefix)   -> { success, records, error }
//   - deleteByDataVersionLte(instance, tenant_id, resource_id, dv)     -> { success, error }

'use strict';



/////////////////////////// Module-Loader START ////////////////////////////////

/********************************************************************
Thin loader. Validates STORE_CONFIG via the Validators singleton
then delegates to createInterface. Each call returns an independent
Store instance with its own collection_name and lib_mongodb reference.

The ERRORS catalog is forwarded from distinct-queue.js so the adapter
can return the same error shapes as the core module.

@param {Object} Lib    - Dependency container (Utils, Debug)
@param {Object} CONFIG - Merged module configuration
@param {Object} ERRORS - Error catalog forwarded from distinct-queue.js

@return {Object} - Store interface (5 methods: setupNewStore, writeRecord,
                    queryByResourceId, queryByResourceIdPrefix, deleteByDataVersionLte)
*********************************************************************/
module.exports = function loader (Lib, CONFIG, ERRORS) {

  // Load the validators singleton and inject Lib
  const Validators = require('./store.validators')(Lib);

  // Validate STORE_CONFIG - throws on misconfiguration
  Validators.validateConfig(CONFIG.STORE_CONFIG);

  return createInterface(Lib, CONFIG.STORE_CONFIG, ERRORS);

};///////////////////////////// Module-Loader END ///////////////////////////////



/////////////////////////// createInterface START //////////////////////////////

/********************************************************************
Builds the public Store interface for one instance. All functions
close over the same Lib, STORE_CONFIG, and ERRORS.

@param {Object} Lib          - Dependency container (Utils, Debug)
@param {Object} STORE_CONFIG - { collection_name, lib_mongodb }
@param {Object} ERRORS       - Error catalog forwarded from distinct-queue.js

@return {Object} - Store interface (5 methods)
*********************************************************************/
const createInterface = function (Lib, STORE_CONFIG, ERRORS) {

  ////////////////////////////// Public Functions START ////////////////////////
  const Store = {


    // ~~~~~~~~~~~~~~~~~~~~ First-Time Provisioning ~~~~~~~~~~~~~~~~~~~~

    /********************************************************************
    One-time store provisioning. Run once when setting up the store for
    the first time — not on every application boot.

    No-op for this adapter: MongoDB creates the collection and implicit
    _id index automatically on first write. No explicit setup needed.

    @param {Object} instance - Request instance

    @return {Promise<Object>} - { success, error }
    *********************************************************************/
    setupNewStore: async function (instance) { // eslint-disable-line no-unused-vars

      // The subdocument _id is automatically indexed by MongoDB.
      // No explicit index creation needed.
      Lib.Debug.debug('DistinctQueue mongodb setupNewStore - implicit _id index covers all queries', {
        type: 'SETUP_COMPLETE'
      });

      return {
        success: true,
        error: null
      };

    },


    // ~~~~~~~~~~~~~~~~~~~~ Write Operation ~~~~~~~~~~~~~~~~~~~~

    /********************************************************************
    Append a record to the collection. Calls lib_mongodb.writeRecord
    with the compound _id subdocument { t, r, d, s }.

    @param {Object} instance - Request instance
    @param {Object} record   - The record to write (tenant_id, resource_id,
                               data_version, random_suffix, payload, action, toc)

    @return {Promise<Object>} - { success, error }
    *********************************************************************/
    writeRecord: async function (instance, record) {

      // Build the document with compound _id
      const document = {
        _id: _Store.composeId(record.tenant_id, record.resource_id, record.data_version, record.random_suffix),
        payload: record.payload,
        action: record.action,
        toc: record.toc
      };

      // Insert the record using upsert — compound _id guarantees uniqueness
      const result = await STORE_CONFIG.lib_mongodb.writeRecord(
        instance,
        STORE_CONFIG.collection_name,
        { _id: document._id },
        document
      );

      // Return service error on failure
      if (result && result.success === false) {
        Lib.Debug.debug('DistinctQueue mongodb writeRecord failed', {
          type: ERRORS.SERVICE_UNAVAILABLE.type,
          driver_type: result.error && result.error.type,
          driver_message: result.error && result.error.message
        });
        return {
          success: false,
          error: ERRORS.SERVICE_UNAVAILABLE
        };
      }

      return {
        success: true,
        error: null
      };

    },


    // ~~~~~~~~~~~~~~~~~~~~ Query Operations ~~~~~~~~~~~~~~~~~~~~

    /********************************************************************
    Return all records matching (tenant_id, resource_id), sorted by
    data_version ascending (chronological order).

    Uses the implicit _id index via dot notation: _id.t, _id.r, _id.d

    @param {Object} instance   - Request instance
    @param {String} tenant_id  - Partition key
    @param {String} resource_id - Exact resource identifier

    @return {Promise<Object>} - { success, records, error }
    *********************************************************************/
    queryByResourceId: async function (instance, tenant_id, resource_id) {

      // Query by exact tenant_id + resource_id using _id subdocument fields
      const result = await STORE_CONFIG.lib_mongodb.query(
        instance,
        STORE_CONFIG.collection_name,
        { '_id.t': tenant_id, '_id.r': resource_id },
        { sort: { '_id.d': 1 } }
      );

      // Return service error on failure
      if (result && result.success === false) {
        Lib.Debug.debug('DistinctQueue mongodb queryByResourceId failed', {
          type: ERRORS.SERVICE_UNAVAILABLE.type,
          driver_type: result.error && result.error.type,
          driver_message: result.error && result.error.message
        });
        return {
          success: false,
          records: null,
          error: ERRORS.SERVICE_UNAVAILABLE
        };
      }

      // Reconstruct records from _id subdocument to match expected shape
      const records = (result.documents || []).map(_Store.docToRecord);

      return {
        success: true,
        records: records,
        error: null
      };

    },


    /********************************************************************
    Return all records for tenant_id whose resource_id starts with the
    given prefix, sorted by data_version ascending.

    Uses MongoDB $regex with ^anchor on _id.r for prefix matching.
    The implicit _id index supports this query pattern.

    @param {Object} instance          - Request instance
    @param {String} tenant_id         - Partition key
    @param {String} resource_id_prefix - Prefix to match (e.g., "account_123.")

    @return {Promise<Object>} - { success, records, error }
    *********************************************************************/
    queryByResourceIdPrefix: async function (instance, tenant_id, resource_id_prefix) {

      // Escape regex special characters in the prefix to prevent injection
      const escaped_prefix = resource_id_prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      // Query with regex prefix match on _id.r
      const result = await STORE_CONFIG.lib_mongodb.query(
        instance,
        STORE_CONFIG.collection_name,
        {
          '_id.t': tenant_id,
          '_id.r': { $regex: '^' + escaped_prefix }
        },
        { sort: { '_id.d': 1 } }
      );

      // Return service error on failure
      if (result && result.success === false) {
        Lib.Debug.debug('DistinctQueue mongodb queryByResourceIdPrefix failed', {
          type: ERRORS.SERVICE_UNAVAILABLE.type,
          driver_type: result.error && result.error.type,
          driver_message: result.error && result.error.message
        });
        return {
          success: false,
          records: null,
          error: ERRORS.SERVICE_UNAVAILABLE
        };
      }

      // Reconstruct records from _id subdocument to match expected shape
      const records = (result.documents || []).map(_Store.docToRecord);

      return {
        success: true,
        records: records,
        error: null
      };

    },


    // ~~~~~~~~~~~~~~~~~~~~ Delete Operation ~~~~~~~~~~~~~~~~~~~~

    /********************************************************************
    Delete all records for (tenant_id, resource_id) where
    data_version <= data_version_boundary.

    Uses _id subdocument fields: _id.t, _id.r, _id.d
    This is used during claim() to remove stale records after the latest
    is selected.

    @param {Object} instance               - Request instance
    @param {String} tenant_id              - Partition key
    @param {String} resource_id            - Resource identifier
    @param {Number} data_version_boundary - Upper bound (inclusive)

    @return {Promise<Object>} - { success, error }
    *********************************************************************/
    deleteByDataVersionLte: async function (instance, tenant_id, resource_id, data_version_boundary) {

      // Delete matching records using _id subdocument fields
      const result = await STORE_CONFIG.lib_mongodb.deleteRecordsByFilter(
        instance,
        STORE_CONFIG.collection_name,
        {
          '_id.t': tenant_id,
          '_id.r': resource_id,
          '_id.d': { $lte: data_version_boundary }
        }
      );

      // Return service error on failure
      if (result && result.success === false) {
        Lib.Debug.debug('DistinctQueue mongodb deleteByDataVersionLte failed', {
          type: ERRORS.SERVICE_UNAVAILABLE.type,
          driver_type: result.error && result.error.type,
          driver_message: result.error && result.error.message
        });
        return {
          success: false,
          error: ERRORS.SERVICE_UNAVAILABLE
        };
      }

      return {
        success: true,
        error: null
      };

    }


  };//////////////////////////// Public Functions END //////////////////////////



  ///////////////////////////// Private Functions START ////////////////////////
  const _Store = {

    /********************************************************************
    Build the compound _id subdocument from components.
    Field keys are single-character to save space: t, r, d, s

    @param {String} tenant_id - Partition boundary
    @param {String} resource_id - Resource identifier
    @param {Number} data_version - Millisecond timestamp
    @param {String} random_suffix - Compact UUID tie-breaker

    @return {Object} - { t, r, d, s }
    *********************************************************************/
    composeId: function (tenant_id, resource_id, data_version, random_suffix) {
      return { t: tenant_id, r: resource_id, d: data_version, s: random_suffix };
    },


    /********************************************************************
    Reconstruct a full record from the stored document.
    The stored document has _id subdocument; we expand it to top-level fields
    expected by the core module.

    @param {Object} doc - The MongoDB document { _id: {t,r,d,s}, payload, action, toc }

    @return {Object} - Record with top-level tenant_id, resource_id, data_version, etc.
    *********************************************************************/
    docToRecord: function (doc) {
      return {
        tenant_id: doc._id.t,
        resource_id: doc._id.r,
        data_version: doc._id.d,
        random_suffix: doc._id.s,
        payload: doc.payload,
        action: doc.action,
        toc: doc.toc
      };
    }

  };/////////////////////////// Private Functions END //////////////////////////

  return Store;

};///////////////////////////// createInterface END ////////////////////////////
