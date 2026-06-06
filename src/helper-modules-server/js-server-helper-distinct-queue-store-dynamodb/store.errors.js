// Info: Error catalog for js-server-helper-distinct-queue-store-dynamodb.
// Operational errors returned via { success: false, error }.
// Frozen to prevent accidental mutation.
'use strict';

module.exports = Object.freeze({

  SERVICE_UNAVAILABLE: Object.freeze({
    type: 'DISTINCT_QUEUE_DYNAMODB_SERVICE_UNAVAILABLE',
    message: 'DynamoDB backend unavailable'
  })

});
