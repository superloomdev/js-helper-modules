// Info: Configuration defaults for js-server-helper-verify.
// All fields are optional except Store. Charsets can be overridden by the
// project, but the defaults are picked for human typing and URL safety.
'use strict';


module.exports = {

  // Numeric charset for short PINs / OTPs (10 chars)
  // Smallest entropy per char, easiest to type on a phone keypad.
  PIN_CHARSET: '0123456789',

  // Alphanumeric uppercase charset for medium-length codes (32 chars).
  // Crockford Base32: digits + uppercase letters minus I, L, O, U.
  // Avoids common typo confusions when read off a screen or printed.
  CODE_CHARSET: '0123456789ABCDEFGHJKMNPQRSTVWXYZ',

  // URL-safe alphanumeric charset for magic-link tokens (62 chars).
  // Highest entropy per char, safe to drop into query strings without escaping.
  TOKEN_CHARSET: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',

  // Ready-to-use store object. Configure and instantiate the chosen adapter
  // package, then pass the resulting store object directly.
  //   const Store = require('@superloomdev/js-server-helper-verify-store-sqlite')({
  //     table_name: 'verification_codes',
  //     lib_sqlite: Lib.SQLite
  //   });
  //   const Store = require('@superloomdev/js-server-helper-verify-store-postgres')({
  //     table_name: 'verification_codes',
  //     lib_postgresql: Lib.PostgreSQL
  //   });
  //   const Store = require('@superloomdev/js-server-helper-verify-store-mysql')({
  //     table_name: 'verification_codes',
  //     lib_mysql: Lib.MySQL
  //   });
  //   const Store = require('@superloomdev/js-server-helper-verify-store-mongodb')({
  //     collection_name: 'verification_codes',
  //     lib_mongodb: Lib.MongoDB
  //   });
  //   const Store = require('@superloomdev/js-server-helper-verify-store-dynamodb')({
  //     table_name: 'verification_codes',
  //     lib_dynamodb: Lib.DynamoDB
  //   });
  // Required. Validated at loader time.
  Store: null

};
