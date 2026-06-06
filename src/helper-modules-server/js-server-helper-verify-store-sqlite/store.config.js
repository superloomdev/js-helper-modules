// Info: Configuration defaults for js-server-helper-verify-store-sqlite.
// This adapter is a fully independent module that owns its own configuration.
// The caller passes configuration directly when instantiating the adapter.
'use strict';


module.exports = {

  // Table name for verification codes. Must be a valid SQLite identifier
  // without double quotes. The adapter quotes identifiers internally.
  table_name: 'verification_codes',

  // SQLite helper instance. Must be an object with write() and getRow()
  // methods matching the js-server-helper-nosql-sqlite interface.
  // Required. Validated at loader time.
  lib_sqlite: null

};
