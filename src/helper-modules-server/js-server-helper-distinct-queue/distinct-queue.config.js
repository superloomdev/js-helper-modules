// Info: Configuration defaults for js-server-helper-distinct-queue.
// Only STORE is required. The core module has no storage-specific tunables;
// each adapter owns its own configuration internally.
'use strict';


module.exports = {

  // Store factory function - a pre-configured store adapter. Each adapter
  // owns its storage-specific configuration internally; this module forwards
  // only Lib and ERRORS to it. See the chosen adapter's README for setup.
  // Required.
  STORE: null

};
