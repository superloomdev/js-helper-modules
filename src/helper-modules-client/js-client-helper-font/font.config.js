// Info: Default configuration for helper-font.
//
// All keys can be overridden by passing a config object to the loader.
'use strict';

module.exports = {

  // The fallback family used when resolveFamily cannot find a token.
  // 'System' is always available on every platform.
  DEFAULT_FAMILY: 'System',

  // Role-to-family mapping. Seeds resolveFamily with theme role tokens
  // (e.g. 'primary' -> 'Poppins_400Regular'). Can be overridden at
  // construction time or extended at runtime via registerRoles().
  roles: {}

};
