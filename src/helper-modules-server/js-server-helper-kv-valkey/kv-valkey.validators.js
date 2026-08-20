// Info: Config validator for js-server-helper-kv-valkey.
// Called once at construction time from the loader to validate CONFIG.
// Throws TypeError on misconfiguration so the module fails before serving
// a single request.
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
@param {Object} errors - Frozen error catalog (kv-valkey.errors.js)

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
  Validate the merged CONFIG. Throws TypeError on any misconfiguration
  so the loader fails before the module is used.

  @param {Object} config - Merged module configuration

  @return {void}
  *********************************************************************/
  validateConfig: function (config) {

    // Known keys - any key not in this set is a typo that should fail at boot
    const knownKeys = new Set([
      'HOST', 'PORT', 'PASSWORD', 'USERNAME', 'KEY_PREFIX', 'DB',
      'TLS', 'TLS_CONFIG', 'CONNECT_TIMEOUT_MS', 'COMMAND_TIMEOUT_MS',
      'SERIALIZE_JSON', 'SCAN_PAGE_SIZE'
    ]);

    // Check for unknown keys (catches typos like KEYPREFIX at boot)
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

    // PASSWORD must be a String if present
    if (config.PASSWORD !== undefined && config.PASSWORD !== null && !Lib.Utils.isString(config.PASSWORD)) {
      throw new TypeError('PASSWORD must be a String');
    }

    // USERNAME must be a String if present
    if (config.USERNAME !== undefined && config.USERNAME !== null && !Lib.Utils.isString(config.USERNAME)) {
      throw new TypeError('USERNAME must be a String');
    }

    // KEY_PREFIX must be a String if present
    if (config.KEY_PREFIX !== undefined && !Lib.Utils.isString(config.KEY_PREFIX)) {
      throw new TypeError('KEY_PREFIX must be a String');
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

  }


};////////////////////////////// Public Functions END //////////////////////////
