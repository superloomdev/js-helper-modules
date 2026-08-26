// Info: Configuration defaults for helper-verify-store-dynamodb.
// This adapter is a fully independent module that owns its own configuration.
// The caller passes configuration directly when instantiating the adapter.
export default {

  // Table name for verification codes. Must be a valid DynamoDB table name.
  // The adapter does not quote or escape this.
  TABLE_NAME: 'verification_codes'

};
