// Info: Config and options validator for js-server-helper-nosql-aws-dynamodb-admin.
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
@param {Object} errors - Frozen error catalog (dynamodb-admin.errors.js)

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

    if (Lib.Utils.isNullOrUndefined(config.AWS_REGION) || config.AWS_REGION === '') {
      throw new TypeError('dynamodb-admin: AWS_REGION is required');
    }

    if (typeof config.AWS_REGION !== 'string') {
      throw new TypeError('dynamodb-admin: AWS_REGION must be a string');
    }

    if (!Lib.Utils.isNullOrUndefined(config.AWS_ACCESS_KEY_ID)) {
      if (typeof config.AWS_ACCESS_KEY_ID !== 'string') {
        throw new TypeError('dynamodb-admin: AWS_ACCESS_KEY_ID must be a string');
      }
    }

    if (!Lib.Utils.isNullOrUndefined(config.AWS_SECRET_ACCESS_KEY)) {
      if (typeof config.AWS_SECRET_ACCESS_KEY !== 'string') {
        throw new TypeError('dynamodb-admin: AWS_SECRET_ACCESS_KEY must be a string');
      }
    }

    if (!Lib.Utils.isNullOrUndefined(config.ENDPOINT)) {
      if (typeof config.ENDPOINT !== 'string') {
        throw new TypeError('dynamodb-admin: ENDPOINT must be a string');
      }
    }

    if (!Lib.Utils.isNullOrUndefined(config.WAIT_TIMEOUT_SECONDS)) {
      if (typeof config.WAIT_TIMEOUT_SECONDS !== 'number' || config.WAIT_TIMEOUT_SECONDS < 0) {
        throw new TypeError('dynamodb-admin: WAIT_TIMEOUT_SECONDS must be a non-negative number');
      }
    }

  },


  /********************************************************************
  Validate options for createTable.

  @param {Object} options - Function options

  @return {void}
  *********************************************************************/
  validateCreateTable: function (options) {

    if (Lib.Utils.isNullOrUndefined(options)) {
      throw new TypeError('dynamodb-admin: createTable requires options');
    }

    if (Lib.Utils.isNullOrUndefined(options.table_name) || options.table_name === '') {
      throw new TypeError('dynamodb-admin: createTable requires options.table_name');
    }

    if (typeof options.table_name !== 'string') {
      throw new TypeError('dynamodb-admin: options.table_name must be a string');
    }

    if (Lib.Utils.isNullOrUndefined(options.attribute_definitions) || !Array.isArray(options.attribute_definitions) || options.attribute_definitions.length === 0) {
      throw new TypeError('dynamodb-admin: createTable requires options.attribute_definitions as a non-empty array');
    }

    if (Lib.Utils.isNullOrUndefined(options.key_schema) || !Array.isArray(options.key_schema) || options.key_schema.length === 0) {
      throw new TypeError('dynamodb-admin: createTable requires options.key_schema as a non-empty array');
    }

  },


  /********************************************************************
  Validate options for waitForTableActive.

  @param {Object} options - Function options

  @return {void}
  *********************************************************************/
  validateWaitForTableActive: function (options) {

    if (Lib.Utils.isNullOrUndefined(options)) {
      throw new TypeError('dynamodb-admin: waitForTableActive requires options');
    }

    if (Lib.Utils.isNullOrUndefined(options.table_name) || options.table_name === '') {
      throw new TypeError('dynamodb-admin: waitForTableActive requires options.table_name');
    }

    if (typeof options.table_name !== 'string') {
      throw new TypeError('dynamodb-admin: options.table_name must be a string');
    }

  },


  /********************************************************************
  Validate options for enableTtl.

  @param {Object} options - Function options

  @return {void}
  *********************************************************************/
  validateEnableTtl: function (options) {

    if (Lib.Utils.isNullOrUndefined(options)) {
      throw new TypeError('dynamodb-admin: enableTtl requires options');
    }

    if (Lib.Utils.isNullOrUndefined(options.table_name) || options.table_name === '') {
      throw new TypeError('dynamodb-admin: enableTtl requires options.table_name');
    }

    if (typeof options.table_name !== 'string') {
      throw new TypeError('dynamodb-admin: options.table_name must be a string');
    }

    if (Lib.Utils.isNullOrUndefined(options.attribute_name) || options.attribute_name === '') {
      throw new TypeError('dynamodb-admin: enableTtl requires options.attribute_name');
    }

    if (typeof options.attribute_name !== 'string') {
      throw new TypeError('dynamodb-admin: options.attribute_name must be a string');
    }

  },


  /********************************************************************
  Validate options for deleteTable.

  @param {Object} options - Function options

  @return {void}
  *********************************************************************/
  validateDeleteTable: function (options) {

    if (Lib.Utils.isNullOrUndefined(options)) {
      throw new TypeError('dynamodb-admin: deleteTable requires options');
    }

    if (Lib.Utils.isNullOrUndefined(options.table_name) || options.table_name === '') {
      throw new TypeError('dynamodb-admin: deleteTable requires options.table_name');
    }

    if (typeof options.table_name !== 'string') {
      throw new TypeError('dynamodb-admin: options.table_name must be a string');
    }

  },


  /********************************************************************
  Validate options for describeTable.

  @param {Object} options - Function options

  @return {void}
  *********************************************************************/
  validateDescribeTable: function (options) {

    if (Lib.Utils.isNullOrUndefined(options)) {
      throw new TypeError('dynamodb-admin: describeTable requires options');
    }

    if (Lib.Utils.isNullOrUndefined(options.table_name) || options.table_name === '') {
      throw new TypeError('dynamodb-admin: describeTable requires options.table_name');
    }

    if (typeof options.table_name !== 'string') {
      throw new TypeError('dynamodb-admin: options.table_name must be a string');
    }

  }


};////////////////////////////// Public Functions END //////////////////////////
