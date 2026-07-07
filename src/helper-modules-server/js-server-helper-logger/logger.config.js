// Info: Configuration defaults for helper-logger.
// Most fields are required at construction time and validated by the loader.
// Keys with a default of `null` mean "must be supplied by the project" -
// the loader throws if they are still null.
'use strict';


module.exports = {

  // Ready-to-use store object from the chosen adapter package, constructed
  // with its own config before being passed here. Validated at construction.
  // Required. Per-backend wiring: docs/configuration.md.
  Store: null,

  // Optional symmetric key for IP-address encryption at rest. When set,
  // `log()` runs each IP through `Lib.Crypto.aesEncrypt(ip, key)` before
  // storage and `listBy*` decrypts on the way out. Leave `null` to store
  // plaintext IPs (some deployments do fraud detection or geo-IP lookups
  // and need the raw value).
  IP_ENCRYPT_KEY: null

};
