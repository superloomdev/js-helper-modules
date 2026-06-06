// Info: Configuration defaults for js-server-helper-distinct-queue-store-dynamodb.
//
// This module owns its configuration internally, like any standalone module.
// Callers pass configuration when requiring the adapter:
//
//   STORE: require('@superloomdev/...-store-dynamodb')({
//     table_name: 'queue_jobs',
//     lib_dynamodb: Lib.DynamoDB
//   })
//
// The adapter merges caller config over these defaults. Required keys
// (table_name, lib_dynamodb) have null defaults and must be provided.
//
// Changing KEY_DELIMITER is a breaking change: existing sort keys are written
// with the current delimiter, so a new value would make stored records
// unreadable. Treat this as a single source of truth, not a per-deploy knob.
'use strict';


module.exports = {

  // Required: DynamoDB table name for queue records.
  // Must be provided by the caller - no default.
  table_name: null,

  // Required: Reference to the js-server-helper-nosql-aws-dynamodb instance.
  // Must be provided by the caller - no default.
  lib_dynamodb: null,

  // Sort key field separator. '\u001F' is the ASCII Unit Separator (US), a
  // non-printable control character that never appears in caller-supplied
  // resource_ids. Using it eliminates the delimiter-collision risk a printable
  // separator (e.g. '#') would carry when a resource_id legitimately contains
  // that character. The sort key layout is:
  //   resource_id + KEY_DELIMITER + data_version + KEY_DELIMITER + request_id
  KEY_DELIMITER: '\u001F'

};
