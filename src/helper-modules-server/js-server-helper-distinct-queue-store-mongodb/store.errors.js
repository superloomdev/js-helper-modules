// Info: Error catalog for js-server-helper-distinct-queue-store-mongodb.
// Operational errors returned via { success: false, error }.
// Frozen to prevent accidental mutation.
'use strict';

module.exports = Object.freeze({

  SERVICE_UNAVAILABLE: Object.freeze({
    type: 'DISTINCT_QUEUE_MONGODB_SERVICE_UNAVAILABLE',
    message: 'MongoDB backend unavailable'
  })

});
