// Info: Configuration defaults for helper-verify-store-mongodb.
// This adapter is a fully independent module that owns its own configuration.
// The caller passes configuration directly when instantiating the adapter.
'use strict';


module.exports = {

  // Collection name for verification codes. Must be a valid MongoDB
  // collection name. The adapter does not quote or escape this.
  collection_name: 'verification_codes'

};
