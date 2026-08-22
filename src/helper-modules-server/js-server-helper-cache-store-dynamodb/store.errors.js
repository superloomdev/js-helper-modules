// Info: Error catalog for helper-cache-store-dynamodb.
// This adapter is a fully independent module that owns its own error catalog.
// Errors are frozen at module load time to prevent accidental mutation.
'use strict';

const Errors = {

  /******************************************************************
  Service unavailable - the underlying DynamoDB driver returned an error.
  This is a wrapper error; the original driver error is logged via Debug.
  ******************************************************************/
  SERVICE_UNAVAILABLE: Object.freeze({
    type: 'CACHE_DYNAMODB_SERVICE_UNAVAILABLE',
    message: 'DynamoDB service unavailable during cache operation'
  }),

  /******************************************************************
  Serialization failure - the value could not be JSON-stringified
  (on setCache) or the stored string could not be JSON-parsed (on getCache).
  This adapter owns serialization; the cache module does not.
  ******************************************************************/
  SERIALIZATION_FAILED: Object.freeze({
    type: 'CACHE_DYNAMODB_SERIALIZATION_FAILED',
    message: 'Failed to serialize or deserialize cache value'
  })

};

// Freeze the entire catalog to prevent accidental mutation
module.exports = Object.freeze(Errors);
