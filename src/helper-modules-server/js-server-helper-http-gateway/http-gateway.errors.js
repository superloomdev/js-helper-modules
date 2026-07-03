'use strict';

/**
 * Error catalog for helper-http-gateway.
 * Errors are returned via [err, result] tuples or thrown at construction time.
 * Frozen to prevent accidental mutation.
 */

module.exports = Object.freeze({

  INVALID_PARAM: Object.freeze({
    type: 'HTTP_GATEWAY_INVALID_PARAM',
    message: 'One or more required request parameters are missing or invalid'
  }),

  NOT_IMPLEMENTED: Object.freeze({
    type: 'NOT_IMPLEMENTED',
    message: 'This operation is not yet implemented for this adapter'
  })

});
