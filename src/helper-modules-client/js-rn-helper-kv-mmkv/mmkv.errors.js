// Info: Error catalog for helper-kv-mmkv.
//
// Frozen on export. Injected into validators and createInterface.
'use strict';

module.exports = Object.freeze({

  INVALID_KEY: {
    type: 'helper-kv-mmkv/invalid-key',
    message: 'Key must be a non-empty string without the namespace separator ":"'
  },

  INVALID_VALUE: {
    type: 'helper-kv-mmkv/invalid-value',
    message: 'Value must not be undefined'
  },

  INVALID_KEYS: {
    type: 'helper-kv-mmkv/invalid-keys',
    message: 'Keys must be an array of valid key strings or a plain object of key-value pairs'
  },

  DESERIALIZE_FAILED: {
    type: 'helper-kv-mmkv/deserialize-failed',
    message: 'Stored value could not be parsed as JSON'
  },

  STORAGE_READ_FAILED: {
    type: 'helper-kv-mmkv/storage-read-failed',
    message: 'Storage engine read operation failed'
  },

  STORAGE_WRITE_FAILED: {
    type: 'helper-kv-mmkv/storage-write-failed',
    message: 'Storage engine write operation failed'
  },

  STORAGE_DELETE_FAILED: {
    type: 'helper-kv-mmkv/storage-delete-failed',
    message: 'Storage engine delete operation failed'
  },

  STORAGE_UNAVAILABLE: {
    type: 'helper-kv-mmkv/storage-unavailable',
    message: 'No storage engine available'
  }

});
