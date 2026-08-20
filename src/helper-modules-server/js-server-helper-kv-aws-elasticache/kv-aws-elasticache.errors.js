'use strict';

/**
 * Error catalog for js-server-helper-kv-aws-elasticache.
 * Operational errors returned via {success: false, error}.
 * Frozen to prevent accidental mutation.
 */

module.exports = Object.freeze({

  KV_CONNECTION_FAILED: Object.freeze({
    type: 'KV_CONNECTION_FAILED',
    message: 'Key-value store connection failed'
  }),

  KV_COMMAND_FAILED: Object.freeze({
    type: 'KV_COMMAND_FAILED',
    message: 'Key-value store command failed'
  }),

  KV_TIMEOUT: Object.freeze({
    type: 'KV_TIMEOUT',
    message: 'Key-value store operation timed out'
  }),

  KV_SERIALIZATION_FAILED: Object.freeze({
    type: 'KV_SERIALIZATION_FAILED',
    message: 'Key-value store serialization or deserialization failed'
  }),

  KV_ELASTICACHE_IAM_TOKEN_FAILED: Object.freeze({
    type: 'KV_ELASTICACHE_IAM_TOKEN_FAILED',
    message: 'ElastiCache IAM token generation failed'
  }),

  KV_ELASTICACHE_IAM_TOKEN_EXPIRED: Object.freeze({
    type: 'KV_ELASTICACHE_IAM_TOKEN_EXPIRED',
    message: 'ElastiCache IAM token expired and refresh failed'
  })

});
