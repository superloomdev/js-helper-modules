// Info: Test loader for helper-contact-phone.
// Builds a Lib container with Utils and a stub adapter that implements
// the 4-method contract with known test data.
'use strict';


// Stub adapter with known test data for 5 countries.
// This is NOT a real adapter - it provides deterministic data for testing.
const STUB_COUNTRIES = ['us', 'in', 'gb', 'de', 'jp'];

const STUB_METADATA = {
  us: { calling_code: '1',  min_length: 10, max_length: 10 },
  in: { calling_code: '91', min_length: 10, max_length: 10 },
  gb: { calling_code: '44', min_length: 9,  max_length: 10 },
  de: { calling_code: '49', min_length: 6,  max_length: 11 },
  jp: { calling_code: '81', min_length: 9,  max_length: 10 }
};


// Build the stub adapter
const stubAdapter = {
  listCountries: function () {
    return STUB_COUNTRIES.slice();
  },
  getMetadata: function (country_code) {
    return STUB_METADATA[country_code] || null;
  },
  validateSyntax: function (country_code, national_number) {
    const meta = STUB_METADATA[country_code];
    if (!meta) {
      return { valid: false, reason: 'CONTACT_PHONE_UNKNOWN_COUNTRY' };
    }
    if (!/^\d+$/.test(national_number)) {
      return { valid: false, reason: 'CONTACT_PHONE_NOT_A_NUMBER' };
    }
    if (national_number.length < meta.min_length) {
      return { valid: false, reason: 'CONTACT_PHONE_TOO_SHORT' };
    }
    if (national_number.length > meta.max_length) {
      return { valid: false, reason: 'CONTACT_PHONE_TOO_LONG' };
    }
    return { valid: true, reason: null };
  },
  getNumberType: function (country_code, national_number) { // eslint-disable-line no-unused-vars
    return null;
  }
};


// Build Lib container
const Lib = {};
Lib.Utils = require('helper-utils')(Lib, {});


// Load the module under test
const ContactPhone = require('helper-contact-phone')(Lib, {
  Adapter: stubAdapter
});


module.exports = {
  ContactPhone: ContactPhone,
  Lib: Lib,
  stubAdapter: stubAdapter,
  STUB_COUNTRIES: STUB_COUNTRIES,
  STUB_METADATA: STUB_METADATA
};
