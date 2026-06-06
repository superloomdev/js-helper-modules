// Info: Internal constants for js-server-helper-distinct-queue-store-dynamodb.
// These are storage-format constants owned by the adapter, not user-tunable
// configuration. The core module forwards STORE_CONFIG (table_name,
// lib_dynamodb); everything in this file is fixed by the key design.
//
// Changing KEY_DELIMITER is a breaking change: existing sort keys are written
// with the current delimiter, so a new value would make stored records
// unreadable. Treat this as a single source of truth, not a per-deploy knob.
'use strict';


module.exports = {

  // Sort key field separator. '\u001F' is the ASCII Unit Separator (US), a
  // non-printable control character that never appears in caller-supplied
  // resource_ids. Using it eliminates the delimiter-collision risk a printable
  // separator (e.g. '#') would carry when a resource_id legitimately contains
  // that character. The sort key layout is:
  //   resource_id + KEY_DELIMITER + data_version + KEY_DELIMITER + request_id
  KEY_DELIMITER: '\u001F'

};
