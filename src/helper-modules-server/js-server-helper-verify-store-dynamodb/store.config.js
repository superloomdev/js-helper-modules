// Info: Configuration defaults for helper-verify-store-dynamodb.
// This adapter is a fully independent module that owns its own configuration.
// The caller passes configuration directly when instantiating the adapter.
'use strict';


module.exports = {

  // Table name for verification codes. Must be a valid DynamoDB table name.
  // The adapter does not quote or escape this.
  table_name: 'verification_codes'

};
