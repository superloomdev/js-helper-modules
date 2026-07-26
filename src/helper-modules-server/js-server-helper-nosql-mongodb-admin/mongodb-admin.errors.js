'use strict';

/**
 * Error catalog for js-server-helper-nosql-mongodb-admin.
 * Operational errors returned via {success: false, error}.
 * Frozen to prevent accidental mutation.
 */

module.exports = Object.freeze({

  ADMIN_CONNECTION_FAILED: Object.freeze({
    type: 'ADMIN_CONNECTION_FAILED',
    message: 'Admin connection to MongoDB failed'
  }),

  ADMIN_OPERATION_FAILED: Object.freeze({
    type: 'ADMIN_OPERATION_FAILED',
    message: 'Admin operation failed'
  }),

  ADMIN_TTL_CONFLICT: Object.freeze({
    type: 'ADMIN_TTL_CONFLICT',
    message: 'A TTL index already exists on a different field for this collection'
  })

});
