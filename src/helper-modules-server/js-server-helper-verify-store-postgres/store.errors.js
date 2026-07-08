// Info: Error catalog for helper-verify-store-postgres.
// This adapter is a fully independent module that owns its own error catalog.
// Errors are frozen at module load time to prevent accidental mutation.
'use strict';

const Errors = {

  /******************************************************************
  Service unavailable - the underlying Postgres driver returned an error.
  This is a wrapper error; the original driver error is logged via Debug.
  ******************************************************************/
  SERVICE_UNAVAILABLE: Object.freeze({
    type: 'VERIFY_POSTGRES_SERVICE_UNAVAILABLE',
    message: 'Postgres service unavailable during verification operation'
  })

};

// Freeze the entire catalog to prevent accidental mutation
module.exports = Object.freeze(Errors);
