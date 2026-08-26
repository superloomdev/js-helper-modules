/**
 * Error catalog for js-server-helper-nosql-aws-dynamodb-admin.
 * Operational errors returned via {success: false, error}.
 * Frozen to prevent accidental mutation.
 */

export default Object.freeze({

  ADMIN_CONNECTION_FAILED: Object.freeze({
    type: 'ADMIN_CONNECTION_FAILED',
    message: 'Admin connection to DynamoDB failed'
  }),

  ADMIN_OPERATION_FAILED: Object.freeze({
    type: 'ADMIN_OPERATION_FAILED',
    message: 'Admin operation failed'
  }),

  ADMIN_TTL_CONFLICT: Object.freeze({
    type: 'ADMIN_TTL_CONFLICT',
    message: 'TTL is already enabled on a different attribute for this table'
  }),

  ADMIN_WAIT_TIMEOUT: Object.freeze({
    type: 'ADMIN_WAIT_TIMEOUT',
    message: 'Timed out waiting for table to reach ACTIVE state'
  })

});
