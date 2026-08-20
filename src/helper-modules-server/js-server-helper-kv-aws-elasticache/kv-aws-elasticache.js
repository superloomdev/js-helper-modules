// Info: AWS ElastiCache key-value driver with IAM authentication.
// Server-only: wraps kv-valkey with SigV4 token generation for ElastiCache IAM auth.
//
// Compatibility: Node.js 24+. Targets ElastiCache with Valkey 7.2+ or Redis OSS 7.0+,
// cluster mode disabled, TLS enabled, IAM authentication configured.
//
// Factory pattern: each loader call returns an independent KV interface
// with its own Lib, CONFIG, and per-instance ioredis client (via kv-valkey).
//
// When IAM_USER_ID is configured, the module generates SigV4-signed auth tokens
// using the aws4 library and injects them as the ioredis PASSWORD. Tokens are
// cached and refreshed before expiry. When IAM_USER_ID is not configured, the
// module falls through to kv-valkey's standard password auth.
'use strict';

// Shared stateless aws4 signer (module-level - require() is cached anyway).
let aws4 = null;



/////////////////////////// Module-Loader START ////////////////////////////////

/********************************************************************
Factory loader. One call = one independent instance with its own
Lib, CONFIG, and kv-valkey-backed ioredis client.

@param {Object} shared_libs - Lib container with Utils, Debug, Instance, KV
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
    require('./kv-aws-elasticache.config'),
    config || {}
  );

  // Error catalog (frozen, owned by the main module)
  const ERRORS = require('./kv-aws-elasticache.errors');

  // Validators singleton
  const Validators = require('./kv-aws-elasticache.validators')(Lib, ERRORS);

  // Validate config immediately so misconfiguration fails at startup
  Validators.validateConfig(CONFIG);

  // Mutable per-instance state
  const state = {
    // The underlying kv-valkey instance
    kvValkey: null,
    // Cached IAM token and its expiry time (epoch milliseconds)
    iamToken: null,
    iamTokenExpiresAt: 0
  };

  return createInterface(Lib, CONFIG, ERRORS, Validators, state);

};///////////////////////////// Module-Loader END ///////////////////////////////



/////////////////////////// createInterface START //////////////////////////////

/********************************************************************
Builds the public interface for one instance. Delegates all 17 kv-valkey
functions through to the underlying kv-valkey instance, but overrides
the connection to inject IAM auth tokens.

@param {Object} Lib - Dependency container
@param {Object} CONFIG - Merged configuration
@param {Object} ERRORS - Frozen error catalog
@param {Object} Validators - Validators singleton
@param {Object} state - Mutable state holder
@param {Object} shared_libs - Original shared_libs (for kv-valkey construction)

@return {Object} - Public interface for this module
*********************************************************************/
const createInterface = function (Lib, CONFIG, ERRORS, Validators, state) {

  ///////////////////////////Public Functions START//////////////////////////////
  const KV = {

    // ~~~~~~~~~~~~~~~~~~~~ Lifecycle ~~~~~~~~~~~~~~~~~~~~

    /********************************************************************
    Close the connection. Delegates to kv-valkey.close.

    @param {Object} instance - Request instance

    @return {Promise<Object>} - { success, error }
    *********************************************************************/
    close: async function (instance) {

      // Delegate to kv-valkey if initialized
      if (state.kvValkey) {
        return state.kvValkey.close(instance);
      }

      // Not yet connected - return success (idempotent, matching kv-valkey)
      return {
        success: true,
        error: null
      };

    },


    /********************************************************************
    Ping the server. Ensures the kv-valkey instance is initialized with
    a fresh IAM token, then delegates to kv-valkey.ping.

    @param {Object} instance - Request instance

    @return {Promise<Object>} - { success, error }
    *********************************************************************/
    ping: async function (instance) {

      // Ensure kv-valkey is initialized with IAM auth
      await _KV.initIfNot();

      // Delegate to kv-valkey
      return state.kvValkey.ping(instance);

    },


    // ~~~~~~~~~~~~~~~~~~~~ Single Key ~~~~~~~~~~~~~~~~~~~~

    /********************************************************************
    Set a key to a value, with an optional TTL in seconds.

    @param {Object} instance - Request instance
    @param {String} key - Key name (without prefix)
    @param {*} value - Value to store
    @param {Number} [ttl_seconds] - Optional TTL in seconds

    @return {Promise<Object>} - { success, error }
    *********************************************************************/
    set: async function (instance, key, value, ttl_seconds) {

      await _KV.initIfNot();
      return state.kvValkey.set(instance, key, value, ttl_seconds);

    },


    /********************************************************************
    Get the value of a key. Returns null for absent keys.

    @param {Object} instance - Request instance
    @param {String} key - Key name (without prefix)

    @return {Promise<Object>} - { success, value, error }
    *********************************************************************/
    get: async function (instance, key) {

      await _KV.initIfNot();
      return state.kvValkey.get(instance, key);

    },


    /********************************************************************
    Delete a key. Returns deleted_count (0 if key was absent).

    @param {Object} instance - Request instance
    @param {String} key - Key name (without prefix)

    @return {Promise<Object>} - { success, deleted_count, error }
    *********************************************************************/
    delete: async function (instance, key) {

      await _KV.initIfNot();
      return state.kvValkey.delete(instance, key);

    },


    /********************************************************************
    Check whether a key exists.

    @param {Object} instance - Request instance
    @param {String} key - Key name (without prefix)

    @return {Promise<Object>} - { success, exists, error }
    *********************************************************************/
    getKeyExists: async function (instance, key) {

      await _KV.initIfNot();
      return state.kvValkey.getKeyExists(instance, key);

    },


    // ~~~~~~~~~~~~~~~~~~~~ Multiple Keys ~~~~~~~~~~~~~~~~~~~~

    /********************************************************************
    Set multiple key-value pairs atomically.

    @param {Object} instance - Request instance
    @param {Object} entries - Object of { key: value } pairs
    @param {Number} [ttl_seconds] - Optional TTL for all keys

    @return {Promise<Object>} - { success, error }
    *********************************************************************/
    setMany: async function (instance, entries, ttl_seconds) {

      await _KV.initIfNot();
      return state.kvValkey.setMany(instance, entries, ttl_seconds);

    },


    /********************************************************************
    Get values for multiple keys.

    @param {Object} instance - Request instance
    @param {Array} keys - Array of key names

    @return {Promise<Object>} - { success, values, error }
    *********************************************************************/
    getMany: async function (instance, keys) {

      await _KV.initIfNot();
      return state.kvValkey.getMany(instance, keys);

    },


    /********************************************************************
    Delete multiple keys.

    @param {Object} instance - Request instance
    @param {Array} keys - Array of key names

    @return {Promise<Object>} - { success, deleted_count, error }
    *********************************************************************/
    deleteMany: async function (instance, keys) {

      await _KV.initIfNot();
      return state.kvValkey.deleteMany(instance, keys);

    },


    // ~~~~~~~~~~~~~~~~~~~~ Scan ~~~~~~~~~~~~~~~~~~~~

    /********************************************************************
    Scan all keys matching a glob pattern.

    @param {Object} instance - Request instance
    @param {String} pattern - Redis glob pattern
    @param {Object} [options] - Optional settings

    @return {Promise<Object>} - { success, keys, error }
    *********************************************************************/
    scan: async function (instance, pattern, options) {

      await _KV.initIfNot();
      return state.kvValkey.scan(instance, pattern, options);

    },


    // ~~~~~~~~~~~~~~~~~~~~ Hash ~~~~~~~~~~~~~~~~~~~~

    /********************************************************************
    Set a field in a hash.

    @param {Object} instance - Request instance
    @param {String} key - Hash key name
    @param {String} field - Field name
    @param {*} value - Value to store

    @return {Promise<Object>} - { success, error }
    *********************************************************************/
    setHashField: async function (instance, key, field, value) {

      await _KV.initIfNot();
      return state.kvValkey.setHashField(instance, key, field, value);

    },


    /********************************************************************
    Get a field from a hash.

    @param {Object} instance - Request instance
    @param {String} key - Hash key name
    @param {String} field - Field name

    @return {Promise<Object>} - { success, value, error }
    *********************************************************************/
    getHashField: async function (instance, key, field) {

      await _KV.initIfNot();
      return state.kvValkey.getHashField(instance, key, field);

    },


    /********************************************************************
    Get all fields from a hash.

    @param {Object} instance - Request instance
    @param {String} key - Hash key name

    @return {Promise<Object>} - { success, fields, error }
    *********************************************************************/
    getHashFields: async function (instance, key) {

      await _KV.initIfNot();
      return state.kvValkey.getHashFields(instance, key);

    },


    /********************************************************************
    Delete a field from a hash.

    @param {Object} instance - Request instance
    @param {String} key - Hash key name
    @param {String} field - Field name

    @return {Promise<Object>} - { success, deleted_count, error }
    *********************************************************************/
    deleteHashField: async function (instance, key, field) {

      await _KV.initIfNot();
      return state.kvValkey.deleteHashField(instance, key, field);

    },


    // ~~~~~~~~~~~~~~~~~~~~ TTL ~~~~~~~~~~~~~~~~~~~~

    /********************************************************************
    Set an expiry on a key.

    @param {Object} instance - Request instance
    @param {String} key - Key name
    @param {Number} ttl_seconds - TTL in seconds

    @return {Promise<Object>} - { success, applied, error }
    *********************************************************************/
    setExpire: async function (instance, key, ttl_seconds) {

      await _KV.initIfNot();
      return state.kvValkey.setExpire(instance, key, ttl_seconds);

    },


    /********************************************************************
    Get the TTL of a key in seconds. Returns null for no-expiry and absent keys.

    @param {Object} instance - Request instance
    @param {String} key - Key name

    @return {Promise<Object>} - { success, ttl_seconds, error }
    *********************************************************************/
    getTtl: async function (instance, key) {

      await _KV.initIfNot();
      return state.kvValkey.getTtl(instance, key);

    },


    // ~~~~~~~~~~~~~~~~~~~~ Counter ~~~~~~~~~~~~~~~~~~~~

    /********************************************************************
    Increment a key by 1 (default) or by the given amount.

    @param {Object} instance - Request instance
    @param {String} key - Key name
    @param {Number} [by] - Amount to increment by

    @return {Promise<Object>} - { success, value, error }
    *********************************************************************/
    increment: async function (instance, key, by) {

      await _KV.initIfNot();
      return state.kvValkey.increment(instance, key, by);

    }

  };///////////////////////////Public Functions END//////////////////////////////



  //////////////////////////Private Functions START/////////////////////////////
  const _KV = {

    /********************************************************************
    Lazy-load the aws4 signing library.

    @return {void}
    *********************************************************************/
    loadAws4: function () {

      if (Lib.Utils.isNullOrUndefined(aws4)) {
        aws4 = require('aws4');
      }

    },


    /********************************************************************
    Generate a SigV4-signed IAM auth token for ElastiCache.

    The token is a signed URL: <cache-name>/?Action=connect&User=<userId>&X-Amz-Expires=900&...
    It is passed as the PASSWORD to ioredis AUTH.

    @return {Object} result
    @return {String} result.token - The signed token
    @return {Number} result.expiresAt - Epoch milliseconds when the token expires
    *********************************************************************/
    generateIamToken: function () {

      // Load aws4 if not already loaded
      _KV.loadAws4();

      // Token TTL (max 900 seconds per AWS)
      const tokenTtlSeconds = 900;

      // Build the SigV4 signing request
      const signed = aws4.sign({
        service: 'elasticache',
        region: CONFIG.AWS_REGION,
        method: 'GET',
        host: CONFIG.CACHE_NAME,
        path: '/?Action=connect&User=' + encodeURIComponent(CONFIG.IAM_USER_ID) + '&X-Amz-Expires=' + tokenTtlSeconds,
        protocol: 'http',
        signQuery: true,
        body: ''
      }, {
        accessKeyId: CONFIG.AWS_KEY,
        secretAccessKey: CONFIG.AWS_SECRET
      });

      // The token is the host + signed path (without the http:// prefix)
      const token = signed.host + signed.path;

      // Calculate expiry time (subtract the refresh margin)
      const now = Date.now();
      const expiresAt = now + (tokenTtlSeconds - CONFIG.TOKEN_REFRESH_MARGIN_SECONDS) * 1000;

      Lib.Debug.info('KV ElastiCache IAM token generated', {
        cacheName: CONFIG.CACHE_NAME,
        userId: CONFIG.IAM_USER_ID,
        region: CONFIG.AWS_REGION,
        expiresAt: new Date(expiresAt).toISOString()
      });

      return {
        token: token,
        expiresAt: expiresAt
      };

    },


    /********************************************************************
    Get a valid IAM auth token, refreshing if the cached one is near expiry.

    @return {Object} result
    @return {String} result.token - A valid (non-expired) token
    @return {Number} result.expiresAt - When this token expires
    *********************************************************************/
    getIamToken: function () {

      // Check if the cached token is still valid
      const now = Date.now();
      if (state.iamToken && now < state.iamTokenExpiresAt) {
        return {
          token: state.iamToken,
          expiresAt: state.iamTokenExpiresAt
        };
      }

      // Generate a fresh token
      const result = _KV.generateIamToken();

      // Cache it
      state.iamToken = result.token;
      state.iamTokenExpiresAt = result.expiresAt;

      return result;

    },


    /********************************************************************
    Create the underlying kv-valkey instance on first use. When IAM auth
    is configured, generates a fresh IAM token and passes it as PASSWORD.
    When IAM auth is not configured, passes through to kv-valkey with
    standard password auth.

    @return {Promise<void>}
    *********************************************************************/
    initIfNot: async function () {

      // Already initialized
      if (state.kvValkey) {
        return;
      }

      // Build the kv-valkey config
      const kvConfig = {
        HOST: CONFIG.HOST,
        PORT: CONFIG.PORT,
        DB: CONFIG.DB,
        TLS: CONFIG.TLS,
        KEY_PREFIX: CONFIG.KEY_PREFIX,
        SERIALIZE_JSON: CONFIG.SERIALIZE_JSON,
        SCAN_PAGE_SIZE: CONFIG.SCAN_PAGE_SIZE,
        CONNECT_TIMEOUT_MS: CONFIG.CONNECT_TIMEOUT_MS,
        COMMAND_TIMEOUT_MS: CONFIG.COMMAND_TIMEOUT_MS
      };

      // Add TLS_CONFIG if present
      if (CONFIG.TLS_CONFIG) {
        kvConfig.TLS_CONFIG = CONFIG.TLS_CONFIG;
      }

      // If IAM auth is configured, generate a token and use it as PASSWORD
      if (CONFIG.IAM_USER_ID) {

        const tokenResult = _KV.getIamToken();

        kvConfig.PASSWORD = tokenResult.token;
        kvConfig.USERNAME = CONFIG.IAM_USER_ID;

        Lib.Debug.info('KV ElastiCache initializing with IAM auth', {
          host: CONFIG.HOST,
          port: CONFIG.PORT,
          iamUserId: CONFIG.IAM_USER_ID
        });

      } else {

        // Fall through to standard password auth (no IAM)
        // PASSWORD and USERNAME are not set here - they come from the caller
        // via the kv-valkey config if needed
        Lib.Debug.info('KV ElastiCache initializing without IAM auth (passthrough)', {
          host: CONFIG.HOST,
          port: CONFIG.PORT
        });

      }

      // Create the kv-valkey instance
      // Use the bare alias - the consumer's package.json maps it to the scoped name
      const kvValkeyModule = require('helper-kv-valkey');

      // Build the Lib container for kv-valkey (it needs Utils, Debug, Instance)
      const kvLib = {
        Utils: Lib.Utils,
        Debug: Lib.Debug,
        Instance: Lib.Instance
      };

      state.kvValkey = kvValkeyModule(kvLib, kvConfig);

    }


  };//////////////////////////Private Functions END/////////////////////////////



  // Return public interface
  return KV;

};/////////////////////////// createInterface END ///////////////////////////////
