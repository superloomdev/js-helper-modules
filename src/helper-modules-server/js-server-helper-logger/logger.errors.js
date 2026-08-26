/**
 * Error catalog for helper-logger.
 * Operational errors returned via {success: false, error}.
 * Frozen to prevent accidental mutation.
 */

export default Object.freeze({

  SERVICE_UNAVAILABLE: Object.freeze({
    type: 'LOGGER_SERVICE_UNAVAILABLE',
    message: 'Logger service temporarily unavailable'
  })

});
