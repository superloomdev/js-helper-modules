// Info: Configuration file for helper-contact-email-adapter-basic
'use strict';


module.exports = {

  // Email syntax regex for the basic adapter.
  // Validates: local@domain.tld
  // - Local part: letters, digits, dots, plus, hyphen, underscore
  // - Domain part: letters, digits, dots, hyphen
  // - TLD: at least 2 letters
  EMAIL_REGEX: /^[a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/

};
