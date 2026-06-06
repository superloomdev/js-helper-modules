// Info: Error catalog for js-server-helper-distinct-queue.
// Operational errors returned via { success: false, error }.
// Frozen to prevent accidental mutation.
'use strict';

module.exports = Object.freeze({

  SERVICE_UNAVAILABLE: Object.freeze({
    type: 'DISTINCT_QUEUE_SERVICE_UNAVAILABLE',
    message: 'Distinct queue service temporarily unavailable'
  })

});
