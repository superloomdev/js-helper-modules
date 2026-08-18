// Info: MongoDB admin wrapper with collection, index, and TTL provisioning operations. Lazy-loaded native driver.
// Server-only: uses 'mongodb' npm package with admin-role credentials.
//
// Compatibility: Node.js 24+.
//
// Factory pattern: each loader call returns an independent MongoDB admin interface
// with its own Lib, CONFIG, and per-instance MongoClient.
//
// Lazy-loaded MongoDB driver (stateless, shared across instances):
//   - 'mongodb' -> MongoClient class, used to build the admin database client
'use strict';

// Shared stateless MongoDB driver (module-level - require() is cached anyway).
let MongoClient = null;



/////////////////////////// Module-Loader START ////////////////////////////////

/********************************************************************
Factory loader. One call = one independent instance with its own
Lib, CONFIG, and MongoDB admin client.

@param {Object} shared_libs - Lib container with Utils, Debug, Instance
@param {Object} config - Overrides merged over module config defaults

@return {Object} - Public interface for this module
*********************************************************************/
module.exports = function loader (shared_libs, config) {

  // Dependencies for this instance
  const Lib = {
    Utils: shared_libs.Utils,
    Debug: shared_libs.Debug,
    Instance: shared_libs.Instance
  };

  // Merge overrides over defaults
  const CONFIG = Object.assign(
    {},
    require('./mongodb-admin.config'),
    config || {}
  );

  // Error catalog (frozen, owned by the main module)
  const ERRORS = require('./mongodb-admin.errors');

  // Validators singleton - Lib, ERRORS, and any static data injected here
  const Validators = require('./mongodb-admin.validators')(Lib, ERRORS);

  // Validate config immediately so misconfiguration fails at startup
  Validators.validateConfig(CONFIG);

  // Mutable per-instance state (MongoClient and Db live here)
  const state = {
    client: null,
    db: null
  };

  return createInterface(Lib, CONFIG, ERRORS, Validators, state);

};///////////////////////////// Module-Loader END ///////////////////////////////



/////////////////////////// createInterface START //////////////////////////////

/********************************************************************
Builds the public interface for one instance. Public and private
functions close over the provided Lib, CONFIG, ERRORS, Validators,
and state.

@param {Object} Lib - Dependency container (Utils, Debug, Instance)
@param {Object} CONFIG - Merged configuration for this instance
@param {Object} ERRORS - Frozen error catalog for this module
@param {Object} Validators - Validators singleton (Lib + ERRORS injected)
@param {Object} state - Mutable state holder (MongoClient and Db references)

@return {Object} - Public interface for this module
*********************************************************************/
const createInterface = function (Lib, CONFIG, ERRORS, Validators, state) {

  ///////////////////////////Public Functions START//////////////////////////////
  const MongoDBAdmin = {

    // ~~~~~~~~~~~~~~~~~~~~ Collection Management ~~~~~~~~~~~~~~~~~~~~
    // Create and drop collections with idempotent semantics.

    /********************************************************************
Create a collection. Idempotent: if the collection already exists,
returns success with data.created set to false.

@param {Object} instance - Request instance
@param {Object} options - Function options
@param {String} options.collection_name - Name of the collection to create
@param {Object} [options.collection_options] - Options passed to createCollection (e.g. { capped: true, size: 100000 })

@return {Promise<Object>} - { success, data, error }
    *********************************************************************/
    createCollection: async function (instance, options) {

      // Validate options (throws TypeError on programmer error)
      Validators.validateCreateCollection(options);

      // Ensure MongoDB admin client is initialized
      await _MongoDBAdmin.initIfNot();

      const start_ms = Lib.Utils.getUnixTimeInMilliSeconds();

      try {

        // Check if collection already exists
        const collections = await state.db.listCollections({ name: options.collection_name }).toArray();

        if (collections.length > 0) {

          Lib.Debug.performanceAuditLog('End', 'MongoDBAdmin createCollection', start_ms);

          // Collection already exists - idempotent success without creating
          return {
            success: true,
            data: { created: false },
            error: null
          };

        }

        // Execute createCollection command with optional collection options
        await state.db.createCollection(options.collection_name, options.collection_options || {});

        Lib.Debug.performanceAuditLog('End', 'MongoDBAdmin createCollection', start_ms);

        // Return successful response with created flag
        return {
          success: true,
          data: { created: true },
          error: null
        };

      } catch (error) {

        Lib.Debug.debug('MongoDBAdmin createCollection failed', {
          type: ERRORS.ADMIN_OPERATION_FAILED.type,
          collection: options.collection_name,
          message: error.message,
          code: error.code || null,
          stack: error.stack
        });

        // Return error response
        return {
          success: false,
          data: { created: false },
          error: ERRORS.ADMIN_OPERATION_FAILED
        };

      }

    },


    /********************************************************************
Drop a collection. Idempotent: if the collection does not exist,
returns success with data.dropped set to false.

@param {Object} instance - Request instance
@param {Object} options - Function options
@param {String} options.collection_name - Name of the collection to drop

@return {Promise<Object>} - { success, data, error }
    *********************************************************************/
    dropCollection: async function (instance, options) {

      // Validate options (throws TypeError on programmer error)
      Validators.validateDropCollection(options);

      // Ensure MongoDB admin client is initialized
      await _MongoDBAdmin.initIfNot();

      const start_ms = Lib.Utils.getUnixTimeInMilliSeconds();

      try {

        // Check if collection exists before attempting to drop
        const collections = await state.db.listCollections({ name: options.collection_name }).toArray();

        if (collections.length === 0) {

          Lib.Debug.performanceAuditLog('End', 'MongoDBAdmin dropCollection', start_ms);

          // Collection does not exist - idempotent success without dropping
          return {
            success: true,
            data: { dropped: false },
            error: null
          };

        }

        // Execute dropCollection command
        await state.db.dropCollection(options.collection_name);

        Lib.Debug.performanceAuditLog('End', 'MongoDBAdmin dropCollection', start_ms);

        // Return successful response with dropped flag
        return {
          success: true,
          data: { dropped: true },
          error: null
        };

      } catch (error) {

        Lib.Debug.debug('MongoDBAdmin dropCollection failed', {
          type: ERRORS.ADMIN_OPERATION_FAILED.type,
          collection: options.collection_name,
          message: error.message,
          code: error.code || null,
          stack: error.stack
        });

        // Return error response
        return {
          success: false,
          data: { dropped: false },
          error: ERRORS.ADMIN_OPERATION_FAILED
        };

      }

    },


    // ~~~~~~~~~~~~~~~~~~~~ Index Management ~~~~~~~~~~~~~~~~~~~~
    // Create indexes and TTL indexes with idempotent semantics.

    /********************************************************************
Create one or more indexes on a collection. Idempotent: indexes that
already exist with an identical spec are counted in data.skipped.

@param {Object} instance - Request instance
@param {Object} options - Function options
@param {String} options.collection_name - Name of the collection
@param {Array} options.indexes - Array of index specs. Each: { keys, index_options? }
@param {Object} options.indexes[].keys - Index key spec (e.g. { field: 1 })
@param {Object} [options.indexes[].index_options] - createIndex options (e.g. { name: 'idx_field', unique: true })

@return {Promise<Object>} - { success, data, error }
    *********************************************************************/
    createIndexes: async function (instance, options) {

      // Validate options (throws TypeError on programmer error)
      Validators.validateCreateIndexes(options);

      // Ensure MongoDB admin client is initialized
      await _MongoDBAdmin.initIfNot();

      const start_ms = Lib.Utils.getUnixTimeInMilliSeconds();

      try {

        // Track which index names were newly created vs already present
        const created = [];
        const skipped = [];

        // Process each requested index spec in order
        for (let i = 0; i < options.indexes.length; i++) {

          // Unpack this index spec (keys are required; options default to empty)
          const index = options.indexes[i];
          const keys = index.keys;
          const index_options = index.index_options || {};

          // Determine the name this index will carry: the explicit
          // index_options.name, or the driver-generated form (field_direction
          // pairs joined by underscores, e.g. { email: 1 } -> 'email_1')
          const expected_name = index_options.name || Object.keys(keys).map(function (key) {

            return key + '_' + keys[key];

          }).join('_');

          // Check whether the index already exists BEFORE creating, because
          // createIndex returns identically for both new and existing indexes
          const existing_indexes = await state.db.collection(options.collection_name).listIndexes().toArray();
          const already_exists = existing_indexes.some(function (idx) {

            return idx.name === expected_name;

          });

          // Execute createIndex command. MongoDB's createIndex is idempotent:
          // it returns the index name without error if an equivalent index exists.
          const index_name = await state.db.collection(options.collection_name).createIndex(keys, index_options);

          // Classify based on the pre-creation existence check
          if (already_exists) {
            // Index existed before this call - count as skipped
            skipped.push(index_name);
          } else {
            // Index newly created in this call
            created.push(index_name);
          }

        }

        Lib.Debug.performanceAuditLog('End', 'MongoDBAdmin createIndexes', start_ms);

        // Return successful response with created and skipped index names
        return {
          success: true,
          data: { created: created, skipped: skipped },
          error: null
        };

      } catch (error) {

        Lib.Debug.debug('MongoDBAdmin createIndexes failed', {
          type: ERRORS.ADMIN_OPERATION_FAILED.type,
          collection: options.collection_name,
          message: error.message,
          code: error.code || null,
          stack: error.stack
        });

        // Return error response
        return {
          success: false,
          data: { created: [], skipped: [] },
          error: ERRORS.ADMIN_OPERATION_FAILED
        };

      }

    },


    /********************************************************************
Enable a TTL index on a Date field. Idempotent: if a TTL index
already exists on the same field, returns success with data.enabled
set to false. If a TTL index exists on a DIFFERENT field, returns
an ADMIN_TTL_CONFLICT error.

@param {Object} instance - Request instance
@param {Object} options - Function options
@param {String} options.collection_name - Name of the collection
@param {String} options.field_name - Date field to index (must store BSON Date values)
@param {Number} options.expire_after_seconds - TTL in seconds

@return {Promise<Object>} - { success, data, error }
    *********************************************************************/
    enableTtlIndex: async function (instance, options) {

      // Validate options (throws TypeError on programmer error)
      Validators.validateEnableTtlIndex(options);

      // Ensure MongoDB admin client is initialized
      await _MongoDBAdmin.initIfNot();

      const start_ms = Lib.Utils.getUnixTimeInMilliSeconds();

      try {

        // Bind the target collection once for all index operations below
        const collection = state.db.collection(options.collection_name);

        // List existing indexes to check for TTL conflicts. MongoDB permits
        // multiple TTL indexes per collection, but this module enforces at
        // most one so cleanup semantics stay unambiguous.
        const existing_indexes = await collection.listIndexes().toArray();

        // Track the field of any TTL index found during the scan
        let existing_ttl_field = null;

        // Scan every index for a TTL marker (expireAfterSeconds)
        for (let i = 0; i < existing_indexes.length; i++) {

          const idx = existing_indexes[i];

          if (idx.expireAfterSeconds !== undefined) {

            // Found an existing TTL index. Record the field it covers.
            const keys = Object.keys(idx.key);
            existing_ttl_field = keys[0];

            if (keys[0] === options.field_name) {

              Lib.Debug.performanceAuditLog('End', 'MongoDBAdmin enableTtlIndex', start_ms);

              // TTL index already exists on the requested field - idempotent
              // success without creating
              return {
                success: true,
                data: { enabled: false },
                error: null
              };

            }

          }

        }

        // A TTL index exists on a DIFFERENT field - operational conflict.
        // The caller must drop the old TTL index explicitly before switching
        // fields; silently replacing it could break another consumer's cleanup.
        if (existing_ttl_field !== null) {

          Lib.Debug.debug('MongoDBAdmin enableTtlIndex TTL conflict', {
            type: ERRORS.ADMIN_TTL_CONFLICT.type,
            collection: options.collection_name,
            existing_field: existing_ttl_field,
            requested_field: options.field_name
          });

          // Return conflict error response
          return {
            success: false,
            data: { enabled: false },
            error: ERRORS.ADMIN_TTL_CONFLICT
          };

        }

        // No TTL index exists yet - create one on the requested field.
        // Sparse so documents missing the field are excluded from expiry.
        await collection.createIndex(
          { [options.field_name]: 1 },
          {
            expireAfterSeconds: options.expire_after_seconds,
            sparse: true
          }
        );

        Lib.Debug.performanceAuditLog('End', 'MongoDBAdmin enableTtlIndex', start_ms);

        // Return successful response with enabled flag
        return {
          success: true,
          data: { enabled: true },
          error: null
        };

      } catch (error) {

        Lib.Debug.debug('MongoDBAdmin enableTtlIndex failed', {
          type: ERRORS.ADMIN_OPERATION_FAILED.type,
          collection: options.collection_name,
          message: error.message,
          code: error.code || null,
          stack: error.stack
        });

        // Return error response
        return {
          success: false,
          data: { enabled: false },
          error: ERRORS.ADMIN_OPERATION_FAILED
        };

      }

    },


    /********************************************************************
List all indexes on a collection.

@param {Object} instance - Request instance
@param {Object} options - Function options
@param {String} options.collection_name - Name of the collection

@return {Promise<Object>} - { success, data, error }
    *********************************************************************/
    listIndexes: async function (instance, options) {

      // Validate options (throws TypeError on programmer error)
      Validators.validateListIndexes(options);

      // Ensure MongoDB admin client is initialized
      await _MongoDBAdmin.initIfNot();

      const start_ms = Lib.Utils.getUnixTimeInMilliSeconds();

      try {

        // Execute listIndexes command and collect full index documents
        const indexes = await state.db.collection(options.collection_name).listIndexes().toArray();

        Lib.Debug.performanceAuditLog('End', 'MongoDBAdmin listIndexes', start_ms);

        // Return successful response with index documents
        return {
          success: true,
          data: { indexes: indexes },
          error: null
        };

      } catch (error) {

        Lib.Debug.debug('MongoDBAdmin listIndexes failed', {
          type: ERRORS.ADMIN_OPERATION_FAILED.type,
          collection: options.collection_name,
          message: error.message,
          code: error.code || null,
          stack: error.stack
        });

        // Return error response
        return {
          success: false,
          data: { indexes: [] },
          error: ERRORS.ADMIN_OPERATION_FAILED
        };

      }

    },


    // ~~~~~~~~~~~~~~~~~~~~ Lifecycle ~~~~~~~~~~~~~~~~~~~~
    // Connection health check and graceful teardown.

    /********************************************************************
Ping the MongoDB server with admin credentials. Verifies the
connection is alive and the admin user can authenticate.

@param {Object} instance - Request instance

@return {Promise<Object>} - { success, data, error }
    *********************************************************************/
    ping: async function (instance) { // eslint-disable-line no-unused-vars

      const start_ms = Lib.Utils.getUnixTimeInMilliSeconds();

      try {

        // Initialize inside try: a failed connection is an operational
        // outcome for a health check, not an exception to propagate
        await _MongoDBAdmin.initIfNot();

        // Execute ping command against the admin-bound database
        await state.db.command({ ping: 1 });

        Lib.Debug.performanceAuditLog('End', 'MongoDBAdmin ping', start_ms);

        // Return successful response - connection alive, credentials valid
        return {
          success: true,
          data: { ok: true },
          error: null
        };

      } catch (error) {

        Lib.Debug.debug('MongoDBAdmin ping failed', {
          type: ERRORS.ADMIN_CONNECTION_FAILED.type,
          message: error.message,
          code: error.code || null,
          stack: error.stack
        });

        // Return error response
        return {
          success: false,
          data: { ok: false },
          error: ERRORS.ADMIN_CONNECTION_FAILED
        };

      }

    },


    /********************************************************************
Close the MongoDB admin connection for this instance.

@param {Object} instance - Request instance

@return {Promise<Object>} - { success, error }
    *********************************************************************/
    close: async function (instance) { // eslint-disable-line no-unused-vars

      const start_ms = Lib.Utils.getUnixTimeInMilliSeconds();

      try {

        // Close only if a client was ever created (idempotent on repeat calls)
        if (!Lib.Utils.isNullOrUndefined(state.client)) {

          // Release the connection and clear cached references so a
          // subsequent call re-initializes from scratch
          await state.client.close();
          state.client = null;
          state.db = null;

        }

        Lib.Debug.performanceAuditLog('End', 'MongoDBAdmin close', start_ms);

        // Return successful response
        return {
          success: true,
          error: null
        };

      } catch (error) {

        Lib.Debug.debug('MongoDBAdmin close failed', {
          type: ERRORS.ADMIN_CONNECTION_FAILED.type,
          message: error.message,
          code: error.code || null,
          stack: error.stack
        });

        // Return error response
        return {
          success: false,
          error: ERRORS.ADMIN_CONNECTION_FAILED
        };

      }

    }

  };///////////////////////////Public Functions END//////////////////////////////



  //////////////////////////Private Functions START//////////////////////////////
  const _MongoDBAdmin = {

    /********************************************************************
Lazy-load the MongoDB native driver. Shared across every instance
because the driver module itself is stateless - only MongoClient
holds per-instance state.

@return {void}
    *********************************************************************/
    ensureAdapter: function () {

      // MongoClient class (shared across instances)
      if (Lib.Utils.isNullOrUndefined(MongoClient)) {
        MongoClient = require('mongodb').MongoClient;
      }

    },


    /********************************************************************
Create this instance's MongoClient on first use. Connects to the
database with admin credentials and caches both client and db
references in state.

@return {Promise<void>}
    *********************************************************************/
    initIfNot: async function () {

      // Already built
      if (!Lib.Utils.isNullOrUndefined(state.client)) {
        return;
      }

      // Adapter must be loaded before client creation
      _MongoDBAdmin.ensureAdapter();

      const start_ms = Lib.Utils.getUnixTimeInMilliSeconds();

      // Build MongoClient with admin connection options
      state.client = new MongoClient(CONFIG.CONNECTION_STRING, {
        connectTimeoutMS: CONFIG.CONNECT_TIMEOUT_MS,
        serverSelectionTimeoutMS: CONFIG.CONNECT_TIMEOUT_MS
      });

      // Establish connection
      await state.client.connect();

      // Cache the database reference
      state.db = state.client.db(CONFIG.DATABASE_NAME);

      Lib.Debug.performanceAuditLog('End', 'MongoDBAdmin Client', start_ms);
      Lib.Debug.info('MongoDBAdmin Client Initialized', {
        database: CONFIG.DATABASE_NAME
      });

    }

  };//////////////////////////Private Functions END/////////////////////////////



  // Return public interface
  return MongoDBAdmin;

};/////////////////////////// createInterface END ///////////////////////////////
