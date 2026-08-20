// Info: Config validator for js-server-helper-kv-aws-elasticache.
// Validates all config keys including AWS credentials and IAM auth settings.
// Throws TypeError on misconfiguration so the module fails before serving.
'use strict';


// Shared dependencies injected by loader
let Lib;
let ERRORS; // eslint-disable-line no-unused-vars


/////////////////////////// Module-Loader START ////////////////////////////////

/********************************************************************
Singleton loader. Injects Lib and ERRORS, then returns the module-scope
Validators object.

@param {Object} shared_libs - Dependency container (Utils, Debug)
@param {Object} errors - Frozen error catalog

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
  Validate the merged CONFIG. Throws TypeError on any misconfiguration.

  @param {Object} config - Merged module configuration

  @return {void}
  *********************************************************************/
  validateConfig: function (config) {

    // Known keys
    const knownKeys = new Set([
      'HOST', 'PORT', 'DB', 'TLS', 'TLS_CONFIG',
      'REGION', 'KEY', 'SECRET', 'ENDPOINT',
      'IAM_USER_ID', 'CACHE_NAME', 'SERVERLESS', 'TOKEN_REFRESH_MARGIN_SECONDS',
      'KEY_PREFIX', 'SERIALIZE_JSON', 'SCAN_PAGE_SIZE',
      'CONNECT_TIMEOUT_MS', 'COMMAND_TIMEOUT_MS'
    ]);

    // Check for unknown keys
    for (const key of Object.keys(config)) {
      if (!knownKeys.has(key)) {
        throw new TypeError('Unknown config key: ' + key + '. Known keys: ' + Array.from(knownKeys).join(', '));
      }
    }

    // HOST must be a String if present
    if (config.HOST !== undefined && !Lib.Utils.isString(config.HOST)) {
      throw new TypeError('HOST must be a String');
    }

    // PORT must be a Number in range 1-65535 if present
    if (config.PORT !== undefined) {
      if (!Lib.Utils.isNumber(config.PORT) || config.PORT < 1 || config.PORT > 65535) {
        throw new TypeError('PORT must be a Number between 1 and 65535');
      }
    }

    // DB must be a Number in range 0-15 if present
    if (config.DB !== undefined) {
      if (!Lib.Utils.isNumber(config.DB) || config.DB < 0 || config.DB > 15) {
        throw new TypeError('DB must be a Number between 0 and 15');
      }
    }

    // TLS must be a Boolean if present
    if (config.TLS !== undefined && !Lib.Utils.isBoolean(config.TLS)) {
      throw new TypeError('TLS must be a Boolean');
    }

    // TLS_CONFIG must be an Object if present
    if (config.TLS_CONFIG !== undefined && config.TLS_CONFIG !== null && !Lib.Utils.isObject(config.TLS_CONFIG)) {
      throw new TypeError('TLS_CONFIG must be an Object');
    }

    // REGION must be a String if present
    if (config.REGION !== undefined && !Lib.Utils.isString(config.REGION)) {
      throw new TypeError('REGION must be a String');
    }

    // KEY must be a String if present
    if (config.KEY !== undefined && config.KEY !== null && !Lib.Utils.isString(config.KEY)) {
      throw new TypeError('KEY must be a String');
    }

    // SECRET must be a String if present
    if (config.SECRET !== undefined && config.SECRET !== null && !Lib.Utils.isString(config.SECRET)) {
      throw new TypeError('SECRET must be a String');
    }

    // ENDPOINT must be a String if present
    if (config.ENDPOINT !== undefined && config.ENDPOINT !== null && !Lib.Utils.isString(config.ENDPOINT)) {
      throw new TypeError('ENDPOINT must be a String');
    }

    // IAM_USER_ID must be a String if present
    if (config.IAM_USER_ID !== undefined && config.IAM_USER_ID !== null && !Lib.Utils.isString(config.IAM_USER_ID)) {
      throw new TypeError('IAM_USER_ID must be a String');
    }

    // CACHE_NAME must be a String if present
    if (config.CACHE_NAME !== undefined && config.CACHE_NAME !== null && !Lib.Utils.isString(config.CACHE_NAME)) {
      throw new TypeError('CACHE_NAME must be a String');
    }

    // SERVERLESS must be a Boolean if present
    if (config.SERVERLESS !== undefined && !Lib.Utils.isBoolean(config.SERVERLESS)) {
      throw new TypeError('SERVERLESS must be a Boolean');
    }

    // TOKEN_REFRESH_MARGIN_SECONDS must be a positive Number if present
    if (config.TOKEN_REFRESH_MARGIN_SECONDS !== undefined) {
      if (!Lib.Utils.isNumber(config.TOKEN_REFRESH_MARGIN_SECONDS) || config.TOKEN_REFRESH_MARGIN_SECONDS <= 0) {
        throw new TypeError('TOKEN_REFRESH_MARGIN_SECONDS must be a positive Number');
      }
    }

    // KEY_PREFIX must be a String if present
    if (config.KEY_PREFIX !== undefined && !Lib.Utils.isString(config.KEY_PREFIX)) {
      throw new TypeError('KEY_PREFIX must be a String');
    }

    // SERIALIZE_JSON must be a Boolean if present
    if (config.SERIALIZE_JSON !== undefined && !Lib.Utils.isBoolean(config.SERIALIZE_JSON)) {
      throw new TypeError('SERIALIZE_JSON must be a Boolean');
    }

    // CONNECT_TIMEOUT_MS must be a positive Number if present
    if (config.CONNECT_TIMEOUT_MS !== undefined) {
      if (!Lib.Utils.isNumber(config.CONNECT_TIMEOUT_MS) || config.CONNECT_TIMEOUT_MS <= 0) {
        throw new TypeError('CONNECT_TIMEOUT_MS must be a positive Number');
      }
    }

    // COMMAND_TIMEOUT_MS must be a positive Number if present
    if (config.COMMAND_TIMEOUT_MS !== undefined) {
      if (!Lib.Utils.isNumber(config.COMMAND_TIMEOUT_MS) || config.COMMAND_TIMEOUT_MS <= 0) {
        throw new TypeError('COMMAND_TIMEOUT_MS must be a positive Number');
      }
    }

    // SCAN_PAGE_SIZE must be a positive Number if present
    if (config.SCAN_PAGE_SIZE !== undefined) {
      if (!Lib.Utils.isNumber(config.SCAN_PAGE_SIZE) || config.SCAN_PAGE_SIZE <= 0) {
        throw new TypeError('SCAN_PAGE_SIZE must be a positive Number');
      }
    }

    // If IAM_USER_ID is set, CACHE_NAME and KEY and SECRET must also be set
    if (config.IAM_USER_ID) {
      if (!config.CACHE_NAME) {
        throw new TypeError('CACHE_NAME is required when IAM_USER_ID is set (used in SigV4 token signing)');
      }
      if (!config.KEY || !config.SECRET) {
        throw new TypeError('KEY and SECRET are required when IAM_USER_ID is set');
      }
    }

  }


};////////////////////////////// Public Functions END //////////////////////////
