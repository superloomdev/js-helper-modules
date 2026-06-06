// Info: Configuration defaults for js-server-helper-verify-store-dynamodb.
// This adapter is a fully independent module that owns its own configuration.
// The caller passes configuration directly when instantiating the adapter.
'use strict';


module.exports = {

  // Table name for verification codes. Must be a valid DynamoDB table name.
  // The adapter does not quote or escape this.
  table_name: 'verification_codes',

  // DynamoDB helper instance. Must be an object with getItem(),
  // putItem(), updateItem(), and deleteItem() methods matching the
  // js-server-helper-nosql-dynamodb interface.
  // Required. Validated at loader time.
  lib_dynamodb: null

};
