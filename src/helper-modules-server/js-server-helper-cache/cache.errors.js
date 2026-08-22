// Info: Error catalog for helper-cache.
// Operational errors returned via {success: false, error}.
// Errors are frozen at module load time to prevent accidental mutation.
'use strict';

const Errors = {

  /******************************************************************
  Store unavailable - the underlying store returned an error or threw.
  This is a wrapper error; the original store error is logged via Debug.
  ******************************************************************/
  CACHE_STORE_UNAVAILABLE: Object.freeze({
    type: 'CACHE_STORE_UNAVAILABLE',
    message: 'Cache store operation failed'
  }),

  /******************************************************************
  Fetcher failed - the caller-provided fetcher function threw an
  error. Nothing is cached. The caller receives the failure envelope.
  ******************************************************************/
  CACHE_FETCHER_FAILED: Object.freeze({
    type: 'CACHE_FETCHER_FAILED',
    message: 'Cache fetcher function threw an error'
  }),

  /******************************************************************
  Lock wait timeout - getOrFetchCache waited for a lock holder to
  finish but the value never appeared within the configured wait
  window (GET_OR_FETCH_LOCK_WAIT_TIMEOUT_MS). The caller receives the
  failure envelope, same shape as a fetcher failure or store error.
  ******************************************************************/
  CACHE_LOCK_WAIT_TIMEOUT: Object.freeze({
    type: 'CACHE_LOCK_WAIT_TIMEOUT',
    message: 'Cache lock wait timed out'
  })

};

// Freeze the entire catalog to prevent accidental mutation
module.exports = Object.freeze(Errors);
