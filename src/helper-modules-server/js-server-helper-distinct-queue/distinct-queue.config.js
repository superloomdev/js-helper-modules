// Info: Configuration defaults for js-server-helper-distinct-queue.
// Only STORE and STORE_CONFIG are required. The core module has no other
// tunables. Adapters own all storage-specific configuration (key format,
// delimiter, table/collection name) internally via STORE_CONFIG.
'use strict';


module.exports = {

  // Store factory function. Pass the result of require() for the chosen
  // adapter package - the same way you pass Lib.Postgres / Lib.MongoDB.
  //   STORE: require('@superloomdev/js-server-helper-distinct-queue-store-dynamodb')
  //   STORE: require('@superloomdev/js-server-helper-distinct-queue-store-mongodb')
  // Required.
  STORE: null,

  // Per-store configuration. Shape varies by STORE - the chosen store's
  // factory validates its own required keys.
  //   dynamodb: { table_name: 'distinct_queue', lib_dynamodb: Lib.DynamoDB }
  //   mongodb:  { collection_name: 'distinct_queue', lib_mongodb: Lib.MongoDB }
  // Required.
  STORE_CONFIG: null

};
