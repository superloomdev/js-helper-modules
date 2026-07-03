// Info: Configuration defaults for helper-http-gateway.
// Adapter is required at construction time as a ready-to-use object.
// The loader throws if Adapter is still null at startup.
'use strict';


module.exports = {

  // Ready-to-use adapter object from the chosen adapter package, constructed
  // with its config before being passed here. Validated at construction.
  // Required. The loader throws if it is still null at startup.
  Adapter: null

};
