// Info: Configuration defaults for js-server-helper-distinct-queue.
// Only Store is required. The core module has no storage-specific tunables;
// each adapter owns its own configuration, Lib, and ERRORS internally.
'use strict';


module.exports = {

  // Ready-to-use store object from a pre-configured adapter. Each adapter
  // is a fully independent module with its own Lib, Config, and ERRORS.
  // This module uses the store object directly through the contract interface.
  // See the chosen adapter's README for setup.
  // Required.
  Store: null

};
