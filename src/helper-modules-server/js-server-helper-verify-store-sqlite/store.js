// Info: SQLite store adapter for helper-verify. Fully independent
// module that owns its own CONFIG, ERRORS, and Validators. Every DDL
// statement, UPSERT template, CRUD query, and identifier-quoting rule
// in this file is specific to SQLite.
//
// Standard factory shape: receives shared_libs, picks dependencies by
// reference. The SQL driver arrives as shared_libs.SQL (any helper-sql-*
// dialect satisfies the interface). This adapter never requires
// `node:sqlite` directly - projects not using this store never load
// the driver.
//
// SQLite-specific quirks handled here:
//   - Identifiers are double-quoted ("col"), same as Postgres.
//   - SQLite has no BIGINT / VARCHAR length enforcement - every
//     varchar column is declared as TEXT and every integer column
//     as INTEGER. The schema documents intent, not constraints.
//   - UPSERT uses ON CONFLICT ... DO UPDATE SET col = excluded.col
//     (SQLite 3.24+, available everywhere node:sqlite ships).
//   - CREATE INDEX IF NOT EXISTS is fully supported - the expires_at
//     index is issued alongside CREATE TABLE in setupNewStore().
//
// Store contract (identical shape across all adapters):
//   - setupNewStore(instance)                      -> { success, error }
//   - getRecord(instance, scope, key)              -> { success, record, error }
//   - setRecord(instance, scope, key, record)      -> { success, error }
//   - incrementFailCount(instance, scope, key)     -> { success, error }
//   - deleteRecord(instance, scope, key)           -> { success, error }
//   - cleanupExpiredRecords(instance)              -> { success, deleted_count, error }
//
// SQLite has no native TTL; cleanupExpiredRecords (a sweep over the
// expires_at index) is the garbage-collection path. Apps run it on a cron.

'use strict';



/////////////////////////// Module-Loader START ////////////////////////////////

/********************************************************************
Thin loader. Picks dependencies from the injected container, merges
config over defaults, validates config via the Validators singleton,
then delegates to createInterface. Each call returns an independent
Store instance.

@param {Object} shared_libs - Dependency container (Utils, Debug, SQL)
@param {Object} config      - Overrides merged over adapter config defaults

@return {Object} - Store interface (6 methods: setupNewStore, getRecord, setRecord, incrementFailCount, deleteRecord, cleanupExpiredRecords)
*********************************************************************/
module.exports = function loader (shared_libs, config) {

  // Dependencies for this instance - by reference from the shared container
  const Lib = {
    Utils: shared_libs.Utils,
    Debug: shared_libs.Debug,
    SQL: shared_libs.SQL
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
Builds the public Store interface for one instance. Public and
private functions all close over the same Lib, CONFIG, and
ERRORS. _Store (private helpers) is defined after Store (public
methods) and is referenced by the public methods via the closure -
the same pattern used across all helper modules.

@param {Object} Lib        - Dependency container (Utils, Debug, SQL)
@param {Object} CONFIG     - Merged adapter configuration (validated)
@param {Object} ERRORS     - Frozen error catalog
@param {Object} Validators - Validators singleton (Lib + ERRORS injected)

@return {Object} - Store interface (6 methods: setupNewStore, getRecord, setRecord, incrementFailCount, deleteRecord, cleanupExpiredRecords)
*********************************************************************/
const createInterface = function (Lib, CONFIG, ERRORS, Validators) { // eslint-disable-line no-unused-vars

  ////////////////////////////// Public Functions START ////////////////////////
  const Store = {


    // ~~~~~~~~~~~~~~~~~~~~ Schema Setup ~~~~~~~~~~~~~~~~~~~~
    // One-shot idempotent DDL executed at application boot before any
    // CRUD call. Creates the table and the expires_at index. Both
    // statements use IF NOT EXISTS so repeated calls are no-ops.

    /********************************************************************
    Idempotent table + index creation. Both statements use
    IF NOT EXISTS so the method is safe to call on every boot.

    @param {Object} instance - Request instance

    @return {Promise<Object>} - { success, error }
    *********************************************************************/
    setupNewStore: async function (instance) {

      // Execute each DDL statement in order (CREATE TABLE, CREATE INDEX)
      for (const stmt of _Store.ddl) {
        const result = await Lib.SQL.write(instance, stmt, []);

        // Return a service error if any DDL statement failed
        if (result.success === false) {
          Lib.Debug.debug('Verify sqlite setupNewStore failed', {
            type: ERRORS.SERVICE_UNAVAILABLE.type,
            driver_type: result.error && result.error.type,
            driver_message: result.error && result.error.message,
            statement: stmt
          });
          return {
            success: false,
            error: ERRORS.SERVICE_UNAVAILABLE
          };
        }
      }

      // Report success - table and index are ready
      return {
        success: true,
        error: null
      };

    },


    // ~~~~~~~~~~~~~~~~~~~~ CRUD ~~~~~~~~~~~~~~~~~~~~
    // Read and write operations against the composite primary key
    // (scope, id). setRecord is an upsert; getRecord returns null
    // on a miss; incrementFailCount is an atomic in-place UPDATE.

    /********************************************************************
    Read by composite primary key (scope, id). Returns null when absent.

    @param {Object} instance - Request instance
    @param {String} scope    - Logical owner namespace
    @param {String} key      - Specific verification purpose

    @return {Promise<Object>} - { success, record, error }
    *********************************************************************/
    getRecord: async function (instance, scope, key) {

      // Fetch the record row by composite primary key
      const result = await Lib.SQL.getRow(
        instance,
        'SELECT "code", "fail_count", "created_at", "expires_at"' +
        ' FROM ' + _Store.Q(CONFIG.table_name) +
        ' WHERE "scope" = ? AND "id" = ?',
        [scope, key]
      );

      // Return a service error if the driver call failed
      if (result.success === false) {
        Lib.Debug.debug('Verify sqlite getRecord failed', {
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

      // Return early when the row does not exist
      return {
        success: true,
        record: result.row || null,
        error: null
      };

    },


    /********************************************************************
    Upsert via INSERT ... ON CONFLICT DO UPDATE SET. A second call
    with the same (scope, id) key replaces the mutable columns in
    a single round-trip.

    @param {Object} instance - Request instance
    @param {String} scope    - Logical owner namespace
    @param {String} key      - Specific verification purpose
    @param {Object} record   - { code, fail_count, created_at, expires_at }

    @return {Promise<Object>} - { success, error }
    *********************************************************************/
    setRecord: async function (instance, scope, key, record) {

      // Run the UPSERT with the precomputed template
      const result = await Lib.SQL.write(
        instance,
        _Store.upsert_sql,
        [scope, key, record.code, record.fail_count, record.created_at, record.expires_at]
      );

      // Return a service error if the driver call failed
      if (result.success === false) {
        Lib.Debug.debug('Verify sqlite setRecord failed', {
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
    Atomic fail-counter increment via in-place UPDATE. Safe under
    concurrent verify attempts - each call adds exactly 1.

    @param {Object} instance - Request instance
    @param {String} scope    - Logical owner namespace
    @param {String} key      - Specific verification purpose

    @return {Promise<Object>} - { success, error }
    *********************************************************************/
    incrementFailCount: async function (instance, scope, key) {

      // Atomically increment the fail_count column for this record
      const result = await Lib.SQL.write(
        instance,
        'UPDATE ' + _Store.Q(CONFIG.table_name) +
        ' SET "fail_count" = "fail_count" + 1' +
        ' WHERE "scope" = ? AND "id" = ?',
        [scope, key]
      );

      // Return a service error if the driver call failed
      if (result.success === false) {
        Lib.Debug.debug('Verify sqlite incrementFailCount failed', {
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
    Idempotent delete by composite key. A missing row is treated as
    success so callers do not need to check existence first.

    @param {Object} instance - Request instance
    @param {String} scope    - Logical owner namespace
    @param {String} key      - Specific verification purpose

    @return {Promise<Object>} - { success, error }
    *********************************************************************/
    deleteRecord: async function (instance, scope, key) {

      // Remove the record row by composite primary key
      const result = await Lib.SQL.write(
        instance,
        'DELETE FROM ' + _Store.Q(CONFIG.table_name) +
        ' WHERE "scope" = ? AND "id" = ?',
        [scope, key]
      );

      // Return a service error if the driver call failed
      if (result.success === false) {
        Lib.Debug.debug('Verify sqlite deleteRecord failed', {
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
    // Background sweep for expired rows. SQLite has no native TTL,
    // so cleanupExpiredRecords (run on a cron) is the garbage-
    // collection path. The expires_at index keeps this an efficient
    // range scan even as the table grows.

    /********************************************************************
    Sweep expired records. Uses the expires_at index for an efficient
    range scan. SQLite has no native TTL, so this is the
    garbage-collection path - run it on a cron.

    @param {Object} instance - Request instance

    @return {Promise<Object>} - { success, deleted_count, error }
    *********************************************************************/
    cleanupExpiredRecords: async function (instance) {

      // Sweep all rows whose expires_at is in the past
      const now = instance.time;
      const result = await Lib.SQL.write(
        instance,
        'DELETE FROM ' + _Store.Q(CONFIG.table_name) +
        ' WHERE "expires_at" < ?',
        [now]
      );

      // Return a service error if the driver call failed
      if (result.success === false) {
        Lib.Debug.debug('Verify sqlite cleanupExpiredRecords failed', {
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

      // Report success with the number of rows removed
      return {
        success: true,
        deleted_count: result.affected_rows || 0,
        error: null
      };

    }

  };////////////////////////////// Public Functions END ////////////////////////



  ///////////////////////////// Private Functions START ////////////////////////
  const _Store = {


    /********************************************************************
    Quote an identifier using SQLite's native double-quote style (same
    as Postgres). The table_name arrives from STORE_CONFIG, so this
    guard makes identifier injection impossible even if the caller
    passes a crafted table name.

    @param {String} name - Identifier (table or column)

    @return {String} - Quoted identifier
    *********************************************************************/
    Q: function (name) {

      // Reject identifiers that would break the double-quote escaping
      if (name.indexOf('"') !== -1) {
        throw new Error('[helper-verify-store-sqlite] identifier contains double-quote: ' + name);
      }

      // Wrap in SQLite double-quote style
      return '"' + name + '"';

    },


    /********************************************************************
    Build the CREATE TABLE + CREATE INDEX DDL array. Idempotent via
    IF NOT EXISTS. Called once at createInterface time and stored on
    _Store so the strings are not rebuilt on every initialize() call.
    Closes over CONFIG from createInterface.

    @return {Array<String>} - [CREATE TABLE stmt, CREATE INDEX stmt]
    *********************************************************************/
    buildDDL: function () {

      // Build the quoted table name and deterministic index name
      const Q = _Store.Q;
      const t = Q(CONFIG.table_name);
      const idx = Q(CONFIG.table_name + '_expires_at_idx');

      return [
        'CREATE TABLE IF NOT EXISTS ' + t + ' (' +
        '  "scope"      TEXT    NOT NULL,' +
        '  "id"         TEXT    NOT NULL,' +
        '  "code"       TEXT    NOT NULL,' +
        '  "fail_count" INTEGER NOT NULL DEFAULT 0,' +
        '  "created_at" INTEGER NOT NULL,' +
        '  "expires_at" INTEGER NOT NULL,' +
        '  PRIMARY KEY ("scope", "id")' +
        ')',
        'CREATE INDEX IF NOT EXISTS ' + idx + ' ON ' + t + ' ("expires_at")'
      ];

    },


    /********************************************************************
    Build the SQLite UPSERT statement. Uses
      INSERT ... ON CONFLICT (scope, id) DO UPDATE SET col = excluded.col
    Supported since SQLite 3.24 (2018) and available everywhere
    node:sqlite ships. Called once at createInterface time.
    Closes over CONFIG from createInterface.

    @return {String} - SQL template using `?` placeholders
    *********************************************************************/
    buildUpsertSQL: function () {

      // Build the quoted table name then emit the full UPSERT template
      const t = _Store.Q(CONFIG.table_name);
      return (
        'INSERT INTO ' + t +
        ' ("scope", "id", "code", "fail_count", "created_at", "expires_at")' +
        ' VALUES (?, ?, ?, ?, ?, ?)' +
        ' ON CONFLICT ("scope", "id") DO UPDATE SET' +
        ' "code" = excluded."code",' +
        ' "fail_count" = excluded."fail_count",' +
        ' "created_at" = excluded."created_at",' +
        ' "expires_at" = excluded."expires_at"'
      );

    }

  };///////////////////////////// Private Functions END ////////////////////////


  // Precompute the DDL array and UPSERT template once per instance.
  // Non-trivial string builds called on every initialize / setRecord.
  _Store.ddl = _Store.buildDDL();
  _Store.upsert_sql = _Store.buildUpsertSQL();

  return Store;

};///////////////////////////// createInterface END /////////////////////////////
