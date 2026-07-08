// Info: Error catalog for helper-verify-store-mysql.
// This adapter is a fully independent module that owns its own error catalog.
// Errors are frozen at module load time to prevent accidental mutation.
'use strict';

const Errors = {

  /******************************************************************
  Service unavailable - the underlying MySQL driver returned an error.
  This is a wrapper error; the original driver error is logged via Debug.
  ******************************************************************/
  SERVICE_UNAVAILABLE: Object.freeze({
    type: 'VERIFY_MYSQL_SERVICE_UNAVAILABLE',
    message: 'MySQL service unavailable during verification operation'
  })

};

// Freeze the entire catalog to prevent accidental mutation
module.exports = Object.freeze(Errors);
