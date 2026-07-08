// Info: Configuration defaults for helper-logger-store-sqlite.
// This adapter is a fully independent module that owns its own configuration.
// The caller passes configuration directly when instantiating the adapter.
'use strict';


module.exports = {

  // Table name for log records. Must be a valid SQLite identifier.
  // The adapter double-quotes all identifiers; table names must not contain
  // a double-quote character.
  table_name: 'action_log'

};
