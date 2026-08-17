// Info: Stub adapter for helper-contact-phone tests.
// Implements the 3-method adapter contract with a small known country set
// covering different length rules. This is a Stub test double: minimal
// stateless adapter contract implementation for testing the core.
'use strict';


// Known country data for the stub adapter
// Covers: different calling codes, different length bounds, different
// phone number lengths, and a country with no postal code (ae)
const COUNTRY_DATA = {
  'us': { calling_code: '1',  min_length: 10, max_length: 10 },
  'in': { calling_code: '91', min_length: 10, max_length: 10 },
  'gb': { calling_code: '44', min_length: 9,  max_length: 10 },
  'de': { calling_code: '49', min_length: 6,  max_length: 11 },
  'jp': { calling_code: '81', min_length: 9,  max_length: 9  },
  'ae': { calling_code: '971', min_length: 8, max_length: 9  },
  'ca': { calling_code: '1',  min_length: 10, max_length: 10 },
  'au': { calling_code: '61', min_length: 9,  max_length: 9  }
};


module.exports = function (Lib, config) { // eslint-disable-line no-unused-vars

  return {

    listCountries: function () {

      return Object.keys(COUNTRY_DATA);

    },


    getMetadata: function (country_code) {

      // Return metadata or null for unknown countries
      if (Object.prototype.hasOwnProperty.call(COUNTRY_DATA, country_code)) {
        return COUNTRY_DATA[country_code];
      }

      return null;

    },


    validateNumber: function (country_code, national_number) {

      // Check country exists
      if (!Object.prototype.hasOwnProperty.call(COUNTRY_DATA, country_code)) {
        return { valid: false, reason: 'UNKNOWN_COUNTRY' };
      }

      const meta = COUNTRY_DATA[country_code];

      // Check charset (digits only)
      if (!/^[0-9]+$/.test(national_number)) {
        return { valid: false, reason: 'CHARSET' };
      }

      // Check minimum length
      if (national_number.length < meta.min_length) {
        return { valid: false, reason: 'TOO_SHORT' };
      }

      // Check maximum length
      if (national_number.length > meta.max_length) {
        return { valid: false, reason: 'TOO_LONG' };
      }

      // All checks passed
      return { valid: true, reason: null };

    }

  };

};
