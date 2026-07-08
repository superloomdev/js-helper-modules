// Info: Configuration defaults for helper-verify-store-mysql.
// This adapter is a fully independent module that owns its own configuration.
// The caller passes configuration directly when instantiating the adapter.
'use strict';


module.exports = {

  // Table name for verification codes. Must be a valid MySQL identifier
  // without backticks. The adapter quotes identifiers internally.
  table_name: 'verification_codes'

};
