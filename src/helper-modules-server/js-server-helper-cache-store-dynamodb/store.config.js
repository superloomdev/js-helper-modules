// Info: Configuration defaults for helper-cache-store-dynamodb.
// This adapter is a fully independent module that owns its own configuration.
// The caller passes configuration directly when instantiating the adapter.
//
// DynamoDB uses a single-table design with partition key = namespace and
// sort key = cache_code. This gives O(1) get/set/delete and O(N) clear/list
// scoped to one partition (not the entire table).
//
// TTL is handled via DynamoDB native TTL on the EXPIRY_FIELD attribute.
// The adapter writes a Unix epoch timestamp (seconds) to EXPIRY_FIELD when
// ttl_seconds is provided. DynamoDB's background sweeper deletes expired
// items within ~48 hours. For immediate expiry correctness, the adapter
// also checks expiry on read and treats expired items as misses.
//
// Lock keys use a separate sort-key prefix (LOCK_SORT_KEY_PREFIX) within
// the same table and partition, so lock items are distinct from cache
// entry items.
'use strict';


module.exports = {

  // DynamoDB table name. One table per cache store instance.
  TABLE_NAME: null,

  // Partition key attribute name in the DynamoDB table.
  PARTITION_KEY: 'namespace',

  // Sort key attribute name in the DynamoDB table.
  SORT_KEY: 'cache_code',

  // Attribute name for the cached value (stored as a JSON string).
  VALUE_FIELD: 'cache_value',

  // Attribute name for the expiry timestamp (Unix epoch seconds).
  // DynamoDB native TTL should be enabled on this attribute.
  EXPIRY_FIELD: 'expiry_ttl',

  // Sort-key prefix for distributed lock items. Lock items share the
  // same partition key (namespace) as cache entries but use a distinct
  // sort-key prefix so they do not collide with cache_code values.
  LOCK_SORT_KEY_PREFIX: '\u001Flock\u001F'

};
