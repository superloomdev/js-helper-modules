// Info: Configuration defaults for helper-cache-store-valkey.
// This adapter is a fully independent module that owns its own configuration.
// The caller passes configuration directly when instantiating the adapter.
// Both KEY_PREFIX and KEY_SEPARATOR live here, not on the cache module,
// because this adapter is what flattens namespace and cache_code into one
// Valkey key string. The cache module composes no backend key.
'use strict';


module.exports = {

  // Prefix prepended to every composed Valkey key. Keeps cache entries
  // isolated from non-cache keys in the same Valkey instance.
  KEY_PREFIX: 'cache:',

  // Separator between namespace and cache_code in the composed key.
  // The adapter strips a known-length prefix (it does not split on this
  // character), so a cache_code containing the separator round-trips
  // correctly.
  KEY_SEPARATOR: ':'

};
