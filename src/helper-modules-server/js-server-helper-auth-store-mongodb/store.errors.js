// Info: Frozen error catalog for helper-auth-store-mongodb.
// Every error object is frozen so callers cannot mutate them.
'use strict';


module.exports = Object.freeze({

  SERVICE_UNAVAILABLE: Object.freeze({
    type: 'AUTH_STORE_MONGODB_SERVICE_UNAVAILABLE',
    message: 'MongoDB backend unavailable'
  }),

  NOT_IMPLEMENTED: Object.freeze({
    type: 'AUTH_STORE_MONGODB_NOT_IMPLEMENTED',
    message: 'This operation is not yet implemented for this backend'
  })

});
