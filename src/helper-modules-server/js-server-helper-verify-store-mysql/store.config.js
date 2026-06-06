// Info: Configuration defaults for js-server-helper-verify-store-mysql.
// This adapter is a fully independent module that owns its own configuration.
// The caller passes configuration directly when instantiating the adapter.
'use strict';


module.exports = {

  // Table name for verification codes. Must be a valid MySQL identifier
  // without backticks. The adapter quotes identifiers internally.
  table_name: 'verification_codes',

  // MySQL helper instance. Must be an object with write() and getRow()
  // methods matching the js-server-helper-nosql-mysql interface.
  // Required. Validated at loader time.
  lib_mysql: null

};
