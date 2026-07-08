// Info: Frozen error catalog for helper-auth-store-postgres.
// Every error object is frozen so callers cannot mutate them.
'use strict';


module.exports = Object.freeze({

  SERVICE_UNAVAILABLE: Object.freeze({
    type: 'AUTH_STORE_POSTGRES_SERVICE_UNAVAILABLE',
    message: 'Postgres backend unavailable'
  })

});
