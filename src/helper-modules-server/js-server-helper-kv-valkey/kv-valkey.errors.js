/**
 * Error catalog for js-server-helper-kv-valkey.
 * Operational errors returned via {success: false, error}.
 * Frozen to prevent accidental mutation.
 */

export default Object.freeze({

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
  })

});
