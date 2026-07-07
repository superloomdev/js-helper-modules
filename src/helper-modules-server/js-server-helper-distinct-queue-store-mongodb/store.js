// Info: MongoDB store adapter for helper-distinct-queue.
// Implements the 4-method store contract using a subdocument _id.
//
// The application injects a ready-to-use MongoDB helper via Lib.MongoDB.
//
// Schema:
//   - _id: { t, r, d, s } - (tenant_id, resource_id, data_version, request_id)
//   - Attributes: payload (Object), action (String), toc (Number)
//
// The implicit _id index covers all access patterns. No secondary indexes needed.
//
// Store contract (identical shape across all adapters, validated by the parent):
//   - writeRecord(instance, record)                                    -> { success, error }
//   - queryByResourceId(instance, tenant_id, resource_id)             -> { success, records, error }
//   - queryByResourceIdPrefix(instance, tenant_id, resource_id_prefix) -> { success, records, error }
//   - deleteByDataVersionLte(instance, tenant_id, resource_id, dv)    -> { success, error }
//
// Plus an idempotent provisioning method (not part of the validated contract):
//   - setupNewStore(instance)                                          -> { success, error }

'use strict';



/////////////////////////// Module-Loader START ////////////////////////////////

/********************************************************************
Factory loader. One call = one independent store instance with its
own Lib, CONFIG, ERRORS, and Validators. Validates CONFIG at construction so
misconfiguration fails fast at startup, not on first request.

@param {Object} shared_libs - Lib container with Utils, Debug, MongoDB
@param {Object} config      - Overrides merged over adapter config defaults

@return {Object} - Store interface (4 contract methods + setupNewStore)
*********************************************************************/
module.exports = function loader (shared_libs, config) {

  // Dependencies for this instance
  const Lib = {
    Utils: shared_libs.Utils,
    Debug: shared_libs.Debug,
    MongoDB: shared_libs.MongoDB
  };

  // Merge overrides over defaults
  const CONFIG = Object.assign(
    {},
    require('./store.config'),
    config || {}
  );

  // Load internal error catalog
  const ERRORS = require('./store.errors');

  // Load the validators singleton and inject Lib + ERRORS
  const Validators = require('./store.validators')(Lib, ERRORS);

  // Validate CONFIG - throws on misconfiguration
  Validators.validateConfig(CONFIG);

  return createInterface(Lib, CONFIG, ERRORS, Validators);

};///////////////////////////// Module-Loader END ///////////////////////////////



/////////////////////////// createInterface START //////////////////////////////

/********************************************************************
Builds the public Store interface. All functions close over
Lib, CONFIG, ERRORS, and Validators.

@param {Object} Lib       - Dependency container (Utils, Debug, MongoDB)
@param {Object} CONFIG    - Merged adapter configuration { collection_name }
@param {Object} ERRORS    - Frozen error catalog
@param {Object} Validators - Config validators (unused, kept for cross-module consistency)

@return {Object} - Store interface (4 contract methods + setupNewStore)
*********************************************************************/
const createInterface = function (Lib, CONFIG, ERRORS, Validators) { // eslint-disable-line no-unused-vars

  ////////////////////////////// Public Functions START //////////////////////////////
  const Store = {


    // ~~~~~~~~~~~~~~~~~~~~ First-Time Provisioning ~~~~~~~~~~~~~~~~~~~~
    // Run once on first deploy to verify the store is reachable. No-op for MongoDB.

    /********************************************************************
    One-time store provisioning. Run once when setting up the store for
    the first time - not on every application boot.

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
    // Append a queue record identified by the compound _id subdocument.

    /********************************************************************
    Append a record to the collection using Lib.MongoDB.writeRecord
    with the compound _id subdocument { t, r, d, s }.

    @param {Object} instance - Request instance
    @param {Object} record   - The record to write (tenant_id, resource_id,
                               data_version, request_id, payload, action, toc)

    @return {Promise<Object>} - { success, error }
    *********************************************************************/
    writeRecord: async function (instance, record) {

      const start_ms = Lib.Utils.getUnixTimeInMilliSeconds();

      // Build the document with compound _id
      const document = {
        _id: _Store.composeId(record.tenant_id, record.resource_id, record.data_version, record.request_id),
        payload: record.payload,
        action: record.action,
        toc: record.toc
      };

      // Insert the record using upsert - compound _id guarantees uniqueness
      const result = await Lib.MongoDB.writeRecord(
        instance,
        CONFIG.collection_name,
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
        Lib.Debug.performanceAuditLog('End', 'DistinctQueue mongodb writeRecord - ' + CONFIG.collection_name, start_ms);
        return {
          success: false,
          error: ERRORS.SERVICE_UNAVAILABLE
        };
      }

      Lib.Debug.performanceAuditLog('End', 'DistinctQueue mongodb writeRecord - ' + CONFIG.collection_name, start_ms);

      return {
        success: true,
        error: null
      };

    },


    // ~~~~~~~~~~~~~~~~~~~~ Query Operations ~~~~~~~~~~~~~~~~~~~~
    // Read records by exact resource or by resource_id prefix.

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

      const start_ms = Lib.Utils.getUnixTimeInMilliSeconds();

      // Query by exact tenant_id + resource_id using _id subdocument fields
      const result = await Lib.MongoDB.query(
        instance,
        CONFIG.collection_name,
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
        Lib.Debug.performanceAuditLog('End', 'DistinctQueue mongodb queryByResourceId - ' + CONFIG.collection_name, start_ms);
        return {
          success: false,
          records: null,
          error: ERRORS.SERVICE_UNAVAILABLE
        };
      }

      // Reconstruct records from _id subdocument to match expected shape
      const records = (result.documents || []).map(_Store.docToRecord);

      Lib.Debug.performanceAuditLog('End', 'DistinctQueue mongodb queryByResourceId - ' + CONFIG.collection_name, start_ms);

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

      const start_ms = Lib.Utils.getUnixTimeInMilliSeconds();

      // Escape regex special characters in the prefix to prevent injection
      const escaped_prefix = resource_id_prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      // Query with regex prefix match on _id.r
      const result = await Lib.MongoDB.query(
        instance,
        CONFIG.collection_name,
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
        Lib.Debug.performanceAuditLog('End', 'DistinctQueue mongodb queryByResourceIdPrefix - ' + CONFIG.collection_name, start_ms);
        return {
          success: false,
          records: null,
          error: ERRORS.SERVICE_UNAVAILABLE
        };
      }

      // Reconstruct records from _id subdocument to match expected shape
      const records = (result.documents || []).map(_Store.docToRecord);

      Lib.Debug.performanceAuditLog('End', 'DistinctQueue mongodb queryByResourceIdPrefix - ' + CONFIG.collection_name, start_ms);

      return {
        success: true,
        records: records,
        error: null
      };

    },


    // ~~~~~~~~~~~~~~~~~~~~ Delete Operation ~~~~~~~~~~~~~~~~~~~~
    // Remove stale records up to and including a data_version boundary.

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

      const start_ms = Lib.Utils.getUnixTimeInMilliSeconds();

      // Delete matching records using _id subdocument fields
      const result = await Lib.MongoDB.deleteRecordsByFilter(
        instance,
        CONFIG.collection_name,
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
        Lib.Debug.performanceAuditLog('End', 'DistinctQueue mongodb deleteByDataVersionLte - ' + CONFIG.collection_name, start_ms);
        return {
          success: false,
          error: ERRORS.SERVICE_UNAVAILABLE
        };
      }

      Lib.Debug.performanceAuditLog('End', 'DistinctQueue mongodb deleteByDataVersionLte - ' + CONFIG.collection_name, start_ms);

      return {
        success: true,
        error: null
      };

    }


  };////////////////////////////// Public Functions END //////////////////////////////



  ///////////////////////////// Private Functions START //////////////////////////////
  const _Store = {

    /********************************************************************
    Build the compound _id subdocument from components.
    Field keys are single-character to save space: t, r, d, s

    @param {String} tenant_id - Partition boundary
    @param {String} resource_id - Resource identifier
    @param {Number} data_version - Millisecond timestamp
    @param {String} request_id - Compact UUID tie-breaker

    @return {Object} - { t, r, d, s }
    *********************************************************************/
    composeId: function (tenant_id, resource_id, data_version, request_id) {
      return { t: tenant_id, r: resource_id, d: data_version, s: request_id };
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
        request_id: doc._id.s,
        payload: doc.payload,
        action: doc.action,
        toc: doc.toc
      };
    }

  };///////////////////////////// Private Functions END //////////////////////////////

  return Store;

};/////////////////////////// createInterface END //////////////////////////////
