'use strict';

/**
 * Error catalog for helper-cache.
 * Operational errors returned via {success: false, error}.
 * Frozen to prevent accidental mutation.
 */

module.exports = Object.freeze({

  CACHE_STORE_UNAVAILABLE: Object.freeze({
    type: 'CACHE_STORE_UNAVAILABLE',
    message: 'Cache store operation failed'
  }),

  CACHE_FETCHER_FAILED: Object.freeze({
    type: 'CACHE_FETCHER_FAILED',
    message: 'Cache fetcher function threw an error'
  })

});
