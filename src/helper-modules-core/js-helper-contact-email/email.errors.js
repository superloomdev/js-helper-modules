// Info: Error catalog for helper-contact-email.
// Validation errors returned via validateSyntax and validateDisposable.
// Key === type. Both use the full prefixed name.
// Frozen to prevent accidental mutation.
'use strict';

module.exports = Object.freeze({

  CONTACT_EMAIL_EMPTY: Object.freeze({
    type: 'CONTACT_EMAIL_EMPTY',
    message: 'Email address is empty'
  }),

  CONTACT_EMAIL_NO_AT: Object.freeze({
    type: 'CONTACT_EMAIL_NO_AT',
    message: 'Email address must contain an @ symbol'
  }),

  CONTACT_EMAIL_MULTIPLE_AT: Object.freeze({
    type: 'CONTACT_EMAIL_MULTIPLE_AT',
    message: 'Email address must contain exactly one @ symbol'
  }),

  CONTACT_EMAIL_EMPTY_LOCAL: Object.freeze({
    type: 'CONTACT_EMAIL_EMPTY_LOCAL',
    message: 'The part before @ must not be empty'
  }),

  CONTACT_EMAIL_EMPTY_DOMAIN: Object.freeze({
    type: 'CONTACT_EMAIL_EMPTY_DOMAIN',
    message: 'The part after @ must not be empty'
  }),

  CONTACT_EMAIL_INVALID_SYNTAX: Object.freeze({
    type: 'CONTACT_EMAIL_INVALID_SYNTAX',
    message: 'Email address format is invalid'
  }),

  CONTACT_EMAIL_DISPOSABLE: Object.freeze({
    type: 'CONTACT_EMAIL_DISPOSABLE',
    message: 'Email domain is a known disposable email provider'
  })

});
