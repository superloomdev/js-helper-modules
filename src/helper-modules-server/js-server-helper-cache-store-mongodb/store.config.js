// Info: Configuration defaults for helper-cache-store-mongodb.
// This adapter is a fully independent module that owns its own configuration.
// The caller passes configuration directly when instantiating the adapter.
//
// MongoDB uses a single-collection design with composite string _id =
// namespace + '\u001F' + cache_code. This gives O(1) getCache/setCache/deleteCache
// and O(K) deleteCacheByPrefix/clearCache/listCacheCodes via left-anchored
// regex on the _id index.
//
// TTL is handled via a MongoDB TTL index on the EXPIRY_FIELD attribute.
// The adapter writes a BSON Date to EXPIRY_FIELD when ttl_seconds is
// provided. MongoDB's background sweeper deletes expired documents
// within ~60 seconds. For immediate expiry correctness, the adapter
// also checks expiry on read and treats expired documents as misses.
//
// Lock keys use a separate _id prefix (LOCK_ID_PREFIX) within the same
// collection, so lock documents are distinct from cache entry documents.
export default {

  // MongoDB collection name. One collection per cache store instance.
  COLLECTION_NAME: null,

  // Field name for the cached value (stored as native BSON).
  VALUE_FIELD: 'cache_value',

  // Field name for the expiry timestamp (BSON Date).
  // A MongoDB TTL index should be created on this field:
  //   db.<collection>.createIndex({ expires_at: 1 }, { expireAfterSeconds: 0 })
  EXPIRY_FIELD: 'expires_at',

  // _id prefix for distributed lock documents. Lock documents use a
  // distinct prefix so they do not collide with cache entry documents.
  // The \u001F separator ensures the prefix cannot appear in any
  // human-readable identifier.
  LOCK_ID_PREFIX: '\u001Flock\u001F'

};
