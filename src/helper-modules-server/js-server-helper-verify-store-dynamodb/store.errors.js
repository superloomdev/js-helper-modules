// Info: Error catalog for helper-verify-store-dynamodb.
// This adapter is a fully independent module that owns its own error catalog.
// Errors are frozen at module load time to prevent accidental mutation.
'use strict';

const Errors = {

  /******************************************************************
  Service unavailable - the underlying DynamoDB driver returned an error.
  This is a wrapper error; the original driver error is logged via Debug.
  ******************************************************************/
  SERVICE_UNAVAILABLE: Object.freeze({
    type: 'VERIFY_DYNAMODB_SERVICE_UNAVAILABLE',
    message: 'DynamoDB service unavailable during verification operation'
  })

};

// Freeze the entire catalog to prevent accidental mutation
module.exports = Object.freeze(Errors);
