// Info: DynamoDB store adapter for js-server-helper-distinct-queue. Implements
// the 5-method store contract using a composite partition key + sort key.
//
// Schema:
//   - PK (`p`): tenant_id (String) - partition boundary
//   - SK (`id`): resource_id + '\u001F' + data_version_ms + '\u001F' + request_id (String)
//   - Attributes: payload (Map), action (String), toc (Number)
//
// The delimiter '\u001F' (ASCII unit separator) is a non-printable character
// that will never appear in caller-supplied resource_ids, eliminating
// delimiter collision risk.
//
// Query patterns:
//   - Exact resource: Query with PK=tenant_id AND begins_with(SK, resource_id + '\u001F')
//   - Prefix match:   Query with PK=tenant_id AND begins_with(SK, prefix)
//   - Delete stale:   Query then batch delete (DynamoDB has no range delete)
//
// The composite key design on { p, id } supports all access patterns.
// No Global Secondary Indexes required.
//
// The application injects a ready-to-use DynamoDB helper via
// STORE_CONFIG.lib_dynamodb (typically Lib.DynamoDB).
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
Store instance with its own table_name and lib_dynamodb reference.

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
@param {Object} STORE_CONFIG - { table_name, lib_dynamodb }
@param {Object} ERRORS       - Error catalog forwarded from distinct-queue.js

@return {Object} - Store interface (5 methods)
*********************************************************************/
const createInterface = function (Lib, STORE_CONFIG, ERRORS) {

  ////////////////////////////// Public Functions START ////////////////////////
  const Store = {


    // ~~~~~~~~~~~~~~~~~~~~ Schema Setup ~~~~~~~~~~~~~~~~~~~~

    /********************************************************************
    Idempotent table provisioning. Creates the table with composite key
    { p, id } if it doesn't exist. Pay-per-request billing is the
    correct default for queue workloads.

    @param {Object} instance - Request instance

    @return {Promise<Object>} - { success, error }
    *********************************************************************/
    setupNewStore: async function (instance) {

      // Provision the table idempotently with composite key {p, id}
      const result = await STORE_CONFIG.lib_dynamodb.createTable(instance, STORE_CONFIG.table_name, {
        attribute_definitions: [
          { name: 'p',  type: 'S' },
          { name: 'id', type: 'S' }
        ],
        key_schema: [
          { name: 'p',  type: 'HASH' },
          { name: 'id', type: 'RANGE' }
        ],
        billing_mode: 'PAY_PER_REQUEST'
      });

      // Return a service error if the driver call failed
      if (result.success === false) {
        Lib.Debug.debug('DistinctQueue dynamodb setupNewStore failed', {
          type: ERRORS.SERVICE_UNAVAILABLE.type,
          driver_type: result.error && result.error.type,
          driver_message: result.error && result.error.message
        });
        return {
          success: false,
          error: ERRORS.SERVICE_UNAVAILABLE
        };
      }

      // Report success - table is ready (or already existed)
      Lib.Debug.debug('DistinctQueue dynamodb setupNewStore complete', {
        type: 'SETUP_COMPLETE',
        already_exists: result.already_exists
      });

      return {
        success: true,
        error: null
      };

    },


    // ~~~~~~~~~~~~~~~~~~~~ Write Operation ~~~~~~~~~~~~~~~~~~~~

    /********************************************************************
    Append a record to the table. Uses PutItem for atomic write.
    The item has composite key { p, id } plus payload, action, toc.

    @param {Object} instance - Request instance
    @param {Object} record   - The record to write (tenant_id, resource_id,
                               data_version, request_id, payload, action, toc)

    @return {Promise<Object>} - { success, error }
    *********************************************************************/
    writeRecord: async function (instance, record) {

      // Compose the sort key from raw fields
      const sort_key = _Store.composeSortKey(
        record.resource_id,
        record.data_version,
        record.request_id
      );

      // Build the DynamoDB item with composite key
      const item = {
        p: record.tenant_id,
        id: sort_key,
        payload: record.payload,
        action: record.action,
        toc: record.toc
      };

      // Write the record using PutItem
      const result = await STORE_CONFIG.lib_dynamodb.writeRecord(
        instance,
        STORE_CONFIG.table_name,
        item
      );

      // Return service error on failure
      if (result && result.success === false) {
        Lib.Debug.debug('DistinctQueue dynamodb writeRecord failed', {
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

    Uses Query with PK=tenant_id AND begins_with(SK, resource_id + '\u001F')

    @param {Object} instance   - Request instance
    @param {String} tenant_id  - Partition key
    @param {String} resource_id - Exact resource identifier

    @return {Promise<Object>} - { success, records, error }
    *********************************************************************/
    queryByResourceId: async function (instance, tenant_id, resource_id) {

      // Query with partition key and begins_with on sort key
      // The '\u001F' suffix ensures we match the exact resource, not a prefix
      const result = await STORE_CONFIG.lib_dynamodb.query(
        instance,
        STORE_CONFIG.table_name,
        {
          pk: tenant_id,
          pkName: 'p',
          skCondition: 'begins_with(id, :prefix)',
          skValues: { ':prefix': resource_id + '\u001F' },
          scanForward: true
        }
      );

      // Return service error on failure
      if (result && result.success === false) {
        Lib.Debug.debug('DistinctQueue dynamodb queryByResourceId failed', {
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

      // Reconstruct records from DynamoDB items
      const records = (result.items || []).map(_Store.itemToRecord);

      return {
        success: true,
        records: records,
        error: null
      };

    },


    /********************************************************************
    Return all records for tenant_id whose resource_id starts with the
    given prefix, sorted by data_version ascending.

    Uses Query with PK=tenant_id AND begins_with(SK, prefix)

    @param {Object} instance          - Request instance
    @param {String} tenant_id         - Partition key
    @param {String} resource_id_prefix - Prefix to match (e.g., "account_123.")

    @return {Promise<Object>} - { success, records, error }
    *********************************************************************/
    queryByResourceIdPrefix: async function (instance, tenant_id, resource_id_prefix) {

      // Query with partition key and begins_with on sort key
      const result = await STORE_CONFIG.lib_dynamodb.query(
        instance,
        STORE_CONFIG.table_name,
        {
          pk: tenant_id,
          pkName: 'p',
          skCondition: 'begins_with(id, :prefix)',
          skValues: { ':prefix': resource_id_prefix },
          scanForward: true
        }
      );

      // Return service error on failure
      if (result && result.success === false) {
        Lib.Debug.debug('DistinctQueue dynamodb queryByResourceIdPrefix failed', {
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

      // Reconstruct records from DynamoDB items
      const records = (result.items || []).map(_Store.itemToRecord);

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

    DynamoDB does not support range delete, so we:
    1. Query for all records matching tenant_id + resource_id
    2. Filter to items where data_version <= boundary
    3. Batch delete the matching keys

    @param {Object} instance               - Request instance
    @param {String} tenant_id              - Partition key
    @param {String} resource_id            - Resource identifier
    @param {Number} data_version_boundary - Upper bound (inclusive)

    @return {Promise<Object>} - { success, error }
    *********************************************************************/
    deleteByDataVersionLte: async function (instance, tenant_id, resource_id, data_version_boundary) {

      // Step 1: Query for all records for this tenant + resource
      const query_result = await STORE_CONFIG.lib_dynamodb.query(
        instance,
        STORE_CONFIG.table_name,
        {
          pk: tenant_id,
          pkName: 'p',
          skCondition: 'begins_with(id, :prefix)',
          skValues: { ':prefix': resource_id + '\u001F' },
          scanForward: true
        }
      );

      // Return service error on query failure
      if (query_result && query_result.success === false) {
        Lib.Debug.debug('DistinctQueue dynamodb deleteByDataVersionLte query failed', {
          type: ERRORS.SERVICE_UNAVAILABLE.type,
          driver_type: query_result.error && query_result.error.type,
          driver_message: query_result.error && query_result.error.message
        });
        return {
          success: false,
          error: ERRORS.SERVICE_UNAVAILABLE
        };
      }

      // Step 2: Filter to items where data_version <= boundary
      const items = query_result.items || [];
      const keys_to_delete = [];

      for (const item of items) {
        const record = _Store.itemToRecord(item);
        if (record.data_version <= data_version_boundary) {
          keys_to_delete.push({ p: item.p, id: item.id });
        }
      }

      // Short-circuit if nothing to delete
      if (keys_to_delete.length === 0) {
        return {
          success: true,
          error: null
        };
      }

      // Step 3: Batch delete the matching keys
      const keysByTable = {};
      keysByTable[STORE_CONFIG.table_name] = keys_to_delete;

      const delete_result = await STORE_CONFIG.lib_dynamodb.batchDeleteRecords(
        instance,
        keysByTable
      );

      // Return service error on delete failure
      if (delete_result && delete_result.success === false) {
        Lib.Debug.debug('DistinctQueue dynamodb deleteByDataVersionLte batchDelete failed', {
          type: ERRORS.SERVICE_UNAVAILABLE.type,
          driver_type: delete_result.error && delete_result.error.type,
          driver_message: delete_result.error && delete_result.error.message
        });
        return {
          success: false,
          error: ERRORS.SERVICE_UNAVAILABLE
        };
      }

      Lib.Debug.debug('DistinctQueue dynamodb deleteByDataVersionLte complete', {
        deleted_count: keys_to_delete.length,
        tenant_id: tenant_id,
        resource_id: resource_id,
        boundary: data_version_boundary
      });

      return {
        success: true,
        error: null
      };

    }


  };//////////////////////////// Public Functions END //////////////////////////



  ///////////////////////////// Private Functions START ////////////////////////
  const _Store = {

    // ~~~~~~~~~~~~~~~~~~~~ Key Composition ~~~~~~~~~~~~~~~~~~~~

    /********************************************************************
    Compose the DynamoDB sort key from raw record fields.
    Format: resource_id + '\u001F' + data_version + '\u001F' + request_id

    @param {String} resource_id  - Opaque resource identifier
    @param {Number} data_version - Millisecond timestamp
    @param {String} request_id   - Compact UUID

    @return {String} - Composite sort key
    *********************************************************************/
    composeSortKey: function (resource_id, data_version, request_id) {
      return resource_id + '\u001F' + data_version + '\u001F' + request_id;
    },


    // ~~~~~~~~~~~~~~~~~~~~ Record Reconstruction ~~~~~~~~~~~~~~~~~~~~

    /********************************************************************
    Reconstruct a full record from the DynamoDB item.
    The item has PK `p`, SK `id`, and attributes payload, action, toc.
    We parse the sort_key to extract resource_id, data_version, request_id.

    @param {Object} item - The DynamoDB item { p, id, payload, action, toc }

    @return {Object} - Record with top-level tenant_id, resource_id, data_version, etc.
    *********************************************************************/
    itemToRecord: function (item) {
      // Parse the sort_key to extract components
      // sort_key format: resource_id + '\u001F' + data_version + '\u001F' + request_id
      const sort_key_parts = item.id.split('\u001F');
      const resource_id = sort_key_parts[0];
      const data_version = parseInt(sort_key_parts[1], 10);
      const request_id = sort_key_parts[2];

      return {
        tenant_id: item.p,
        resource_id: resource_id,
        data_version: data_version,
        request_id: request_id,
        sort_key: item.id,
        payload: item.payload,
        action: item.action,
        toc: item.toc
      };
    }


  };/////////////////////////// Private Functions END //////////////////////////

  return Store;

};///////////////////////////// createInterface END ////////////////////////////
