// Info: Configuration defaults for js-server-helper-logger.
// Most fields are required at construction time and validated by the loader.
// Keys with a default of `null` mean "must be supplied by the project" -
// the loader throws if they are still null.
'use strict';


module.exports = {

  // Ready-to-use store object. Construct the chosen adapter first, then pass
  // the result here.
  //   Store: require('@superloomdev/js-server-helper-logger-store-sqlite')({ table_name, lib_sql })
  //   Store: require('@superloomdev/js-server-helper-logger-store-postgres')({ table_name, lib_sql })
  //   Store: require('@superloomdev/js-server-helper-logger-store-mysql')({ table_name, lib_sql })
  //   Store: require('@superloomdev/js-server-helper-logger-store-mongodb')({ collection_name, lib_mongodb })
  //   Store: require('@superloomdev/js-server-helper-logger-store-dynamodb')({ table_name, lib_dynamodb })
  // Required.
  Store: null,

  // Optional symmetric key for IP-address encryption at rest. When set,
  // `log()` runs each IP through `Lib.Crypto.aesEncrypt(ip, key)` before
  // storage and `listBy*` decrypts on the way out. Leave `null` to store
  // plaintext IPs (some deployments do fraud detection or geo-IP lookups
  // and need the raw value).
  IP_ENCRYPT_KEY: null

};
