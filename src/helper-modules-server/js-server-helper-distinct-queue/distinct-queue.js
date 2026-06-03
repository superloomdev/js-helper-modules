// Info: Persistent, storage-agnostic last-write-wins coalescing queue keyed by
// (tenant_id, resource_id). N rapid-fire writes for the same resource collapse
// into at most one execution of the latest payload. The "distinct" property is
// enforced at consumption time (claim), not at write time (enqueue). Write path
// is append-only - enqueue never reads.
//
// Public surface (3 methods): enqueue, claim, listByPrefix.
//
// Storage backends are provided by standalone adapter packages. The caller
// passes the chosen store factory directly as CONFIG.STORE - no string
// dispatch inside this module. Require only the adapter you need:
//   js-server-helper-distinct-queue-store-dynamodb
//   js-server-helper-distinct-queue-store-mongodb
//
// Deployment constraint: use a single scheduled poller (e.g. one Lambda on
// EventBridge every 10 seconds) as the sole consumer of `claim`. This module
// does not implement distributed locking. One poller = one reader = no
// contention.
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
    Crypto: shared_libs.Crypto,
    Instance: shared_libs.Instance
  };

  // Merge overrides over defaults
  const CONFIG = Object.assign(
    {},
    require('./distinct-queue.config'),
    config || {}
  );

  // Load internal error catalog
  const ERRORS = require('./distinct-queue.errors');

  // Load the validators singleton and inject Lib
  const Validators = require('./distinct-queue.validators')(Lib);

  // Validate CONFIG - throws on misconfiguration
  Validators.validateConfig(CONFIG);

  // Instantiate the store. CONFIG.STORE is the factory function passed in
  // by the caller; it receives (Lib, CONFIG, ERRORS) and extracts its own
  // slice from CONFIG.STORE_CONFIG internally.
  const store = CONFIG.STORE(Lib, CONFIG, ERRORS);

  // Validate store contract immediately so missing methods fail at startup
  Validators.validateStoreContract(store);

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
@param {Object} Validators - Validator singleton
@param {Object} store      - Resolved storage backend interface

@return {Object} - Public interface for this module
*********************************************************************/
const createInterface = function (Lib, CONFIG, ERRORS, Validators, store) {

  ////////////////////////////// Public Functions START ////////////////////////
  const DistinctQueue = {

    // ~~~~~~~~~~~~~~~~~~~~ Write Operations ~~~~~~~~~~~~~~~~~~~~
    // Append-only writes. No reads on the write path.

    /********************************************************************
    Append a new job record for a (tenant_id, resource_id) pair. Generates
    data_version (Date.now() ms) and a unique random_suffix internally. Write-
    only - no reads. Safe to call from many concurrent Lambda handlers.

    @param {Object} instance - Request instance for time and lifecycle
    @param {Object} options - Per-call parameters
    @param {String} options.tenant_id - Partition boundary
    @param {String} options.resource_id - Opaque resource identifier within the tenant
    @param {Object} options.payload - Arbitrary data stored as-is, returned by claim
    @param {String} options.action - Opaque label for the worker, returned by claim

    @return {Promise<Object>} - { success, error }
    *********************************************************************/
    enqueue: async function (instance, options) {

      // Programmer errors (bad args) throw synchronously
      Validators.validateEnqueueOptions(options);

      // Generate the ordering signal and unique random suffix
      const data_version = _DistinctQueue.generateDataVersion();
      const random_suffix = _DistinctQueue.generateRandomSuffix();

      // Build the canonical record shape
      const record = _DistinctQueue.buildRecord(
        options.tenant_id,
        options.resource_id,
        options.payload,
        options.action,
        data_version,
        random_suffix
      );

      // Write to the store
      try {
        const write_result = await store.writeRecord(instance, record);
        if (write_result.success === false) {
          Lib.Debug.debug('DistinctQueue enqueue write failed', {
            tenant_id: options.tenant_id,
            resource_id: options.resource_id,
            error: write_result.error
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

      } catch (err) {
        Lib.Debug.debug('DistinctQueue enqueue threw', {
          tenant_id: options.tenant_id,
          resource_id: options.resource_id,
          driver_message: err && err.message
        });
        return {
          success: false,
          error: ERRORS.SERVICE_UNAVAILABLE
        };
      }

    },


    // ~~~~~~~~~~~~~~~~~~~~ Read + Claim Operations ~~~~~~~~~~~~~~~~~~~~
    // Read, select winner, and clean stale records atomically.

    /********************************************************************
    Query all records for a (tenant_id, resource_id). Pick the record with
    the highest data_version. Delete all records with data_version <= that
    value. Return the winning record's payload and action.

    Called only by the single scheduled poller. When no records exist,
    payload is null (nothing to process). The poller loops claim until
    payload is null.

    @param {Object} instance - Request instance for time and lifecycle
    @param {Object} options - Per-call parameters
    @param {String} options.tenant_id - Partition boundary
    @param {String} options.resource_id - Opaque resource identifier within the tenant

    @return {Promise<Object>} - { success, payload, action, error }
    *********************************************************************/
    claim: async function (instance, options) {

      // Programmer errors (bad args) throw synchronously
      Validators.validateClaimOptions(options);

      try {

        // Query all records for this resource
        const query_result = await store.queryByResourceId(
          instance,
          options.tenant_id,
          options.resource_id
        );

        // Handle store query failure
        if (query_result.success === false) {
          Lib.Debug.debug('DistinctQueue claim query failed', {
            tenant_id: options.tenant_id,
            resource_id: options.resource_id,
            error: query_result.error
          });
          return {
            success: false,
            payload: null,
            action: null,
            error: ERRORS.SERVICE_UNAVAILABLE
          };
        }

        // Return null payload when queue is empty for this resource
        if (!query_result.records || query_result.records.length === 0) {
          return {
            success: true,
            payload: null,
            action: null,
            error: null
          };
        }

        // Select the record with the highest data_version (latest wins)
        const winner = _DistinctQueue.pickLatest(query_result.records);

        // Delete stale records with data_version <= winner (best-effort cleanup)
        const delete_result = await store.deleteByDataVersionLte(
          instance,
          options.tenant_id,
          options.resource_id,
          winner.data_version
        );

        // Log delete failure but do not fail the claim
        if (delete_result.success === false) {
          Lib.Debug.debug('DistinctQueue claim delete failed (proceeding with claim)', {
            tenant_id: options.tenant_id,
            resource_id: options.resource_id,
            error: delete_result.error
          });
        }

        // Return the winning record's payload and action
        return {
          success: true,
          payload: winner.payload,
          action: winner.action,
          error: null
        };

      } catch (err) {
        Lib.Debug.debug('DistinctQueue claim threw', {
          tenant_id: options.tenant_id,
          resource_id: options.resource_id,
          driver_message: err && err.message
        });
        return {
          success: false,
          payload: null,
          action: null,
          error: ERRORS.SERVICE_UNAVAILABLE
        };
      }

    },


    // ~~~~~~~~~~~~~~~~~~~~ Operational Queries ~~~~~~~~~~~~~~~~~~~~
    // Prefix-based queries for visibility and debugging.

    /********************************************************************
    Operational query. Returns all records whose resource_id begins with
    resource_id_prefix. Not used in the normal enqueue/claim flow.

    @param {Object} instance - Request instance for time and lifecycle
    @param {Object} options - Per-call parameters
    @param {String} options.tenant_id - Partition boundary
    @param {String} options.resource_id_prefix - Prefix to match

    @return {Promise<Object>} - { success, records, error }
    *********************************************************************/
    listByPrefix: async function (instance, options) {

      // Programmer errors (bad args) throw synchronously
      Validators.validateListByPrefixOptions(options);

      try {

        // Query store for all records matching the prefix
        const query_result = await store.queryByResourceIdPrefix(
          instance,
          options.tenant_id,
          options.resource_id_prefix
        );

        // Handle store query failure
        if (query_result.success === false) {
          Lib.Debug.debug('DistinctQueue listByPrefix query failed', {
            tenant_id: options.tenant_id,
            resource_id_prefix: options.resource_id_prefix,
            error: query_result.error
          });
          return {
            success: false,
            records: [],
            error: ERRORS.SERVICE_UNAVAILABLE
          };
        }

        // Return matched records
        return {
          success: true,
          records: query_result.records || [],
          error: null
        };

      } catch (err) {
        Lib.Debug.debug('DistinctQueue listByPrefix threw', {
          tenant_id: options.tenant_id,
          resource_id_prefix: options.resource_id_prefix,
          driver_message: err && err.message
        });
        return {
          success: false,
          records: [],
          error: ERRORS.SERVICE_UNAVAILABLE
        };
      }

    }

  };////////////////////////////// Public Functions END ////////////////////////



  ///////////////////////////// Private Functions START ////////////////////////
  const _DistinctQueue = {

    // ~~~~~~~~~~~~~~~~~~~~ Key Generation ~~~~~~~~~~~~~~~~~~~~
    // Data version timestamp and random suffix for tiebreaking.

    /********************************************************************
    Generate the ordering signal: current time in milliseconds.
    Delegates to Lib.Utils.getUnixTimeInMilliSeconds().

    @return {Number} - Current unix timestamp in milliseconds
    *********************************************************************/
    generateDataVersion: function () {
      return Lib.Utils.getUnixTimeInMilliSeconds();
    },


    // ~~~~~~~~~~~~~~~~~~~~ Record Construction ~~~~~~~~~~~~~~~~~~~~
    // Shape assembly and winner selection.

    /********************************************************************
    Assemble the canonical record shape for storage. The core module does
    not construct a storage key — each adapter builds its own key from the
    raw fields using its own delimiter and format.

    @param {String} tenant_id    - Partition boundary
    @param {String} resource_id  - Opaque resource identifier
    @param {Object} payload      - Caller-supplied data
    @param {String} action       - Opaque label for the worker
    @param {Number} data_version - Millisecond timestamp
    @param {String} random_suffix - UUID suffix for uniqueness and tiebreaking

    @return {Object} - Canonical record
    *********************************************************************/
    buildRecord: function (tenant_id, resource_id, payload, action, data_version, random_suffix) {

      return {
        tenant_id: tenant_id,
        resource_id: resource_id,
        data_version: data_version,
        random_suffix: random_suffix,
        payload: payload,
        action: action,
        toc: data_version
      };

    },


    /********************************************************************
    Pick the record with the highest data_version from an array.
    If two records have identical data_version, the one with the
    lexicographically larger random_suffix wins (UUID tiebreak).

    @param {Array} records - Array of record objects

    @return {Object} - The winning record
    *********************************************************************/
    pickLatest: function (records) {

      // Start with the first record as the default winner
      let winner = records[0];

      // Compare each subsequent record against current winner
      for (let i = 1; i < records.length; i++) {
        const candidate = records[i];
        if (
          candidate.data_version > winner.data_version ||
          (candidate.data_version === winner.data_version && candidate.random_suffix > winner.random_suffix)
        ) {
          winner = candidate;
        }
      }

      return winner;

    },


    // ~~~~~~~~~~~~~~~~~~~~ Randomness ~~~~~~~~~~~~~~~~~~~~
    // Cryptographically secure suffix generation.

    /********************************************************************
    Generate a random suffix for sort key uniqueness and same-millisecond
    tiebreaking. Uses the full compact UUID (cryptographically secure).

    @return {String} - Full compact UUID string
    *********************************************************************/
    generateRandomSuffix: function () {

      // Use full compact UUID for tiebreaking
      return Lib.Crypto.generateCompactUUID();

    }

  };///////////////////////////// Private Functions END ////////////////////////

  // Return public interface
  return DistinctQueue;

};///////////////////////////// createInterface END ////////////////////////////
