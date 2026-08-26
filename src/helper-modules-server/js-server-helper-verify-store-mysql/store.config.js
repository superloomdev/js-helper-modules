// Info: Configuration defaults for helper-verify-store-mysql.
// This adapter is a fully independent module that owns its own configuration.
// The caller passes configuration directly when instantiating the adapter.
export default {

  // Table name for verification codes. Must be a valid MySQL identifier
  // without backticks. The adapter quotes identifiers internally.
  TABLE_NAME: 'verification_codes'

};
