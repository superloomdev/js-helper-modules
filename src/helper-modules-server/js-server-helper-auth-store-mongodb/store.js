// Info: MongoDB session store adapter for helper-auth.
// Uses the composite
//   "{tenant_id}#{actor_id}#{token_key}#{token_secret_hash}"
// as the document _id so:
//   - Direct reads (getSession) are O(1) against the default _id index
//   - Wrong-secret probes return "not found" without any extra read
//     (the hash is baked into _id, a mismatch never hits a doc)
//   - listSessionsByActor uses equality on an indexed `prefix` field,
//     hitting the B-tree directly without a regex or collection scan
//
// The caller injects a ready-to-use MongoDB helper as Lib.MongoDB.
// This adapter never requires `mongodb` directly - projects not using
// this store never load the native driver.
//
// Schema management (collection creation, secondary indexes, TTL) is
// out of scope for this adapter. MongoDB auto-creates the collection on
// first write. Secondary indexes on `prefix` and a Date-typed TTL field
// must be provisioned out-of-band until the MongoDB helper exposes a
// schema-management API. setupNewStore() exists in the interface contract
// but is not yet implemented and returns NOT_IMPLEMENTED.
//
// Store contract (identical shape across all adapters):
//   - setupNewStore(instance)            -> { success, error }  (NOT_IMPLEMENTED)
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

@param {Object} shared_libs - Dependency container (Utils, Debug, MongoDB)
@param {Object} config - Overrides merged over adapter config defaults
                         ({ collection_name } - plain data only)

@return {Object} - Store interface (8 methods: setupNewStore, getSession, listSessionsByActor, setSession, updateSessionActivity, deleteSession, deleteSessions, cleanupExpiredSessions)
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
close over the same Lib, CONFIG, ERRORS, and Validators.

@param {Object} Lib        - Dependency container (Utils, Debug, MongoDB)
@param {Object} CONFIG     - Merged adapter configuration (validated)
@param {Object} ERRORS     - Frozen error catalog
@param {Object} Validators - Validators singleton (Lib + ERRORS injected)

@return {Object} - Store interface (8 methods: setupNewStore, getSession, listSessionsByActor, setSession, updateSessionActivity, deleteSession, deleteSessions, cleanupExpiredSessions)
*********************************************************************/
const createInterface = function (Lib, CONFIG, ERRORS, Validators) { // eslint-disable-line no-unused-vars

  ////////////////////////////// Public Functions START ////////////////////////
  const Store = {


    // ~~~~~~~~~~~~~~~~~~~~ Schema Setup ~~~~~~~~~~~~~~~~~~~~
    // MongoDB auto-creates collections on first write. Secondary indexes
    // and TTL must be provisioned out-of-band. setupNewStore is part of
    // the store contract but is not yet implemented for this backend.

    /********************************************************************
    Not implemented for MongoDB. Collection and index provisioning
    must be done out-of-band until the MongoDB helper exposes a
    schema-management API.

    @param {Object} instance - Request instance (unused)

    @return {Promise<Object>} - { success, error }  (always NOT_IMPLEMENTED)
    *********************************************************************/
    setupNewStore: async function (instance) { // eslint-disable-line no-unused-vars

      return {
        success: false,
        error: ERRORS.NOT_IMPLEMENTED
      };

    },


    // ~~~~~~~~~~~~~~~~~~~~ Read ~~~~~~~~~~~~~~~~~~~~
    // getSession is O(1) against the default _id index - the hash is
    // baked into _id so a wrong secret produces a miss, not a timing
    // leak. listSessionsByActor uses equality on the indexed `prefix`
    // field, hitting the B-tree directly.

    /********************************************************************
    Direct read by composite _id. The token_secret_hash is baked into
    _id so a wrong secret produces a miss (no timing leak, no extra
    read). Returns null record when the document is not found.

    @param {Object} instance          - Request instance
    @param {string} tenant_id         - Tenant identifier
    @param {string} actor_id          - Actor identifier
    @param {string} token_key         - Token key
    @param {string} token_secret_hash - Hash baked into _id

    @return {Promise<Object>} - { success, record, error }
    *********************************************************************/
    getSession: async function (instance, tenant_id, actor_id, token_key, token_secret_hash) {

      // Build the composite _id including the secret hash
      const _id = _Store.composeMongoId(tenant_id, actor_id, token_key, token_secret_hash);

      // Fetch the document by _id - mismatch returns null naturally
      const result = await Lib.MongoDB.getRecord(
        instance,
        CONFIG.collection_name,
        { _id: _id }
      );

      // Return a service error if the driver call failed
      if (result.success === false) {
        Lib.Debug.debug('Auth mongodb getSession failed', {
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

      // Strip MongoDB-specific fields and return the canonical record (or null)
      return {
        success: true,
        record: _Store.docToRecord(result.document),
        error: null
      };

    },


    /********************************************************************
    List all sessions for (tenant_id, actor_id). Uses equality on the
    pre-computed `prefix` field so we hit the B-tree index directly.

    @param {Object} instance  - Request instance
    @param {string} tenant_id - Tenant identifier
    @param {string} actor_id  - Actor identifier

    @return {Promise<Object>} - { success, records, error }
    *********************************************************************/
    listSessionsByActor: async function (instance, tenant_id, actor_id) {

      // Build the indexed prefix that all docs for this actor share
      const prefix = _Store.composeMongoActorPrefix(tenant_id, actor_id);

      // Query using exact equality on the indexed `prefix` field
      const result = await Lib.MongoDB.query(
        instance,
        CONFIG.collection_name,
        { prefix: prefix }
      );

      // Return a service error if the driver call failed
      if (result.success === false) {
        Lib.Debug.debug('Auth mongodb listSessionsByActor failed', {
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

      // Strip MongoDB-specific fields from every document and return the list
      const records = result.documents.map(function (doc) {
        return _Store.docToRecord(doc);
      });
      return {
        success: true,
        records: records,
        error: null
      };

    },


    // ~~~~~~~~~~~~~~~~~~~~ Write ~~~~~~~~~~~~~~~~~~~~
    // Full upsert and partial mutable-field update. setSession uses
    // replaceOne+upsert so the same (tenant, actor, token_key, hash)
    // quadruple yields a single document. updateSessionActivity uses
    // $set and refuses identity/PK fields (including _id and prefix).

    /********************************************************************
    Upsert a session document. replaceOne+upsert on _id ensures the
    same (tenant_id, actor_id, token_key, token_secret_hash) quadruple
    yields exactly one document.

    @param {Object} instance - Request instance
    @param {Object} record   - Canonical session record

    @return {Promise<Object>} - { success, error }
    *********************************************************************/
    setSession: async function (instance, record) {

      // Build the document shape (canonical record + _id + prefix)
      const doc = _Store.recordToDoc(record);

      // Upsert by _id - replaces existing doc or inserts if absent
      const result = await Lib.MongoDB.writeRecord(
        instance,
        CONFIG.collection_name,
        { _id: doc._id },
        doc
      );

      // Return a service error if the driver call failed
      if (result.success === false) {
        Lib.Debug.debug('Auth mongodb setSession failed', {
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
    Partial update via $set. Uses an anchored prefix regex on _id to
    locate the document (the caller only has actor_id + token_key,
    not the hash baked into _id). Throws TypeError on identity fields.

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
      // the MongoDB-specific _id and prefix attributes
      for (const k of update_keys) {
        if (_Store.UPDATE_IDENTITY_BLOCKLIST.indexOf(k) !== -1) {
          throw new TypeError(
            '[helper-auth-store-mongodb] updateSessionActivity cannot modify identity field "' + k + '"'
          );
        }
      }

      // Build an anchored prefix regex to locate the target document via _id.
      // The hash is baked into _id so we match on the tenant+actor+token_key
      // prefix - at most one document matches since the triple is unique.
      const prefix = tenant_id + '#' + actor_id + '#' + token_key + '#';
      const anchored = new RegExp('^' + _Store.escapeRegExp(prefix));

      // Run the partial $set update against the matched document
      const result = await Lib.MongoDB.updateRecord(
        instance,
        CONFIG.collection_name,
        { _id: anchored },
        { $set: updates }
      );

      // Return a service error if the driver call failed
      if (result.success === false) {
        Lib.Debug.debug('Auth mongodb updateSessionActivity failed', {
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
    // Single and bulk deletion by composite _id prefix. The caller
    // only has (tenant, actor, token_key) - not the hash baked into
    // _id - so we use an anchored prefix regex. At most one document
    // matches because {actor_id + token_key} is unique per tenant.

    /********************************************************************
    Delete by (tenant_id, actor_id, token_key). Uses an anchored prefix
    regex on _id since the caller does not have the hash.

    @param {Object} instance  - Request instance
    @param {string} tenant_id - Tenant identifier
    @param {string} actor_id  - Actor identifier
    @param {string} token_key - Token key

    @return {Promise<Object>} - { success, error }
    *********************************************************************/
    deleteSession: async function (instance, tenant_id, actor_id, token_key) {

      // Build an anchored prefix regex for the target document
      const prefix = tenant_id + '#' + actor_id + '#' + token_key + '#';
      const anchored = new RegExp('^' + _Store.escapeRegExp(prefix));

      // Delete the matched document by prefix regex on _id
      const result = await Lib.MongoDB.deleteRecordsByFilter(
        instance,
        CONFIG.collection_name,
        { _id: anchored }
      );

      // Return a service error if the driver call failed
      if (result.success === false) {
        Lib.Debug.debug('Auth mongodb deleteSession failed', {
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
    Bulk delete by $or over all _id prefixes. One deleteMany round-trip.
    No-op success if keys array is empty.

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

      // Build an $or clause with one anchored prefix regex per key
      const or_clauses = keys.map(function (k) {
        const prefix = tenant_id + '#' + k.actor_id + '#' + k.token_key + '#';
        return { _id: new RegExp('^' + _Store.escapeRegExp(prefix)) };
      });

      // Delete all matched documents in one deleteMany round-trip
      const result = await Lib.MongoDB.deleteRecordsByFilter(
        instance,
        CONFIG.collection_name,
        { $or: or_clauses }
      );

      // Return a service error if the driver call failed
      if (result.success === false) {
        Lib.Debug.debug('Auth mongodb deleteSessions failed', {
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
    // Background sweep for expired documents using the expires_at
    // field (integer unix-seconds). MongoDB's native TTL does not
    // honor integer fields (it requires a Date-typed field), so this
    // manual sweep is the garbage-collection path - run it on a cron.

    /********************************************************************
    Sweep expired sessions using the expires_at integer field. MongoDB
    native TTL requires a Date-typed field; this manual deleteMany is
    the garbage-collection path - run it on a cron.

    @param {Object} instance - Request instance

    @return {Promise<Object>} - { success, deleted_count, error }
    *********************************************************************/
    cleanupExpiredSessions: async function (instance) {

      // Delete all documents whose expires_at is in the past
      const now = instance.time;
      const result = await Lib.MongoDB.deleteRecordsByFilter(
        instance,
        CONFIG.collection_name,
        { expires_at: { $lt: now } }
      );

      // Return a service error if the driver call failed
      if (result.success === false) {
        Lib.Debug.debug('Auth mongodb cleanupExpiredSessions failed', {
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

      // Report success with the count of deleted documents
      return {
        success: true,
        deleted_count: result.deletedCount,
        error: null
      };

    }

  };////////////////////////////// Public Functions END ////////////////////////



  ///////////////////////////// Private Functions START ////////////////////////
  const _Store = {

    // Columns the caller is never allowed to mutate through
    // updateSessionActivity. Security + integrity blocklist - any match
    // throws a TypeError so the regression is visible in dev / CI
    // immediately. _id and prefix are MongoDB-specific and must be
    // included alongside the canonical identity fields.
    UPDATE_IDENTITY_BLOCKLIST: [
      'tenant_id', 'actor_id', 'actor_type', 'token_key', 'token_secret_hash',
      'created_at', 'install_id', 'install_platform', 'install_form_factor',
      '_id', 'prefix'
    ],


    /********************************************************************
    Escape a string for safe use inside a RegExp literal. Handles all
    regex metacharacters so tenant_id and actor_id values that contain
    dots, brackets, etc. never corrupt the anchored prefix pattern.

    @param {String} str - Raw string to escape

    @return {String} - Regex-safe escaped string
    *********************************************************************/
    escapeRegExp: function (str) {

      // Replace each metacharacter with its backslash-escaped equivalent
      return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    },


    /********************************************************************
    Build the MongoDB _id for a session document. Composite key:
      "{tenant_id}#{actor_id}#{token_key}#{token_secret_hash}"

    Including the hash in _id means a wrong-secret getSession probe
    produces a different _id and MongoDB returns null without reading
    the document (O(1), no timing leak).

    @param {String} tenant_id         - Tenant identifier
    @param {String} actor_id          - Actor identifier
    @param {String} token_key         - Session token key
    @param {String} token_secret_hash - Hashed token secret

    @return {String} - Composite _id string
    *********************************************************************/
    composeMongoId: function (tenant_id, actor_id, token_key, token_secret_hash) {

      // Concatenate all four segments with the '#' composite-key separator
      return tenant_id + '#' + actor_id + '#' + token_key + '#' + token_secret_hash;

    },


    /********************************************************************
    Build the indexed `prefix` field stored on every document. Format:
      "{tenant_id}#{actor_id}#"

    Equality queries on this field (via a btree index) replace the
    anchored-regex scan on _id for listSessionsByActor.

    @param {String} tenant_id - Tenant identifier
    @param {String} actor_id  - Actor identifier

    @return {String} - Prefix string
    *********************************************************************/
    composeMongoActorPrefix: function (tenant_id, actor_id) {

      // Concatenate tenant and actor segments with trailing separator
      return tenant_id + '#' + actor_id + '#';

    },


    /********************************************************************
    Build the document shape persisted by this store. Merges the
    canonical record with the computed _id and prefix fields.

    @param {Object} record - Canonical session record

    @return {Object} - MongoDB document (_id + prefix + record fields)
    *********************************************************************/
    recordToDoc: function (record) {

      // Compute _id and prefix, then merge them in front of the record
      const _id = _Store.composeMongoId(
        record.tenant_id,
        record.actor_id,
        record.token_key,
        record.token_secret_hash
      );

      const prefix = _Store.composeMongoActorPrefix(record.tenant_id, record.actor_id);

      return Object.assign({ _id: _id, prefix: prefix }, record);

    },


    /********************************************************************
    Strip MongoDB-specific fields so callers receive a clean canonical
    record. Returns null for missing or undefined input.

    @param {Object} doc - Raw MongoDB document

    @return {Object|null} - Canonical session record, or null
    *********************************************************************/
    docToRecord: function (doc) {

      // Return null for missing documents (driver returned null/undefined)
      if (doc === null || doc === undefined) {
        return null;
      }

      // Remove _id and prefix from a shallow copy of the document
      const rec = Object.assign({}, doc);
      delete rec._id;
      delete rec.prefix;
      return rec;

    }

  };///////////////////////////// Private Functions END ////////////////////////


  return Store;

};///////////////////////////// createInterface END /////////////////////////////
