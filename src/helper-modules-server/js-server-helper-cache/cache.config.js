// Info: Configuration defaults for helper-cache.
// The primary config key is Store, a required injection: the loader must be
// passed a ready-to-use store object from the chosen adapter. The cache
// module composes no backend key - it forwards namespace and cache_code
// to the store as separate parameters, so every separator and prefix
// concern belongs to the adapter that actually builds a backend key.
//
// Four GET_OR_FETCH_LOCK_* keys control distributed stampede protection
// in getOrFetch. When GET_OR_FETCH_LOCK_ENABLED is false (default),
// getOrFetch does plain fetch-and-cache with no lock. Per-backend adapter
// wiring is documented in docs/configuration.md.
'use strict';


module.exports = {

  // Ready-to-use store object from the chosen adapter package. Required.
  // Validated at construction. Per-backend wiring: docs/configuration.md.
  Store: null,

  // Opt-in distributed lock for getOrFetch. When false, getOrFetch does
  // plain fetch-and-cache with no stampede protection.
  GET_OR_FETCH_LOCK_ENABLED: false,

  // Lock auto-expires in the store after this many milliseconds. Handles
  // crashed Lambdas: the lock key has a TTL, so even if the process dies
  // mid-fetch, the lock clears itself.
  GET_OR_FETCH_LOCK_TIMEOUT_MS: 3000,

  // When waiting for a lock holder to finish, poll the cache at this
  // interval (milliseconds).
  GET_OR_FETCH_LOCK_RETRY_MS: 50,

  // Random 0-N milliseconds added to each retry interval to avoid
  // synchronized retry bursts across concurrent Lambdas.
  GET_OR_FETCH_LOCK_RETRY_JITTER_MS: 20

};
