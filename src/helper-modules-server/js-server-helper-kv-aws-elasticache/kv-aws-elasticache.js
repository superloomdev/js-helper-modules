// Info: AWS ElastiCache key-value driver with IAM authentication.
// Server-only: standalone module using ioredis directly with AWS SDK v3
// SigV4 signing for ElastiCache IAM auth tokens.
//
// Compatibility: Node.js 24+. Targets ElastiCache with Valkey 7.2+ or
// Redis OSS 7.0+, cluster mode disabled, TLS enabled, IAM authentication.
//
// Factory pattern: each loader call returns an independent KV interface
// with its own Lib, CONFIG, and per-instance ioredis client.
//
// When IAM_USER_ID is configured, the module generates SigV4-signed auth
// tokens and injects them as the ioredis password. Tokens are cached and
// refreshed before expiry. When ENDPOINT is set (local testing), IAM auth
// is skipped and a plain ioredis connection is used.
//
// Why @smithy/signature-v4 and not @aws-sdk/client-elasticache:
//   @aws-sdk/client-elasticache is the ElastiCache control-plane client
//   (create/delete clusters, manage users). It does NOT connect to the
//   cache for data operations and does NOT generate IAM auth tokens.
//   ElastiCache's data plane is the Redis protocol (RESP), accessed via
//   a standard Redis client (ioredis), not the AWS SDK.
//
//   AWS's own documentation (auth-iam.html) shows the same two-step
//   approach: (1) generate a SigV4 presigned token, (2) pass it as the
//   password to a Redis client. Their Java example uses the SDK's
//   internal SigV4 signer + Lettuce (a Redis client). Our module uses
//   the same pattern: @smithy/signature-v4 + ioredis.
//
//   @smithy/signature-v4 is published by AWS as part of the AWS SDK v3
//   monorepo (github.com/aws/aws-sdk-js-v3). It is the same signing
//   engine that @aws-sdk/client-elasticache uses internally to sign
//   its own control-plane requests. We use it directly for query-string
//   presigning because AWS never shipped a higher-level ElastiCache
//   token generator (unlike RDS, which has @aws-sdk/rds-signer).
//
//   @aws-crypto/sha256-js is also published by AWS as part of the
//   AWS SDK v3 monorepo. SigV4 signing requires a SHA-256 hash
//   implementation; this is the same one the SDK uses internally.
//
// Lazy-loaded drivers (stateless, shared across instances):
//   - 'ioredis' -> Redis class, used to build the database client
//   - '@smithy/signature-v4' -> SignatureV4 class, AWS SDK v3 SigV4 signer
//   - '@aws-crypto/sha256-js' -> Sha256 hash, AWS SDK v3 crypto primitive
'use strict';

// Shared stateless drivers (module-level - require() is cached anyway).
let Redis = null;
let SignatureV4 = null;
let Sha256 = null;



/////////////////////////// Module-Loader START ////////////////////////////////

/********************************************************************
Factory loader. One call = one independent instance with its own
Lib, CONFIG, and ioredis client.

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
    require('./kv-aws-elasticache.config'),
    config || {}
  );

  // Error catalog (frozen, owned by the main module)
  const ERRORS = require('./kv-aws-elasticache.errors');

  // Validators singleton
  const Validators = require('./kv-aws-elasticache.validators')(Lib, ERRORS);

  // Validate config immediately so misconfiguration fails at startup
  Validators.validateConfig(CONFIG);

  // Mutable per-instance state (ioredis client + IAM token cache)
  const state = {
    client: null,
    iamToken: null,
    iamTokenExpiresAt: 0
  };

  return createInterface(Lib, CONFIG, ERRORS, Validators, state);

};///////////////////////////// Module-Loader END ///////////////////////////////



/////////////////////////// createInterface START //////////////////////////////

/*********************************************************************
Builds the public interface for one instance. Public and private
functions close over the provided Lib, CONFIG, ERRORS, Validators,
and state.

@param {Object} Lib - Dependency container (Utils, Debug, Instance)
@param {Object} CONFIG - Merged configuration for this instance
@param {Object} ERRORS - Frozen error catalog for this module
@param {Object} Validators - Validators singleton (Lib + ERRORS injected)
@param {Object} state - Mutable state holder (ioredis client + token cache)

@return {Object} - Public interface for this module
*********************************************************************/
const createInterface = function (Lib, CONFIG, ERRORS, Validators, state) {

  ///////////////////////////Public Functions START//////////////////////////////
  const KV = {

    // ~~~~~~~~~~~~~~~~~~~~ Lifecycle ~~~~~~~~~~~~~~~~~~~~

    /********************************************************************
    Close the ElastiCache connection for this instance. Idempotent:
    returns success if already closed or never connected.

    @param {Object} instance - Request instance

    @return {Promise<Object>} - { success, error }
    *********************************************************************/
    close: async function (instance) { // eslint-disable-line no-unused-vars

      const start_ms = Lib.Utils.getUnixTimeInMilliSeconds();

      try {

        // Close ioredis client if it exists
        if (!Lib.Utils.isNullOrUndefined(state.client)) {
          await state.client.quit();
          state.client = null;
        }

        Lib.Debug.performanceAuditLog('End', 'KV close', start_ms);

        // Return successful response
        return {
          success: true,
          error: null
        };

      } catch (error) {

        Lib.Debug.debug('KV close failed', {
          type: ERRORS.KV_CONNECTION_FAILED.type,
          message: error.message,
          stack: error.stack
        });

        // Return error response
        return {
          success: false,
          error: ERRORS.KV_CONNECTION_FAILED
        };

      }

    },


    /********************************************************************
    Ping the ElastiCache server. Triggers lazy connect on first call.

    @param {Object} instance - Request instance

    @return {Promise<Object>} - { success, error }
    *********************************************************************/
    ping: async function (instance) { // eslint-disable-line no-unused-vars

      // Ensure ioredis client is initialized
      await _KV.initIfNot();

      const start_ms = Lib.Utils.getUnixTimeInMilliSeconds();

      try {

        // Execute PING command
        await state.client.ping();

        Lib.Debug.performanceAuditLog('End', 'KV ping', start_ms);

        // Return successful response
        return {
          success: true,
          error: null
        };

      } catch (error) {

        Lib.Debug.debug('KV ping failed', {
          type: ERRORS.KV_CONNECTION_FAILED.type,
          message: error.message,
          stack: error.stack
        });

        // Return error response
        return {
          success: false,
          error: ERRORS.KV_CONNECTION_FAILED
        };

      }

    },


    // ~~~~~~~~~~~~~~~~~~~~ Single Key ~~~~~~~~~~~~~~~~~~~~

    /********************************************************************
    Set a key to a value, with an optional TTL in seconds.

    @param {Object} instance - Request instance
    @param {String} key - Key name (without prefix)
    @param {*} value - Value to store (JSON-serialized when SERIALIZE_JSON is true)
    @param {Number} [ttl_seconds] - Optional TTL in seconds

    @return {Promise<Object>} - { success, error }
    *********************************************************************/
    set: async function (instance, key, value, ttl_seconds) {

      // Ensure ioredis client is initialized
      await _KV.initIfNot();

      const start_ms = Lib.Utils.getUnixTimeInMilliSeconds();

      try {

        // Serialize value if JSON mode is enabled
        let stored = value;
        if (CONFIG.SERIALIZE_JSON) {
          try {
            stored = JSON.stringify(value);
          } catch (serializeError) {
            Lib.Debug.debug('KV set serialization failed', {
              type: ERRORS.KV_SERIALIZATION_FAILED.type,
              message: serializeError.message
            });
            return {
              success: false,
              error: ERRORS.KV_SERIALIZATION_FAILED
            };
          }
        }

        // Build the prefixed key
        const prefixedKey = _KV.prefixKey(key);

        // Execute SET with optional expiry in a single command
        if (ttl_seconds !== undefined && ttl_seconds !== null) {
          await state.client.set(prefixedKey, stored, 'EX', ttl_seconds);
        } else {
          await state.client.set(prefixedKey, stored);
        }

        Lib.Debug.performanceAuditLog('End', 'KV set', start_ms);

        // Return successful response
        return {
          success: true,
          error: null
        };

      } catch (error) {

        Lib.Debug.debug('KV set failed', {
          type: ERRORS.KV_COMMAND_FAILED.type,
          message: error.message,
          stack: error.stack
        });

        // Return error response
        return {
          success: false,
          error: ERRORS.KV_COMMAND_FAILED
        };

      }

    },


    /********************************************************************
    Set a key to a value only if the key does not already exist. Atomic
    single-command SET NX with optional TTL. Returns applied: true if
    this caller created the key, applied: false if the key already
    existed and nothing was written. applied: false is not an error.

    This is the primitive distributed locks are built on. The lock
    caller calls setIfNotExists with a TTL; exactly one concurrent
    caller receives applied: true and proceeds to fetch. The rest
    receive applied: false and wait. If the lock holder crashes before
    releasing, the TTL expires the key and the next caller acquires it.

    @param {Object} instance - Request instance
    @param {String} key - Key name (without prefix)
    @param {*} value - Value to store (JSON-serialized when SERIALIZE_JSON is true)
    @param {Number} [ttl_seconds] - Optional TTL in seconds

    @return {Promise<Object>} - { success, applied, error }
    *********************************************************************/
    setIfNotExists: async function (instance, key, value, ttl_seconds) {

      // Ensure ioredis client is initialized
      await _KV.initIfNot();

      const start_ms = Lib.Utils.getUnixTimeInMilliSeconds();

      try {

        // Serialize value if JSON mode is enabled
        let stored = value;
        if (CONFIG.SERIALIZE_JSON) {
          try {
            stored = JSON.stringify(value);
          } catch (serializeError) {
            Lib.Debug.debug('KV setIfNotExists serialization failed', {
              type: ERRORS.KV_SERIALIZATION_FAILED.type,
              message: serializeError.message
            });
            return {
              success: false,
              applied: false,
              error: ERRORS.KV_SERIALIZATION_FAILED
            };
          }
        }

        // Build the prefixed key
        const prefixedKey = _KV.prefixKey(key);

        // Execute SET NX with optional expiry in a single atomic command.
        // ioredis returns 'OK' when the key was set, null when NX prevented
        // the write because the key already existed. null is a normal
        // outcome, not a thrown error.
        let reply;
        if (ttl_seconds !== undefined && ttl_seconds !== null) {
          reply = await state.client.set(prefixedKey, stored, 'EX', ttl_seconds, 'NX');
        } else {
          reply = await state.client.set(prefixedKey, stored, 'NX');
        }

        Lib.Debug.performanceAuditLog('End', 'KV setIfNotExists', start_ms);

        // Return successful response - applied is true only when the key was set
        return {
          success: true,
          applied: reply === 'OK',
          error: null
        };

      } catch (error) {

        Lib.Debug.debug('KV setIfNotExists failed', {
          type: ERRORS.KV_COMMAND_FAILED.type,
          message: error.message,
          stack: error.stack
        });

        // Return error response
        return {
          success: false,
          applied: false,
          error: ERRORS.KV_COMMAND_FAILED
        };

      }

    },


    /********************************************************************
    Get the value of a key. Returns null for absent keys.

    @param {Object} instance - Request instance
    @param {String} key - Key name (without prefix)

    @return {Promise<Object>} - { success, value, error }
    *********************************************************************/
    get: async function (instance, key) {

      // Ensure ioredis client is initialized
      await _KV.initIfNot();

      const start_ms = Lib.Utils.getUnixTimeInMilliSeconds();

      try {

        // Build the prefixed key
        const prefixedKey = _KV.prefixKey(key);

        // Execute GET command
        const raw = await state.client.get(prefixedKey);

        Lib.Debug.performanceAuditLog('End', 'KV get', start_ms);

        // Key absent - return null
        if (raw === null) {
          return {
            success: true,
            value: null,
            error: null
          };
        }

        // Deserialize value if JSON mode is enabled
        let value = raw;
        if (CONFIG.SERIALIZE_JSON) {
          try {
            value = JSON.parse(raw);
          } catch (parseError) {
            Lib.Debug.debug('KV get deserialization failed', {
              type: ERRORS.KV_SERIALIZATION_FAILED.type,
              message: parseError.message
            });
            return {
              success: false,
              value: null,
              error: ERRORS.KV_SERIALIZATION_FAILED
            };
          }
        }

        // Return successful response with value
        return {
          success: true,
          value: value,
          error: null
        };

      } catch (error) {

        Lib.Debug.debug('KV get failed', {
          type: ERRORS.KV_COMMAND_FAILED.type,
          message: error.message,
          stack: error.stack
        });

        // Return error response
        return {
          success: false,
          value: null,
          error: ERRORS.KV_COMMAND_FAILED
        };

      }

    },


    /********************************************************************
    Delete a key. Returns deleted_count (0 if key was absent).

    @param {Object} instance - Request instance
    @param {String} key - Key name (without prefix)

    @return {Promise<Object>} - { success, deleted_count, error }
    *********************************************************************/
    delete: async function (instance, key) {

      // Ensure ioredis client is initialized
      await _KV.initIfNot();

      const start_ms = Lib.Utils.getUnixTimeInMilliSeconds();

      try {

        // Build the prefixed key
        const prefixedKey = _KV.prefixKey(key);

        // Execute DEL command
        const deleted_count = await state.client.del(prefixedKey);

        Lib.Debug.performanceAuditLog('End', 'KV delete', start_ms);

        // Return successful response with count
        return {
          success: true,
          deleted_count: deleted_count,
          error: null
        };

      } catch (error) {

        Lib.Debug.debug('KV delete failed', {
          type: ERRORS.KV_COMMAND_FAILED.type,
          message: error.message,
          stack: error.stack
        });

        // Return error response
        return {
          success: false,
          deleted_count: null,
          error: ERRORS.KV_COMMAND_FAILED
        };

      }

    },


    /********************************************************************
    Check whether a key exists.

    @param {Object} instance - Request instance
    @param {String} key - Key name (without prefix)

    @return {Promise<Object>} - { success, exists, error }
    *********************************************************************/
    getKeyExists: async function (instance, key) {

      // Ensure ioredis client is initialized
      await _KV.initIfNot();

      const start_ms = Lib.Utils.getUnixTimeInMilliSeconds();

      try {

        // Build the prefixed key
        const prefixedKey = _KV.prefixKey(key);

        // Execute EXISTS command
        const count = await state.client.exists(prefixedKey);

        Lib.Debug.performanceAuditLog('End', 'KV getKeyExists', start_ms);

        // Return successful response with exists boolean
        return {
          success: true,
          exists: count === 1,
          error: null
        };

      } catch (error) {

        Lib.Debug.debug('KV getKeyExists failed', {
          type: ERRORS.KV_COMMAND_FAILED.type,
          message: error.message,
          stack: error.stack
        });

        // Return error response
        return {
          success: false,
          exists: false,
          error: ERRORS.KV_COMMAND_FAILED
        };

      }

    },


    // ~~~~~~~~~~~~~~~~~~~~ Multiple Keys ~~~~~~~~~~~~~~~~~~~~

    /********************************************************************
    Set multiple key-value pairs atomically (MSET on a single instance).
    Takes an object { key: value, ... }. Optional TTL applies to all keys.

    @param {Object} instance - Request instance
    @param {Object} entries - Object of { key: value } pairs
    @param {Number} [ttl_seconds] - Optional TTL in seconds for all keys

    @return {Promise<Object>} - { success, error }
    *********************************************************************/
    setMany: async function (instance, entries, ttl_seconds) {

      // Empty input is a no-op success without contacting the engine
      const keys = Object.keys(entries || {});
      if (keys.length === 0) {
        return {
          success: true,
          error: null
        };
      }

      // Ensure ioredis client is initialized
      await _KV.initIfNot();

      const start_ms = Lib.Utils.getUnixTimeInMilliSeconds();

      try {

        // Serialize all values first - if any fails, write nothing
        const pairs = [];
        for (let i = 0; i < keys.length; i++) {
          const key = keys[i];
          let stored = entries[key];
          if (CONFIG.SERIALIZE_JSON) {
            try {
              stored = JSON.stringify(entries[key]);
            } catch (serializeError) {
              Lib.Debug.debug('KV setMany serialization failed', {
                type: ERRORS.KV_SERIALIZATION_FAILED.type,
                message: serializeError.message,
                key: key
              });
              return {
                success: false,
                error: ERRORS.KV_SERIALIZATION_FAILED
              };
            }
          }
          pairs.push(_KV.prefixKey(key), stored);
        }

        // Execute MSET (atomic on a single instance) or SET with TTL per key
        if (ttl_seconds !== undefined && ttl_seconds !== null) {
          // MSET does not support EX, so use pipeline of SET commands
          const pipeline = state.client.pipeline();
          for (let i = 0; i < pairs.length; i += 2) {
            pipeline.set(pairs[i], pairs[i + 1], 'EX', ttl_seconds);
          }
          await pipeline.exec();
        } else {
          await state.client.mset.apply(state.client, pairs);
        }

        Lib.Debug.performanceAuditLog('End', 'KV setMany', start_ms);

        // Return successful response
        return {
          success: true,
          error: null
        };

      } catch (error) {

        Lib.Debug.debug('KV setMany failed', {
          type: ERRORS.KV_COMMAND_FAILED.type,
          message: error.message,
          stack: error.stack
        });

        // Return error response
        return {
          success: false,
          error: ERRORS.KV_COMMAND_FAILED
        };

      }

    },


    /********************************************************************
    Get values for multiple keys. Returns an array with null in the
    position of each absent key. values.length === keys.length always.

    @param {Object} instance - Request instance
    @param {Array} keys - Array of key names (without prefix)

    @return {Promise<Object>} - { success, values, error }
    *********************************************************************/
    getMany: async function (instance, keys) {

      // Empty input is a no-op success without contacting the engine
      if (!keys || keys.length === 0) {
        return {
          success: true,
          values: [],
          error: null
        };
      }

      // Ensure ioredis client is initialized
      await _KV.initIfNot();

      const start_ms = Lib.Utils.getUnixTimeInMilliSeconds();

      try {

        // Build prefixed keys
        const prefixedKeys = keys.map(_KV.prefixKey);

        // Execute MGET command
        const rawValues = await state.client.mget.apply(state.client, prefixedKeys);

        Lib.Debug.performanceAuditLog('End', 'KV getMany', start_ms);

        // Deserialize values if JSON mode is enabled
        // If any one element fails to parse, the whole call fails
        const values = new Array(rawValues.length);
        if (CONFIG.SERIALIZE_JSON) {
          for (let i = 0; i < rawValues.length; i++) {
            if (rawValues[i] === null) {
              values[i] = null;
            } else {
              try {
                values[i] = JSON.parse(rawValues[i]);
              } catch (parseError) {
                Lib.Debug.debug('KV getMany deserialization failed', {
                  type: ERRORS.KV_SERIALIZATION_FAILED.type,
                  message: parseError.message,
                  index: i
                });
                return {
                  success: false,
                  values: null,
                  error: ERRORS.KV_SERIALIZATION_FAILED
                };
              }
            }
          }
        } else {
          for (let i = 0; i < rawValues.length; i++) {
            values[i] = rawValues[i];
          }
        }

        // Return successful response with values
        return {
          success: true,
          values: values,
          error: null
        };

      } catch (error) {

        Lib.Debug.debug('KV getMany failed', {
          type: ERRORS.KV_COMMAND_FAILED.type,
          message: error.message,
          stack: error.stack
        });

        // Return error response
        return {
          success: false,
          values: null,
          error: ERRORS.KV_COMMAND_FAILED
        };

      }

    },


    /********************************************************************
    Delete multiple keys. Returns exact deleted_count.

    @param {Object} instance - Request instance
    @param {Array} keys - Array of key names (without prefix)

    @return {Promise<Object>} - { success, deleted_count, error }
    *********************************************************************/
    deleteMany: async function (instance, keys) {

      // Empty input is a no-op success without contacting the engine
      if (!keys || keys.length === 0) {
        return {
          success: true,
          deleted_count: 0,
          error: null
        };
      }

      // Ensure ioredis client is initialized
      await _KV.initIfNot();

      const start_ms = Lib.Utils.getUnixTimeInMilliSeconds();

      try {

        // Build prefixed keys
        const prefixedKeys = keys.map(_KV.prefixKey);

        // Execute DEL command with all keys
        const deleted_count = await state.client.del.apply(state.client, prefixedKeys);

        Lib.Debug.performanceAuditLog('End', 'KV deleteMany', start_ms);

        // Return successful response with count
        return {
          success: true,
          deleted_count: deleted_count,
          error: null
        };

      } catch (error) {

        Lib.Debug.debug('KV deleteMany failed', {
          type: ERRORS.KV_COMMAND_FAILED.type,
          message: error.message,
          stack: error.stack
        });

        // Return error response
        return {
          success: false,
          deleted_count: null,
          error: ERRORS.KV_COMMAND_FAILED
        };

      }

    },


    // ~~~~~~~~~~~~~~~~~~~~ Scan ~~~~~~~~~~~~~~~~~~~~

    /********************************************************************
    Scan all keys matching a glob pattern. Collects all results across
    cursor pages and returns them in one call. O(N) over the keyspace.
    Maintenance tool, not a request-path operation.

    @param {Object} instance - Request instance
    @param {String} pattern - Redis glob pattern (e.g. 'user:*')
    @param {Object} [options] - Optional settings

    @return {Promise<Object>} - { success, keys, error }
    *********************************************************************/
    scan: async function (instance, pattern, options) { // eslint-disable-line no-unused-vars

      // Ensure ioredis client is initialized
      await _KV.initIfNot();

      const start_ms = Lib.Utils.getUnixTimeInMilliSeconds();

      try {

        // Build the prefixed pattern for matching
        const prefixedPattern = _KV.prefixKey(pattern);

        // Page through SCAN until cursor returns 0
        const allKeys = [];
        let cursor = '0';

        do {

          // Execute SCAN command with COUNT hint
          const [nextCursor, pageKeys] = await state.client.scan(
            cursor,
            'MATCH', prefixedPattern,
            'COUNT', CONFIG.SCAN_PAGE_SIZE
          );

          // Collect keys from this page
          allKeys.push.apply(allKeys, pageKeys);
          cursor = nextCursor;

        } while (cursor !== '0');

        Lib.Debug.performanceAuditLog('End', 'KV scan', start_ms);

        // Strip prefix from every returned key
        const keys = allKeys.map(_KV.stripPrefix);

        // Return successful response with keys
        return {
          success: true,
          keys: keys,
          error: null
        };

      } catch (error) {

        Lib.Debug.debug('KV scan failed', {
          type: ERRORS.KV_COMMAND_FAILED.type,
          message: error.message,
          stack: error.stack
        });

        // Return error response
        return {
          success: false,
          keys: null,
          error: ERRORS.KV_COMMAND_FAILED
        };

      }

    },


    // ~~~~~~~~~~~~~~~~~~~~ Hash ~~~~~~~~~~~~~~~~~~~~

    /********************************************************************
    Set a single field in a hash.

    @param {Object} instance - Request instance
    @param {String} key - Hash key name (without prefix)
    @param {String} field - Field name within the hash (never prefixed)
    @param {*} value - Value to store (JSON-serialized when SERIALIZE_JSON is true)

    @return {Promise<Object>} - { success, error }
    *********************************************************************/
    setHashField: async function (instance, key, field, value) {

      // Ensure ioredis client is initialized
      await _KV.initIfNot();

      const start_ms = Lib.Utils.getUnixTimeInMilliSeconds();

      try {

        // Serialize value if JSON mode is enabled
        let stored = value;
        if (CONFIG.SERIALIZE_JSON) {
          try {
            stored = JSON.stringify(value);
          } catch (serializeError) {
            Lib.Debug.debug('KV setHashField serialization failed', {
              type: ERRORS.KV_SERIALIZATION_FAILED.type,
              message: serializeError.message
            });
            return {
              success: false,
              error: ERRORS.KV_SERIALIZATION_FAILED
            };
          }
        }

        // Build the prefixed key (field is never prefixed)
        const prefixedKey = _KV.prefixKey(key);

        // Execute HSET command
        await state.client.hset(prefixedKey, field, stored);

        Lib.Debug.performanceAuditLog('End', 'KV setHashField', start_ms);

        // Return successful response
        return {
          success: true,
          error: null
        };

      } catch (error) {

        Lib.Debug.debug('KV setHashField failed', {
          type: ERRORS.KV_COMMAND_FAILED.type,
          message: error.message,
          stack: error.stack
        });

        // Return error response
        return {
          success: false,
          error: ERRORS.KV_COMMAND_FAILED
        };

      }

    },


    /********************************************************************
    Get a single field from a hash. Returns null for absent key or field.

    @param {Object} instance - Request instance
    @param {String} key - Hash key name (without prefix)
    @param {String} field - Field name within the hash (never prefixed)

    @return {Promise<Object>} - { success, value, error }
    *********************************************************************/
    getHashField: async function (instance, key, field) {

      // Ensure ioredis client is initialized
      await _KV.initIfNot();

      const start_ms = Lib.Utils.getUnixTimeInMilliSeconds();

      try {

        // Build the prefixed key (field is never prefixed)
        const prefixedKey = _KV.prefixKey(key);

        // Execute HGET command
        const raw = await state.client.hget(prefixedKey, field);

        Lib.Debug.performanceAuditLog('End', 'KV getHashField', start_ms);

        // Key or field absent - return null
        if (raw === null) {
          return {
            success: true,
            value: null,
            error: null
          };
        }

        // Deserialize value if JSON mode is enabled
        let value = raw;
        if (CONFIG.SERIALIZE_JSON) {
          try {
            value = JSON.parse(raw);
          } catch (parseError) {
            Lib.Debug.debug('KV getHashField deserialization failed', {
              type: ERRORS.KV_SERIALIZATION_FAILED.type,
              message: parseError.message
            });
            return {
              success: false,
              value: null,
              error: ERRORS.KV_SERIALIZATION_FAILED
            };
          }
        }

        // Return successful response with value
        return {
          success: true,
          value: value,
          error: null
        };

      } catch (error) {

        Lib.Debug.debug('KV getHashField failed', {
          type: ERRORS.KV_COMMAND_FAILED.type,
          message: error.message,
          stack: error.stack
        });

        // Return error response
        return {
          success: false,
          value: null,
          error: ERRORS.KV_COMMAND_FAILED
        };

      }

    },


    /********************************************************************
    Get all fields and values from a hash. Returns empty object for
    absent key.

    @param {Object} instance - Request instance
    @param {String} key - Hash key name (without prefix)

    @return {Promise<Object>} - { success, fields, error }
    *********************************************************************/
    getHashFields: async function (instance, key) {

      // Ensure ioredis client is initialized
      await _KV.initIfNot();

      const start_ms = Lib.Utils.getUnixTimeInMilliSeconds();

      try {

        // Build the prefixed key
        const prefixedKey = _KV.prefixKey(key);

        // Execute HGETALL command
        const rawFields = await state.client.hgetall(prefixedKey);

        Lib.Debug.performanceAuditLog('End', 'KV getHashFields', start_ms);

        // Key absent - return empty object
        if (!rawFields || Object.keys(rawFields).length === 0) {
          return {
            success: true,
            fields: {},
            error: null
          };
        }

        // Deserialize field values if JSON mode is enabled
        // If any one field fails to parse, the whole call fails
        const fields = {};
        if (CONFIG.SERIALIZE_JSON) {
          const fieldNames = Object.keys(rawFields);
          for (let i = 0; i < fieldNames.length; i++) {
            const fieldName = fieldNames[i];
            try {
              fields[fieldName] = JSON.parse(rawFields[fieldName]);
            } catch (parseError) {
              Lib.Debug.debug('KV getHashFields deserialization failed', {
                type: ERRORS.KV_SERIALIZATION_FAILED.type,
                message: parseError.message,
                field: fieldName
              });
              return {
                success: false,
                fields: null,
                error: ERRORS.KV_SERIALIZATION_FAILED
              };
            }
          }
        } else {
          Object.assign(fields, rawFields);
        }

        // Return successful response with fields
        return {
          success: true,
          fields: fields,
          error: null
        };

      } catch (error) {

        Lib.Debug.debug('KV getHashFields failed', {
          type: ERRORS.KV_COMMAND_FAILED.type,
          message: error.message,
          stack: error.stack
        });

        // Return error response
        return {
          success: false,
          fields: null,
          error: ERRORS.KV_COMMAND_FAILED
        };

      }

    },


    /********************************************************************
    Delete a single field from a hash. Returns deleted_count (0 if
    key or field was absent).

    @param {Object} instance - Request instance
    @param {String} key - Hash key name (without prefix)
    @param {String} field - Field name within the hash (never prefixed)

    @return {Promise<Object>} - { success, deleted_count, error }
    *********************************************************************/
    deleteHashField: async function (instance, key, field) {

      // Ensure ioredis client is initialized
      await _KV.initIfNot();

      const start_ms = Lib.Utils.getUnixTimeInMilliSeconds();

      try {

        // Build the prefixed key (field is never prefixed)
        const prefixedKey = _KV.prefixKey(key);

        // Execute HDEL command
        const deleted_count = await state.client.hdel(prefixedKey, field);

        Lib.Debug.performanceAuditLog('End', 'KV deleteHashField', start_ms);

        // Return successful response with count
        return {
          success: true,
          deleted_count: deleted_count,
          error: null
        };

      } catch (error) {

        Lib.Debug.debug('KV deleteHashField failed', {
          type: ERRORS.KV_COMMAND_FAILED.type,
          message: error.message,
          stack: error.stack
        });

        // Return error response
        return {
          success: false,
          deleted_count: null,
          error: ERRORS.KV_COMMAND_FAILED
        };

      }

    },


    // ~~~~~~~~~~~~~~~~~~~~ TTL ~~~~~~~~~~~~~~~~~~~~

    /********************************************************************
    Set an expiry on a key. Returns applied: true if the key exists and
    the expiry was set, applied: false if the key was absent.

    @param {Object} instance - Request instance
    @param {String} key - Key name (without prefix)
    @param {Number} ttl_seconds - TTL in seconds

    @return {Promise<Object>} - { success, applied, error }
    *********************************************************************/
    setExpire: async function (instance, key, ttl_seconds) {

      // Ensure ioredis client is initialized
      await _KV.initIfNot();

      const start_ms = Lib.Utils.getUnixTimeInMilliSeconds();

      try {

        // Build the prefixed key
        const prefixedKey = _KV.prefixKey(key);

        // Execute EXPIRE command (returns 1 if applied, 0 if key absent)
        const result = await state.client.expire(prefixedKey, ttl_seconds);

        Lib.Debug.performanceAuditLog('End', 'KV setExpire', start_ms);

        // Return successful response with applied flag
        return {
          success: true,
          applied: result === 1,
          error: null
        };

      } catch (error) {

        Lib.Debug.debug('KV setExpire failed', {
          type: ERRORS.KV_COMMAND_FAILED.type,
          message: error.message,
          stack: error.stack
        });

        // Return error response
        return {
          success: false,
          applied: false,
          error: ERRORS.KV_COMMAND_FAILED
        };

      }

    },


    /********************************************************************
    Get the TTL of a key in seconds. Returns null for keys with no
    expiry and for absent keys (engine sentinels -1 and -2 both map
    to null, never leaked to the caller).

    @param {Object} instance - Request instance
    @param {String} key - Key name (without prefix)

    @return {Promise<Object>} - { success, ttl_seconds, error }
    *********************************************************************/
    getTtl: async function (instance, key) {

      // Ensure ioredis client is initialized
      await _KV.initIfNot();

      const start_ms = Lib.Utils.getUnixTimeInMilliSeconds();

      try {

        // Build the prefixed key
        const prefixedKey = _KV.prefixKey(key);

        // Execute TTL command (returns seconds, -1 for no expiry, -2 for absent)
        const rawTtl = await state.client.ttl(prefixedKey);

        Lib.Debug.performanceAuditLog('End', 'KV getTtl', start_ms);

        // Map engine sentinels to null - never return -1 or -2
        let ttl_seconds = rawTtl;
        if (rawTtl === -1 || rawTtl === -2) {
          ttl_seconds = null;
        }

        // Return successful response with ttl_seconds
        return {
          success: true,
          ttl_seconds: ttl_seconds,
          error: null
        };

      } catch (error) {

        Lib.Debug.debug('KV getTtl failed', {
          type: ERRORS.KV_COMMAND_FAILED.type,
          message: error.message,
          stack: error.stack
        });

        // Return error response
        return {
          success: false,
          ttl_seconds: null,
          error: ERRORS.KV_COMMAND_FAILED
        };

      }

    },


    // ~~~~~~~~~~~~~~~~~~~~ Counter ~~~~~~~~~~~~~~~~~~~~

    /********************************************************************
    Increment a key by 1 (default) or by the given amount. Atomic on
    a single instance. An absent key is treated as 0 by the engine.

    @param {Object} instance - Request instance
    @param {String} key - Key name (without prefix)
    @param {Number} [by] - Amount to increment by (default 1)

    @return {Promise<Object>} - { success, value, error }
    *********************************************************************/
    increment: async function (instance, key, by) {

      // Ensure ioredis client is initialized
      await _KV.initIfNot();

      const start_ms = Lib.Utils.getUnixTimeInMilliSeconds();

      try {

        // Build the prefixed key
        const prefixedKey = _KV.prefixKey(key);

        // Execute INCR or INCRBY depending on the amount
        let value;
        if (by === undefined || by === 1) {
          value = await state.client.incr(prefixedKey);
        } else {
          value = await state.client.incrby(prefixedKey, by);
        }

        Lib.Debug.performanceAuditLog('End', 'KV increment', start_ms);

        // Return successful response with value
        return {
          success: true,
          value: value,
          error: null
        };

      } catch (error) {

        Lib.Debug.debug('KV increment failed', {
          type: ERRORS.KV_COMMAND_FAILED.type,
          message: error.message,
          stack: error.stack
        });

        // Return error response
        return {
          success: false,
          value: null,
          error: ERRORS.KV_COMMAND_FAILED
        };

      }

    }

  };///////////////////////////Public Functions END//////////////////////////////



  //////////////////////////Private Functions START/////////////////////////////
  const _KV = {

    /********************************************************************
    Lazy-load the ioredis driver and AWS SDK v3 signing libraries.
    Shared across every instance because the modules themselves are
    stateless - only the ioredis client holds per-instance state.

    @return {void}
    *********************************************************************/
    loadAdapter: function () {

      // Redis class - standard Valkey/Redis client (not AWS-specific)
      if (Lib.Utils.isNullOrUndefined(Redis)) {
        Redis = require('ioredis');
      }

      // AWS SDK v3 SigV4 signer - published by AWS (github.com/aws/aws-sdk-js-v3).
      // This is the same signing engine @aws-sdk/client-elasticache uses internally
      // to sign its own control-plane requests. We use it directly to presign
      // IAM auth tokens because AWS never shipped a higher-level ElastiCache
      // token generator (unlike RDS, which has @aws-sdk/rds-signer).
      if (Lib.Utils.isNullOrUndefined(SignatureV4)) {
        SignatureV4 = require('@smithy/signature-v4').SignatureV4;
      }

      // AWS SDK v3 SHA-256 hash - published by AWS (github.com/aws/aws-sdk-js-v3).
      // Required by SignatureV4 for SigV4 signing. This is the same hash
      // implementation the SDK uses internally across all @aws-sdk/client-* packages.
      if (Lib.Utils.isNullOrUndefined(Sha256)) {
        Sha256 = require('@aws-crypto/sha256-js').Sha256;
      }

    },


    /********************************************************************
    Generate a SigV4-signed IAM auth token for ElastiCache using the
    official AWS SDK v3 SignatureV4 presign method.

    The token is a presigned URL: hostname + path + signed query string.
    It is passed as the password to ioredis AUTH.

    @return {Promise<Object>} result
    @return {String} result.token - The signed token
    @return {Number} result.expiresAt - Epoch milliseconds when the token expires
    *********************************************************************/
    generateIamToken: async function () {

      // Token TTL (max 900 seconds per AWS)
      const tokenTtlSeconds = 900;

      // Build the SigV4 signer with explicit credentials
      const signer = new SignatureV4({
        credentials: {
          accessKeyId: CONFIG.KEY,
          secretAccessKey: CONFIG.SECRET
        },
        region: CONFIG.REGION,
        service: 'elasticache',
        sha256: Sha256
      });

      // Build the request to presign
      const query = {
        Action: 'connect',
        User: CONFIG.IAM_USER_ID,
        'X-Amz-Expires': String(tokenTtlSeconds)
      };

      // Add ResourceType for serverless caches
      if (CONFIG.SERVERLESS) {
        query.ResourceType = 'ServerlessCache';
      }

      const request = {
        method: 'GET',
        protocol: 'http:',
        hostname: CONFIG.CACHE_NAME,
        path: '/',
        query: query,
        headers: {
          host: CONFIG.CACHE_NAME
        }
      };

      // Presign the request
      const presigned = await signer.presign(request, { expiresIn: tokenTtlSeconds });

      // Build the token string: hostname + path + query string
      const queryStr = new URLSearchParams(presigned.query).toString();
      const token = presigned.hostname + presigned.path + '?' + queryStr;

      // Calculate expiry time (subtract the refresh margin)
      const now = Date.now();
      const expiresAt = now + (tokenTtlSeconds - CONFIG.TOKEN_REFRESH_MARGIN_SECONDS) * 1000;

      Lib.Debug.info('KV ElastiCache IAM token generated', {
        cacheName: CONFIG.CACHE_NAME,
        userId: CONFIG.IAM_USER_ID,
        region: CONFIG.REGION,
        expiresAt: new Date(expiresAt).toISOString()
      });

      return {
        token: token,
        expiresAt: expiresAt
      };

    },


    /********************************************************************
    Get a valid IAM auth token, refreshing if the cached one is near expiry.

    @return {Promise<Object>} result
    @return {String} result.token - A valid (non-expired) token
    @return {Number} result.expiresAt - When this token expires
    *********************************************************************/
    getIamToken: async function () {

      // Check if the cached token is still valid
      const now = Date.now();
      if (state.iamToken && now < state.iamTokenExpiresAt) {
        return {
          token: state.iamToken,
          expiresAt: state.iamTokenExpiresAt
        };
      }

      // Generate a fresh token
      const result = await _KV.generateIamToken();

      // Cache it
      state.iamToken = result.token;
      state.iamTokenExpiresAt = result.expiresAt;

      return result;

    },


    /********************************************************************
    Create this instance's ioredis client on first use. When IAM auth
    is configured, generates a SigV4 token and passes it as the password.
    When ENDPOINT is set (local testing), connects without IAM auth.

    @return {Promise<void>}
    *********************************************************************/
    initIfNot: async function () {

      // Already built
      if (!Lib.Utils.isNullOrUndefined(state.client)) {
        return;
      }

      // Adapters must be loaded before client creation
      _KV.loadAdapter();

      const start_ms = Lib.Utils.getUnixTimeInMilliSeconds();

      // Build ioredis client options
      const options = {
        host: CONFIG.HOST,
        port: CONFIG.PORT,
        db: CONFIG.DB,
        connectTimeout: CONFIG.CONNECT_TIMEOUT_MS,
        commandTimeout: CONFIG.COMMAND_TIMEOUT_MS,
        lazyConnect: true
      };

      // Add TLS if enabled (required for ElastiCache)
      if (CONFIG.TLS) {
        options.tls = CONFIG.TLS_CONFIG || {};
      }

      // If IAM auth is configured, generate a token and use it as password
      if (CONFIG.IAM_USER_ID && !CONFIG.ENDPOINT) {

        const tokenResult = await _KV.getIamToken();

        options.password = tokenResult.token;
        options.username = CONFIG.IAM_USER_ID;

        Lib.Debug.info('KV ElastiCache initializing with IAM auth', {
          host: CONFIG.HOST,
          port: CONFIG.PORT,
          iamUserId: CONFIG.IAM_USER_ID,
          cacheName: CONFIG.CACHE_NAME
        });

      } else {

        // Local testing mode (ENDPOINT set) or no IAM auth
        Lib.Debug.info('KV ElastiCache initializing (no IAM auth)', {
          host: CONFIG.HOST,
          port: CONFIG.PORT
        });

      }

      // Create the client
      state.client = new Redis(options);

      // Establish connection
      await state.client.connect();

      Lib.Debug.performanceAuditLog('End', 'KV Client', start_ms);

    },


    /********************************************************************
    Apply KEY_PREFIX to a key. Returns the prefixed key, or the
    key unchanged if no prefix is configured.

    @param {String} key - Key name without prefix

    @return {String} - Prefixed key
    *********************************************************************/
    prefixKey: function (key) {

      if (CONFIG.KEY_PREFIX) {
        return CONFIG.KEY_PREFIX + key;
      }

      return key;

    },


    /********************************************************************
    Strip KEY_PREFIX from a key. Returns the unprefixed key, or the
    key unchanged if no prefix is configured. Used on read paths
    including scan results.

    @param {String} prefixedKey - Key name with prefix

    @return {String} - Key without prefix
    *********************************************************************/
    stripPrefix: function (prefixedKey) {

      if (CONFIG.KEY_PREFIX && prefixedKey.startsWith(CONFIG.KEY_PREFIX)) {
        return prefixedKey.slice(CONFIG.KEY_PREFIX.length);
      }

      return prefixedKey;

    }


  };//////////////////////////Private Functions END/////////////////////////////



  // Return public interface
  return KV;

};/////////////////////////// createInterface END ///////////////////////////////
