// Info: Config and options validator for js-server-helper-nosql-mongodb-admin.
// Called at construction time from the loader to validate CONFIG, and per-call
// from public functions to validate options. Throws TypeError on programmer error.
//
// Singleton: Lib and ERRORS injected once by the loader. Node.js require
// cache guarantees the same reference on every subsequent require.
'use strict';


// Shared dependencies injected by loader
let Lib;
let ERRORS; // eslint-disable-line no-unused-vars


/////////////////////////// Module-Loader START ////////////////////////////////

/********************************************************************
Singleton loader. Injects Lib and ERRORS, then returns the module-scope
Validators object. Takes Lib and ERRORS - no CONFIG - because validators
run before CONFIG is validated.

@param {Object} shared_libs - Dependency container (Utils, Debug)
@param {Object} errors - Frozen error catalog (mongodb-admin.errors.js)

@return {Object} - Public Validators interface
*********************************************************************/
module.exports = function loader (shared_libs, errors) {

  // Inject shared dependencies
  Lib = shared_libs;
  ERRORS = errors;

  // Return the Validators interface
  return Validators;

};///////////////////////////// Module-Loader END ///////////////////////////////



////////////////////////////// Public Functions START ////////////////////////
const Validators = {


  /********************************************************************
  Validate the merged CONFIG. Throws TypeError on any misconfiguration so
  the loader fails before the module is used.

  @param {Object} config - Merged module configuration

  @return {void}
  *********************************************************************/
  validateConfig: function (config) {

    if (Lib.Utils.isNullOrUndefined(config.CONNECTION_STRING) || config.CONNECTION_STRING === '') {
      throw new TypeError('mongodb-admin: CONNECTION_STRING is required');
    }

    if (typeof config.CONNECTION_STRING !== 'string') {
      throw new TypeError('mongodb-admin: CONNECTION_STRING must be a string');
    }

    if (Lib.Utils.isNullOrUndefined(config.DATABASE_NAME) || config.DATABASE_NAME === '') {
      throw new TypeError('mongodb-admin: DATABASE_NAME is required');
    }

    if (typeof config.DATABASE_NAME !== 'string') {
      throw new TypeError('mongodb-admin: DATABASE_NAME must be a string');
    }

    if (!Lib.Utils.isNullOrUndefined(config.CONNECT_TIMEOUT_MS)) {
      if (typeof config.CONNECT_TIMEOUT_MS !== 'number' || config.CONNECT_TIMEOUT_MS < 0) {
        throw new TypeError('mongodb-admin: CONNECT_TIMEOUT_MS must be a non-negative number');
      }
    }

  },


  /********************************************************************
  Validate options for createCollection.

  @param {Object} options - Function options

  @return {void}
  *********************************************************************/
  validateCreateCollection: function (options) {

    if (Lib.Utils.isNullOrUndefined(options)) {
      throw new TypeError('mongodb-admin: createCollection requires options');
    }

    if (Lib.Utils.isNullOrUndefined(options.collection_name) || options.collection_name === '') {
      throw new TypeError('mongodb-admin: createCollection requires options.collection_name');
    }

    if (typeof options.collection_name !== 'string') {
      throw new TypeError('mongodb-admin: options.collection_name must be a string');
    }

  },


  /********************************************************************
  Validate options for createIndexes.

  @param {Object} options - Function options

  @return {void}
  *********************************************************************/
  validateCreateIndexes: function (options) {

    if (Lib.Utils.isNullOrUndefined(options)) {
      throw new TypeError('mongodb-admin: createIndexes requires options');
    }

    if (Lib.Utils.isNullOrUndefined(options.collection_name) || options.collection_name === '') {
      throw new TypeError('mongodb-admin: createIndexes requires options.collection_name');
    }

    if (Lib.Utils.isNullOrUndefined(options.indexes) || !Array.isArray(options.indexes) || options.indexes.length === 0) {
      throw new TypeError('mongodb-admin: createIndexes requires options.indexes as a non-empty array');
    }

  },


  /********************************************************************
  Validate options for enableTtlIndex.

  @param {Object} options - Function options

  @return {void}
  *********************************************************************/
  validateEnableTtlIndex: function (options) {

    if (Lib.Utils.isNullOrUndefined(options)) {
      throw new TypeError('mongodb-admin: enableTtlIndex requires options');
    }

    if (Lib.Utils.isNullOrUndefined(options.collection_name) || options.collection_name === '') {
      throw new TypeError('mongodb-admin: enableTtlIndex requires options.collection_name');
    }

    if (Lib.Utils.isNullOrUndefined(options.field_name) || options.field_name === '') {
      throw new TypeError('mongodb-admin: enableTtlIndex requires options.field_name');
    }

    if (Lib.Utils.isNullOrUndefined(options.expire_after_seconds) || typeof options.expire_after_seconds !== 'number' || options.expire_after_seconds < 0) {
      throw new TypeError('mongodb-admin: enableTtlIndex requires options.expire_after_seconds as a non-negative number');
    }

  },


  /********************************************************************
  Validate options for deleteCollection.

  @param {Object} options - Function options

  @return {void}
  *********************************************************************/
  validateDeleteCollection: function (options) {

    if (Lib.Utils.isNullOrUndefined(options)) {
      throw new TypeError('mongodb-admin: deleteCollection requires options');
    }

    if (Lib.Utils.isNullOrUndefined(options.collection_name) || options.collection_name === '') {
      throw new TypeError('mongodb-admin: deleteCollection requires options.collection_name');
    }

    if (typeof options.collection_name !== 'string') {
      throw new TypeError('mongodb-admin: options.collection_name must be a string');
    }

  },


  /********************************************************************
  Validate options for listIndexes.

  @param {Object} options - Function options

  @return {void}
  *********************************************************************/
  validateListIndexes: function (options) {

    if (Lib.Utils.isNullOrUndefined(options)) {
      throw new TypeError('mongodb-admin: listIndexes requires options');
    }

    if (Lib.Utils.isNullOrUndefined(options.collection_name) || options.collection_name === '') {
      throw new TypeError('mongodb-admin: listIndexes requires options.collection_name');
    }

    if (typeof options.collection_name !== 'string') {
      throw new TypeError('mongodb-admin: options.collection_name must be a string');
    }

  }


};////////////////////////////// Public Functions END //////////////////////////
