// Info: Configuration defaults for helper-cache-store-aws-elasticache.
// This adapter is a fully independent module that owns its own configuration.
// The caller passes configuration directly when instantiating the adapter.
// Both KEY_PREFIX and KEY_SEPARATOR live here, not on the cache module,
// because this adapter is what flattens namespace and cache_code into one
// Valkey key string. The cache module composes no backend key.
export default {

  // Prefix prepended to every composed Valkey key. Keeps cache entries
  // isolated from non-cache keys in the same Valkey instance.
  KEY_PREFIX: 'cache:',

  // Separator between namespace and cache_code in the composed key.
  // The adapter strips a known-length prefix (it does not split on this
  // character), so a cache_code containing the separator round-trips
  // correctly.
  KEY_SEPARATOR: ':',

  // Prefix for distributed lock keys. Locks are stored as separate keys
  // from the cache entries so that deleting a cache entry never releases
  // a lock, and a lock's TTL is independent of the cached value's TTL.
  // The composed lock key is: LOCK_KEY_PREFIX + namespace + KEY_SEPARATOR + cache_code
  LOCK_KEY_PREFIX: 'cache:lock:'

};
