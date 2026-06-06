// Info: Configuration defaults for js-server-helper-distinct-queue-store-dynamodb.
// The caller merges overrides over these defaults at loader time.
'use strict';


module.exports = {

  // DynamoDB table name for queue records. Required - no default.
  // The table is created idempotently by setupNewStore().
  table_name: null,

  // Sort key field separator. '\u001F' is the ASCII Unit Separator (US), a
  // non-printable control character that never appears in caller-supplied
  // resource_ids. Change only if you understand the migration implications.
  KEY_DELIMITER: '\u001F'

};
