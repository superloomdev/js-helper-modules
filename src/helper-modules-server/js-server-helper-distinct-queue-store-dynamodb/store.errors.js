// Info: Error catalog for helper-distinct-queue-store-dynamodb.
// Operational errors returned via { success: false, error }.
// Frozen to prevent accidental mutation.
export default Object.freeze({

  SERVICE_UNAVAILABLE: Object.freeze({
    type: 'DISTINCT_QUEUE_DYNAMODB_SERVICE_UNAVAILABLE',
    message: 'DynamoDB backend unavailable'
  })

});
