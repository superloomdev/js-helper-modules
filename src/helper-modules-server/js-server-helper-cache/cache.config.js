// Info: Configuration defaults for helper-cache.
// The only config key is Store, a required injection: the loader must be
// passed a ready-to-use store object from the chosen adapter. The cache
// module composes no backend key - it forwards namespace and cache_code
// to the store as separate parameters, so every separator and prefix
// concern belongs to the adapter that actually builds a backend key.
// Per-backend adapter wiring is documented in docs/configuration.md.
'use strict';


module.exports = {

  // Ready-to-use store object from the chosen adapter package. Required.
  // Validated at construction. Per-backend wiring: docs/configuration.md.
  Store: null

};
