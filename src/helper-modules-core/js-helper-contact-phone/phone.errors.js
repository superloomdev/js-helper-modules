// Info: Error catalog for helper-contact-phone.
// Validation errors returned via validateSyntax and other public functions.
// Key === type. Both use the full prefixed name.
// Frozen to prevent accidental mutation.
'use strict';

module.exports = Object.freeze({

  CONTACT_PHONE_UNKNOWN_COUNTRY: Object.freeze({
    type: 'CONTACT_PHONE_UNKNOWN_COUNTRY',
    message: 'Country code is not recognized'
  }),

  CONTACT_PHONE_NOT_A_NUMBER: Object.freeze({
    type: 'CONTACT_PHONE_NOT_A_NUMBER',
    message: 'Input does not contain a valid phone number'
  }),

  CONTACT_PHONE_TOO_SHORT: Object.freeze({
    type: 'CONTACT_PHONE_TOO_SHORT',
    message: 'Phone number is too short for this country'
  }),

  CONTACT_PHONE_TOO_LONG: Object.freeze({
    type: 'CONTACT_PHONE_TOO_LONG',
    message: 'Phone number is too long for this country'
  }),

  CONTACT_PHONE_INVALID_LENGTH: Object.freeze({
    type: 'CONTACT_PHONE_INVALID_LENGTH',
    message: 'Phone number length does not match any valid length for this country'
  }),

  CONTACT_PHONE_INVALID_PATTERN: Object.freeze({
    type: 'CONTACT_PHONE_INVALID_PATTERN',
    message: 'Phone number digits do not match the national number pattern'
  })

});
