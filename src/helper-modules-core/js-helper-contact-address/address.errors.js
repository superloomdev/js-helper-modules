// Info: Error catalog for helper-contact-address.
// Key === type. Both use the full prefixed name.
// Frozen to prevent accidental mutation.
'use strict';

module.exports = Object.freeze({

  CONTACT_ADDRESS_EMPTY: Object.freeze({
    type: 'CONTACT_ADDRESS_EMPTY',
    message: 'Required field is empty'
  }),

  CONTACT_ADDRESS_TOO_SHORT: Object.freeze({
    type: 'CONTACT_ADDRESS_TOO_SHORT',
    message: 'Field value is too short'
  }),

  CONTACT_ADDRESS_TOO_LONG: Object.freeze({
    type: 'CONTACT_ADDRESS_TOO_LONG',
    message: 'Field value is too long'
  }),

  CONTACT_ADDRESS_INVALID_FORMAT: Object.freeze({
    type: 'CONTACT_ADDRESS_INVALID_FORMAT',
    message: 'Field value does not match the expected format'
  }),

  CONTACT_ADDRESS_INVALID_COUNTRY: Object.freeze({
    type: 'CONTACT_ADDRESS_INVALID_COUNTRY',
    message: 'Country code is not recognized'
  }),

  CONTACT_ADDRESS_INVALID_SUBDIVISION: Object.freeze({
    type: 'CONTACT_ADDRESS_INVALID_SUBDIVISION',
    message: 'Subdivision code is not valid for this country'
  }),

  CONTACT_ADDRESS_NO_POSTAL_SYSTEM: Object.freeze({
    type: 'CONTACT_ADDRESS_NO_POSTAL_SYSTEM',
    message: 'This country does not use postal codes'
  }),

  CONTACT_ADDRESS_INVALID_TAG: Object.freeze({
    type: 'CONTACT_ADDRESS_INVALID_TAG',
    message: 'Tag must be one of: home, work, other'
  }),

  CONTACT_ADDRESS_INVALID_COORDINATES: Object.freeze({
    type: 'CONTACT_ADDRESS_INVALID_COORDINATES',
    message: 'Coordinates must be { latitude, longitude } in decimal degrees'
  })

});
