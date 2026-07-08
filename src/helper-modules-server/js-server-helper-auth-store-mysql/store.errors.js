// Info: Frozen error catalog for helper-auth-store-mysql.
// Every error object is frozen so callers cannot mutate them.
'use strict';


module.exports = Object.freeze({

  SERVICE_UNAVAILABLE: Object.freeze({
    type: 'AUTH_STORE_MYSQL_SERVICE_UNAVAILABLE',
    message: 'MySQL backend unavailable'
  })

});
