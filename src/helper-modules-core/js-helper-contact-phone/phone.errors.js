'use strict';

/**
 * Error catalog for helper-contact-phone.
 * Errors are returned via { success, error } envelopes.
 * Frozen to prevent accidental mutation.
 */

module.exports = Object.freeze({

  UNKNOWN_COUNTRY: Object.freeze({
    type: 'CONTACT_PHONE_UNKNOWN_COUNTRY',
    message: 'The country code is not in the adapter known list'
  }),

  INVALID_NUMBER: Object.freeze({
    type: 'CONTACT_PHONE_INVALID_NUMBER',
    message: 'The phone number failed validation'
  }),

  LOOKUP_FAILED: Object.freeze({
    type: 'CONTACT_PHONE_LOOKUP_FAILED',
    message: 'The country metadata lookup failed'
  })

});
