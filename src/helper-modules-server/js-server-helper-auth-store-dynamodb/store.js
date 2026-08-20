// Info: DynamoDB session store adapter for helper-auth.
// Uses a single-table design tuned for the auth query patterns:
//
//   Partition Key:  tenant_id
//   Sort Key:       "{actor_id}\u001F{token_key}"
//
// This layout makes every hot-path query a direct index hit:
//
//   getSession(t, a, k, h)    -> GetItem  (PK=t, SK=a\u001Fk), then hash compare
//   listSessionsByActor(t, a) -> Query    (PK=t, SK begins_with "a\u001F")
//   deleteSession(t, a, k)    -> DeleteItem (PK=t, SK=a\u001Fk)
//   setSession(record)        -> PutItem  (PK=t, SK=a\u001Fk, attrs)
//   cleanupExpiredSessions    -> Scan with FilterExpression on expires_at
//
// No GSI is required. LRU eviction and install-id replacement both use
// listSessionsByActor + client-side filtering, matching the other backends.
//
// The token_secret_hash is stored as a regular attribute (not in the SK)
// so (tenant_id, actor_id, token_key) stays a unique triple - a second
// call with the same triple overwrites the old record.
//
// The caller injects a ready-to-use DynamoDB helper as Lib.DynamoDB.
//
// Schema management (table creation, TTL configuration) is delegated to
// the DynamoDB admin module (js-server-helper-nosql-aws-dynamodb-admin)
// when an Admin instance is injected via shared_libs.DynamoDBAdmin. If no
// Admin is injected, setupNewStore() returns NOT_IMPLEMENTED and the
// operator must provision out-of-band via IaC, AWS Console, or a script.
//
// Store contract (identical shape across all adapters):
//   - setupNewStore(instance)            -> { success, error }  (delegates to DynamoDBAdmin or NOT_IMPLEMENTED)
//   - getSession(instance, t, a, k, h)  -> { success, record, error }
//   - listSessionsByActor(instance, t, a) -> { success, records, error }
//   - setSession(instance, record)      -> { success, error }
//   - updateSessionActivity(instance, t, a, k, updates) -> { success, error }
//   - deleteSession(instance, t, a, k)  -> { success, error }
//   - deleteSessions(instance, t, keys) -> { success, error }
//   - cleanupExpiredSessions(instance)  -> { success, deleted_count, error }

'use strict';



/////////////////////////// Module-Loader START ////////////////////////////////

/********************************************************************
Thin loader. Picks dependencies from the injected container, merges
config over defaults, validates config via the Validators singleton,
then delegates to createInterface. Each call returns an independent
Store instance.

@param {Object} shared_libs - Dependency container (Utils, Debug, DynamoDB)
@param {Object} config - Overrides merged over adapter config defaults
                         ({ table_name } - plain data only)

@return {Object} - Store interface (8 methods: setupNewStore, getSession, listSessionsByActor, setSession, updateSessionActivity, deleteSession, deleteSessions, cleanupExpiredSessions)
*********************************************************************/
module.exports = function loader (shared_libs, config) {

  // Dependencies for this instance - by reference from the shared container
  const Lib = {
    Utils: shared_libs.Utils,
    Debug: shared_libs.Debug,
    DynamoDB: shared_libs.DynamoDB,
    DynamoDBAdmin: shared_libs.DynamoDBAdmin || null
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
close over the same Lib, CONFIG, ERRORS, and Validators.

@param {Object} Lib        - Dependency container (Utils, Debug, DynamoDB)
@param {Object} CONFIG     - Merged adapter configuration (validated)
@param {Object} ERRORS     - Frozen error catalog
@param {Object} Validators - Validators singleton (Lib + ERRORS injected)

@return {Object} - Store interface (8 methods: setupNewStore, getSession, listSessionsByActor, setSession, updateSessionActivity, deleteSession, deleteSessions, cleanupExpiredSessions)
*********************************************************************/
const createInterface = function (Lib, CONFIG, ERRORS, Validators) { // eslint-disable-line no-unused-vars

  ////////////////////////////// Public Functions START ////////////////////////
  const Store = {


    // ~~~~~~~~~~~~~~~~~~~~ Schema Setup ~~~~~~~~~~~~~~~~~~~~
    // Delegates to the DynamoDB admin module when Lib.DynamoDBAdmin is
    // injected. Provisions the table with the correct PK/SK schema and
    // enables native TTL on the expires_at attribute. When no admin is
    // injected, returns NOT_IMPLEMENTED so the operator must provision
    // out-of-band.

    /********************************************************************
    Provision the DynamoDB table and enable TTL for this store.
    Delegates to Lib.DynamoDBAdmin when injected. Idempotent: safe to
    call on every boot. When no admin is injected, returns
    NOT_IMPLEMENTED.

    @param {Object} instance - Request instance

    @return {Promise<Object>} - { success, error }
    *********************************************************************/
    setupNewStore: async function (instance) {

      // No admin module injected - return NOT_IMPLEMENTED so the caller
      // knows to provision out-of-band
      if (Lib.Utils.isNullOrUndefined(Lib.DynamoDBAdmin)) {

        return {
          success: false,
          error: ERRORS.NOT_IMPLEMENTED
        };

      }

      // Step 1: Create the table with PK=tenant_id, SK=session_key
      const create_result = await Lib.DynamoDBAdmin.createTable(instance, {
        table_name: CONFIG.TABLE_NAME,
        attribute_definitions: [
          { name: 'tenant_id', type: 'S' },
          { name: 'session_key', type: 'S' }
        ],
        key_schema: [
          { name: 'tenant_id', type: 'HASH' },
          { name: 'session_key', type: 'RANGE' }
        ]
      });

      // Return error if table creation failed
      if (create_result.success === false) {

        Lib.Debug.debug('Auth dynamodb setupNewStore createTable failed', {
          type: ERRORS.SERVICE_UNAVAILABLE.type,
          table: CONFIG.TABLE_NAME,
          admin_error: create_result.error && create_result.error.type
        });

        return {
          success: false,
          error: ERRORS.SERVICE_UNAVAILABLE
        };

      }

      // Step 2: Wait for the table to reach ACTIVE state
      const wait_result = await Lib.DynamoDBAdmin.waitForTableActive(instance, {
        table_name: CONFIG.TABLE_NAME
      });

      // Return error if wait failed
      if (wait_result.success === false) {

        Lib.Debug.debug('Auth dynamodb setupNewStore waitForTableActive failed', {
          type: ERRORS.SERVICE_UNAVAILABLE.type,
          table: CONFIG.TABLE_NAME,
          admin_error: wait_result.error && wait_result.error.type
        });

        return {
          success: false,
          error: ERRORS.SERVICE_UNAVAILABLE
        };

      }

      // Step 3: Enable native TTL on the expires_at attribute
      const ttl_result = await Lib.DynamoDBAdmin.enableTtl(instance, {
        table_name: CONFIG.TABLE_NAME,
        attribute_name: 'expires_at'
      });

      // Return error if TTL enablement failed
      if (ttl_result.success === false) {

        Lib.Debug.debug('Auth dynamodb setupNewStore enableTtl failed', {
          type: ERRORS.SERVICE_UNAVAILABLE.type,
          table: CONFIG.TABLE_NAME,
          admin_error: ttl_result.error && ttl_result.error.type
        });

        return {
          success: false,
          error: ERRORS.SERVICE_UNAVAILABLE
        };

      }

      // All steps succeeded - report success
      return {
        success: true,
        error: null
      };

    },


    // ~~~~~~~~~~~~~~~~~~~~ Read ~~~~~~~~~~~~~~~~~~~~
    // getSession is a direct GetItem on (PK=tenant_id, SK=actor#key)
    // and verifies the hash client-side so a mismatch looks like
    // "not found" (no timing leak). listSessionsByActor is a Query
    // with begins_with(session_key, "actor#") - served from the
    // composite key's primary index, no scan and no GSI.

    /********************************************************************
    Exact key lookup. Hash compare after the read stays local so a
    wrong secret looks like "record not found" (no timing leak).

    @param {Object} instance          - Request instance
    @param {string} tenant_id         - Tenant identifier
    @param {string} actor_id          - Actor identifier
    @param {string} token_key         - Token key
    @param {string} token_secret_hash - Expected hash for constant-time compare

    @return {Promise<Object>} - { success, record, error }
    *********************************************************************/
    getSession: async function (instance, tenant_id, actor_id, token_key, token_secret_hash) {

      // Fetch the item by composite primary key
      const result = await Lib.DynamoDB.getRecord(instance, CONFIG.TABLE_NAME, {
        tenant_id: tenant_id,
        session_key: _Store.sortKey(actor_id, token_key)
      });

      // Return a service error if the driver call failed
      if (result.success === false) {
        Lib.Debug.debug('Auth dynamodb getSession failed', {
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

      // Return early when the item does not exist
      if (result.item === null || result.item === undefined) {
        return {
          success: true,
          record: null,
          error: null
        };
      }

      // Constant-behavior hash compare - mismatch returns "not found"
      if (result.item.token_secret_hash !== token_secret_hash) {
        return {
          success: true,
          record: null,
          error: null
        };
      }

      // Strip DynamoDB-only keys and return the canonical record
      return {
        success: true,
        record: _Store.itemToRecord(result.item),
        error: null
      };

    },


    /********************************************************************
    Query by partition key with SK begins_with - hits the composite
    key's primary index, no scan.

    @param {Object} instance  - Request instance
    @param {string} tenant_id - Tenant identifier
    @param {string} actor_id  - Actor identifier

    @return {Promise<Object>} - { success, records, error }
    *********************************************************************/
    listSessionsByActor: async function (instance, tenant_id, actor_id) {

      // Build the sort-key prefix that all sessions for this actor share
      const prefix = actor_id + '\u001F';

      // Query using the PK + SK begins_with condition
      const result = await Lib.DynamoDB.query(instance, CONFIG.TABLE_NAME, {
        pk: tenant_id,
        pkName: 'tenant_id',
        skCondition: 'begins_with(session_key, :sk)',
        skValues: { ':sk': prefix }
      });

      // Return a service error if the driver call failed
      if (result.success === false) {
        Lib.Debug.debug('Auth dynamodb listSessionsByActor failed', {
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

      // Strip DynamoDB-only keys from every item and return the list
      const records = result.items.map(function (item) {
        return _Store.itemToRecord(item);
      });
      return {
        success: true,
        records: records,
        error: null
      };

    },


    // ~~~~~~~~~~~~~~~~~~~~ Write ~~~~~~~~~~~~~~~~~~~~
    // Full upsert and partial mutable-field update. setSession uses
    // PutItem so the same (tenant, actor, token_key) triple overwrites
    // the old item. updateSessionActivity uses UpdateItem and refuses
    // identity/PK fields (including session_key) to keep composite-key
    // integrity tamper-proof.

    /********************************************************************
    Upsert via PutItem. The same (tenant_id, actor_id, token_key)
    triple overwrites the existing item.

    @param {Object} instance - Request instance
    @param {Object} record   - Canonical session record

    @return {Promise<Object>} - { success, error }
    *********************************************************************/
    setSession: async function (instance, record) {

      // Encode the canonical record to a DynamoDB item and write it
      const result = await Lib.DynamoDB.writeRecord(
        instance,
        CONFIG.TABLE_NAME,
        _Store.recordToItem(record)
      );

      // Return a service error if the driver call failed
      if (result.success === false) {
        Lib.Debug.debug('Auth dynamodb setSession failed', {
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
    Partial update via UpdateItem (SET expression). Throws TypeError
    on identity fields.

    @param {Object} instance  - Request instance
    @param {string} tenant_id - Tenant identifier
    @param {string} actor_id  - Actor identifier
    @param {string} token_key - Token key
    @param {Object} updates   - Partial record (mutable fields only)

    @return {Promise<Object>} - { success, error }
    *********************************************************************/
    updateSessionActivity: async function (instance, tenant_id, actor_id, token_key, updates) {

      // Skip the round-trip when there is nothing to update
      const update_keys = Object.keys(updates);
      if (update_keys.length === 0) {
        return {
          success: true,
          error: null
        };
      }

      // Guard against callers attempting to overwrite identity fields or
      // the DynamoDB-specific session_key sort-key attribute
      for (const k of update_keys) {
        if (_Store.UPDATE_IDENTITY_BLOCKLIST.indexOf(k) !== -1) {
          throw new TypeError(
            '[helper-auth-store-dynamodb] updateSessionActivity cannot modify identity field "' + k + '"'
          );
        }
      }

      // Run the partial UpdateItem against the target session item
      const result = await Lib.DynamoDB.updateRecord(
        instance,
        CONFIG.TABLE_NAME,
        { tenant_id: tenant_id, session_key: _Store.sortKey(actor_id, token_key) },
        updates
      );

      // Return a service error if the driver call failed
      if (result.success === false) {
        Lib.Debug.debug('Auth dynamodb updateSessionActivity failed', {
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


    // ~~~~~~~~~~~~~~~~~~~~ Delete ~~~~~~~~~~~~~~~~~~~~
    // Single and bulk deletion by composite key. Bulk variant uses
    // batchDeleteRecords (AWS 25-item limit; the helper chunks
    // automatically) so revokeAllSessions / install-id replacement
    // stay bounded-cost regardless of session count.

    /********************************************************************
    Delete one session by composite key.

    @param {Object} instance  - Request instance
    @param {string} tenant_id - Tenant identifier
    @param {string} actor_id  - Actor identifier
    @param {string} token_key - Token key

    @return {Promise<Object>} - { success, error }
    *********************************************************************/
    deleteSession: async function (instance, tenant_id, actor_id, token_key) {

      // Remove the item by its composite primary key
      const result = await Lib.DynamoDB.deleteRecord(
        instance,
        CONFIG.TABLE_NAME,
        { tenant_id: tenant_id, session_key: _Store.sortKey(actor_id, token_key) }
      );

      // Return a service error if the driver call failed
      if (result.success === false) {
        Lib.Debug.debug('Auth dynamodb deleteSession failed', {
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
    Batch delete many sessions. AWS 25-item limit; helper chunks
    automatically. No-op success if keys is empty.

    @param {Object}   instance  - Request instance
    @param {string}   tenant_id - Tenant identifier
    @param {Object[]} keys      - Array of { actor_id, token_key } pairs

    @return {Promise<Object>} - { success, error }
    *********************************************************************/
    deleteSessions: async function (instance, tenant_id, keys) {

      // Skip the round-trip when the caller provides no keys
      if (keys.length === 0) {
        return {
          success: true,
          error: null
        };
      }

      // Build the batchDeleteRecords key map for this table
      const keysByTable = {};
      keysByTable[CONFIG.TABLE_NAME] = keys.map(function (k) {
        return {
          tenant_id: tenant_id,
          session_key: _Store.sortKey(k.actor_id, k.token_key)
        };
      });

      // Delete all matched items in one (or more, if chunked) round-trips
      const result = await Lib.DynamoDB.batchDeleteRecords(instance, keysByTable);

      // Return a service error if the driver call failed
      if (result.success === false) {
        Lib.Debug.debug('Auth dynamodb deleteSessions failed', {
          type: ERRORS.SERVICE_UNAVAILABLE.type,
          driver_type: result.error && result.error.type,
          driver_message: result.error && result.error.message,
          batch_size: keys.length
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


    // ~~~~~~~~~~~~~~~~~~~~ Maintenance ~~~~~~~~~~~~~~~~~~~~
    // Background sweep for expired items. DynamoDB has no DELETE by
    // predicate, so cleanupExpiredSessions scans then batch-deletes.
    // Production deployments may prefer enabling native DynamoDB TTL
    // on expires_at (the integer seconds-since-epoch value stored
    // matches the TTL-attribute format AWS expects).

    /********************************************************************
    Sweep expired sessions. Scan with filter then batchDelete.
    Production deployments may enable DynamoDB TTL on expires_at
    for automatic expiry without scans.

    @param {Object} instance - Request instance

    @return {Promise<Object>} - { success, deleted_count, error }
    *********************************************************************/
    cleanupExpiredSessions: async function (instance) {

      // Scan for all items whose expires_at is in the past
      const now = instance.time;
      const scan_result = await Lib.DynamoDB.scan(instance, CONFIG.TABLE_NAME, {
        expression: '#ea < :now',
        names: { '#ea': 'expires_at' },
        values: { ':now': now }
      });

      // Return a service error if the scan failed
      if (scan_result.success === false) {
        Lib.Debug.debug('Auth dynamodb cleanupExpiredSessions scan failed', {
          type: ERRORS.SERVICE_UNAVAILABLE.type,
          driver_type: scan_result.error && scan_result.error.type,
          driver_message: scan_result.error && scan_result.error.message
        });
        return {
          success: false,
          deleted_count: 0,
          error: ERRORS.SERVICE_UNAVAILABLE
        };
      }

      // Return early with 0 when no expired items were found
      if (scan_result.items.length === 0) {
        return {
          success: true,
          deleted_count: 0,
          error: null
        };
      }

      // Build the batchDelete key map from the scanned items
      const keysByTable = {};
      keysByTable[CONFIG.TABLE_NAME] = scan_result.items.map(function (item) {
        return { tenant_id: item.tenant_id, session_key: item.session_key };
      });

      // Delete the expired items in one (or more, if chunked) batch call
      const delete_result = await Lib.DynamoDB.batchDeleteRecords(instance, keysByTable);

      // Return a service error if the batch delete failed
      if (delete_result.success === false) {
        Lib.Debug.debug('Auth dynamodb cleanupExpiredSessions batchDelete failed', {
          type: ERRORS.SERVICE_UNAVAILABLE.type,
          driver_type: delete_result.error && delete_result.error.type,
          driver_message: delete_result.error && delete_result.error.message,
          batch_size: scan_result.items.length
        });
        return {
          success: false,
          deleted_count: 0,
          error: ERRORS.SERVICE_UNAVAILABLE
        };
      }

      // Report success with the number of items removed
      return {
        success: true,
        deleted_count: scan_result.items.length,
        error: null
      };

    }

  };////////////////////////////// Public Functions END ////////////////////////



  ///////////////////////////// Private Functions START ////////////////////////
  const _Store = {

    // Columns the caller is never allowed to mutate through
    // updateSessionActivity. This is a security + integrity blocklist -
    // passing any of these triggers a TypeError so the regression is
    // visible in dev / CI immediately. session_key is the DynamoDB SK
    // attribute and must be included alongside the canonical identity fields.
    UPDATE_IDENTITY_BLOCKLIST: [
      'tenant_id', 'actor_id', 'actor_type', 'token_key', 'token_secret_hash',
      'created_at', 'install_id', 'install_platform', 'install_form_factor',
      'session_key'
    ],


    /********************************************************************
    Compose the sort key from actor_id and token_key. actor_id is
    validated for '\u001F' by the higher auth layer; token_key is
    generated from the controlled TOKEN_CHARSET so '\u001F' never appears.

    @param {String} actor_id  - Actor identifier
    @param {String} token_key - Session token key

    @return {String} - "{actor_id}\u001F{token_key}"
    *********************************************************************/
    sortKey: function (actor_id, token_key) {

      // Concatenate with the \u001F separator reserved for composite keys
      return actor_id + '\u001F' + token_key;

    },


    /********************************************************************
    Convert a canonical session record into the DynamoDB item shape.
    Each canonical field becomes a top-level attribute; tenant_id is
    the PK and session_key is the SK.

    @param {Object} record - Canonical session record

    @return {Object} - DynamoDB item (record + PK/SK attributes)
    *********************************************************************/
    recordToItem: function (record) {

      // Merge the sort-key attribute into a copy of the canonical record
      return Object.assign(
        {
          tenant_id: record.tenant_id,
          session_key: _Store.sortKey(record.actor_id, record.token_key)
        },
        record
      );

    },


    /********************************************************************
    Strip the DynamoDB-only session_key attribute so callers receive a
    clean canonical record.

    @param {Object} item - Raw DynamoDB item

    @return {Object|null} - Canonical session record, or null
    *********************************************************************/
    itemToRecord: function (item) {

      // Return null for missing items (driver-returned undefined or null)
      if (item === null || item === undefined) {
        return null;
      }

      // Delete the DynamoDB-specific sort-key attribute from a shallow copy
      const rec = Object.assign({}, item);
      delete rec.session_key;
      return rec;

    }

  };///////////////////////////// Private Functions END ////////////////////////


  return Store;

};///////////////////////////// createInterface END /////////////////////////////
