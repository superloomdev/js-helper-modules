// Info: Configuration defaults for helper-verify.
// All fields are optional except Store, a required injection: the loader must
// be passed a ready-to-use store object from the chosen adapter. Charsets can
// be overridden by the project; the defaults are picked for human typing and
// URL safety. Per-backend adapter wiring is documented in docs/configuration.md.
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

  // Ready-to-use store object from the chosen adapter package. Required.
  // Validated at construction. Per-backend wiring: docs/configuration.md.
  Store: null

};
