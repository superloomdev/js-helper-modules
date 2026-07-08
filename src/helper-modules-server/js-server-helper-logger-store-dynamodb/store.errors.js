// Info: Frozen error catalog for helper-logger-store-dynamodb.
// Every error object is frozen so callers cannot mutate them.
'use strict';


module.exports = Object.freeze({

  SERVICE_UNAVAILABLE: Object.freeze({
    type: 'LOGGER_STORE_SERVICE_UNAVAILABLE',
    message: 'Logger store service temporarily unavailable'
  })

});
