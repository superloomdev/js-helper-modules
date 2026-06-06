// Info: DynamoDB store adapter for js-server-helper-distinct-queue. Implements
// the 5-method store contract using a composite partition key + sort key.
//
// Schema:
//   - PK (`p`): tenant_id (String) - partition boundary
//   - SK (`id`): resource_id + '\u001F' + data_version_ms + '\u001F' + request_id (String)
//   - Attributes: payload (Map), action (String), toc (Number)
//
// The sort key delimiter is a non-printable character (ASCII unit separator)
// defined once in store.config.js as KEY_DELIMITER. It will never appear in
// caller-supplied resource_ids, eliminating delimiter collision risk.
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


// Internal storage-format constants (key delimiter). Owned by the adapter,
// not user-tunable. See store.config.js for the rationale.
const Config = require('./store.config');



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
        _Store.logDriverFailure('setupNewStore', result.error);
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
        _Store.logDriverFailure('writeRecord', result.error);
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

      // The delimiter suffix pins the match to this exact resource, excluding
      // sibling resources that merely share its prefix.
      const result = await _Store.runPrefixQuery(
        instance,
        tenant_id,
        _Store.exactResourcePrefix(resource_id)
      );

      // Return service error on failure
      if (result && result.success === false) {
        _Store.logDriverFailure('queryByResourceId', result.error);
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

      // The caller-supplied prefix is matched verbatim against the sort key,
      // so it spans every resource_id beginning with it.
      const result = await _Store.runPrefixQuery(
        instance,
        tenant_id,
        resource_id_prefix
      );

      // Return service error on failure
      if (result && result.success === false) {
        _Store.logDriverFailure('queryByResourceIdPrefix', result.error);
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
      const query_result = await _Store.runPrefixQuery(
        instance,
        tenant_id,
        _Store.exactResourcePrefix(resource_id)
      );

      // Return service error on query failure
      if (query_result && query_result.success === false) {
        _Store.logDriverFailure('deleteByDataVersionLte query', query_result.error);
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
        _Store.logDriverFailure('deleteByDataVersionLte batchDelete', delete_result.error);
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

    // ~~~~~~~~~~~~~~~~~~~~ Key Composition & Parsing ~~~~~~~~~~~~~~~~~~~~

    /********************************************************************
    Compose the DynamoDB sort key from raw record fields. The three
    segments are joined by Config.KEY_DELIMITER:
      resource_id + KEY_DELIMITER + data_version + KEY_DELIMITER + request_id

    @param {String} resource_id  - Opaque resource identifier
    @param {Number} data_version - Millisecond timestamp
    @param {String} request_id   - Compact UUID

    @return {String} - Composite sort key
    *********************************************************************/
    composeSortKey: function (resource_id, data_version, request_id) {
      return resource_id + Config.KEY_DELIMITER + data_version + Config.KEY_DELIMITER + request_id;
    },


    /********************************************************************
    Parse a composite sort key back into its three segments. Inverse of
    composeSortKey. data_version is coerced back to a Number.

    @param {String} sort_key - The stored sort key

    @return {Object} - { resource_id, data_version, request_id }
    *********************************************************************/
    parseSortKey: function (sort_key) {
      const parts = sort_key.split(Config.KEY_DELIMITER);
      return {
        resource_id: parts[0],
        data_version: parseInt(parts[1], 10),
        request_id: parts[2]
      };
    },


    /********************************************************************
    Build the begins_with prefix that matches exactly one resource_id.
    Appending the delimiter prevents matching sibling resources whose
    ids merely start with this resource_id (e.g. "acc_1" vs "acc_12").

    @param {String} resource_id - Exact resource identifier

    @return {String} - Prefix ending in the key delimiter
    *********************************************************************/
    exactResourcePrefix: function (resource_id) {
      return resource_id + Config.KEY_DELIMITER;
    },


    // ~~~~~~~~~~~~~~~~~~~~ Query Helpers ~~~~~~~~~~~~~~~~~~~~

    /********************************************************************
    Run a partition-scoped begins_with query on the sort key. Shared by
    queryByResourceId, queryByResourceIdPrefix, and the read phase of
    deleteByDataVersionLte. Returns the raw driver result so each caller
    owns its own success/error shaping.

    @param {Object} instance     - Request instance
    @param {String} tenant_id    - Partition key value
    @param {String} prefix_value - Sort key prefix to match

    @return {Promise<Object>} - Raw driver result { success, items, error }
    *********************************************************************/
    runPrefixQuery: function (instance, tenant_id, prefix_value) {
      return STORE_CONFIG.lib_dynamodb.query(
        instance,
        STORE_CONFIG.table_name,
        {
          pk: tenant_id,
          pkName: 'p',
          skCondition: 'begins_with(id, :prefix)',
          skValues: { ':prefix': prefix_value },
          scanForward: true
        }
      );
    },


    // ~~~~~~~~~~~~~~~~~~~~ Record Reconstruction ~~~~~~~~~~~~~~~~~~~~

    /********************************************************************
    Reconstruct a full record from the DynamoDB item. The item has PK
    `p`, SK `id`, and attributes payload, action, toc. The sort key is
    parsed back into resource_id, data_version, and request_id.

    @param {Object} item - The DynamoDB item { p, id, payload, action, toc }

    @return {Object} - Record with top-level tenant_id, resource_id, data_version, etc.
    *********************************************************************/
    itemToRecord: function (item) {
      const key = _Store.parseSortKey(item.id);
      return {
        tenant_id: item.p,
        resource_id: key.resource_id,
        data_version: key.data_version,
        request_id: key.request_id,
        sort_key: item.id,
        payload: item.payload,
        action: item.action,
        toc: item.toc
      };
    },


    // ~~~~~~~~~~~~~~~~~~~~ Error Helpers ~~~~~~~~~~~~~~~~~~~~

    /********************************************************************
    Log a backend driver failure in the shape every public method uses
    before returning ERRORS.SERVICE_UNAVAILABLE. Centralizes the debug
    payload so the operation label is the only thing that varies.

    @param {String} operation    - Label of the failing operation
    @param {Object} driver_error - The error object from the driver result

    @return {void}
    *********************************************************************/
    logDriverFailure: function (operation, driver_error) {
      Lib.Debug.debug('DistinctQueue dynamodb ' + operation + ' failed', {
        type: ERRORS.SERVICE_UNAVAILABLE.type,
        driver_type: driver_error && driver_error.type,
        driver_message: driver_error && driver_error.message
      });
    }


  };/////////////////////////// Private Functions END //////////////////////////

  return Store;

};///////////////////////////// createInterface END ////////////////////////////
