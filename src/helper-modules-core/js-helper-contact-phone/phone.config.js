// Info: Configuration file for helper-contact-phone
'use strict';


module.exports = {

  // Phone ID separator between country code and reversed national number.
  // A dot is safe because auth reserves '-' and '#' and forbids both in
  // user-supplied identifiers. Phone IDs contain only digits, a dot, and
  // a two-letter country code.
  PHONE_ID_SEPARATOR: '.',

  // Characters allowed in a sanitized phone number (digits, +, -, spaces, parentheses)
  PHONE_SANITIZE_REGEX: /[^0-9+\-\s()]/g,

  // Characters allowed in a sanitized national number (digits only)
  NATIONAL_SANITIZE_REGEX: /[^0-9]/g,

  // Maximum length for a full E.164 number (country code + national number)
  E164_MAX_LENGTH: 15,

  // Minimum length for a national number
  NATIONAL_MIN_LENGTH: 3,

  // Maximum length for a national number
  NATIONAL_MAX_LENGTH: 14

};
