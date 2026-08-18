// Info: Test loader for helper-contact-address.
'use strict';


const STUB_COUNTRIES = ['us', 'in', 'gb', 'de', 'jp', 'ae'];


const stubAdapter = {
  listCountries: function () {
    return STUB_COUNTRIES.slice();
  },
  getPostalRule: function (country_code) {
    const rules = {
      us: { min_length: 5, max_length: 10, pattern: null, required: true },
      in: { min_length: 6, max_length: 6, pattern: null, required: true },
      gb: { min_length: 6, max_length: 8, pattern: null, required: true },
      de: { min_length: 5, max_length: 5, pattern: null, required: true },
      jp: { min_length: 7, max_length: 7, pattern: null, required: true },
      ae: { min_length: 0, max_length: 0, pattern: null, required: false }
    };
    return rules[country_code] || null;
  },
  listSubdivisions: function (country_code) { // eslint-disable-line no-unused-vars
    return null;
  },
  validatePostalCode: function (country_code, postal_code) {
    const rule = this.getPostalRule(country_code);
    if (!rule) {
      return { valid: false, reason: 'CONTACT_ADDRESS_INVALID_COUNTRY' };
    }
    if (!rule.required) {
      return { valid: true, reason: null };
    }
    if (postal_code.length < rule.min_length) {
      return { valid: false, reason: 'CONTACT_ADDRESS_TOO_SHORT' };
    }
    if (postal_code.length > rule.max_length) {
      return { valid: false, reason: 'CONTACT_ADDRESS_TOO_LONG' };
    }
    return { valid: true, reason: null };
  },
  validateSubdivision: function (country_code, subdivision_code) { // eslint-disable-line no-unused-vars
    return { valid: true, reason: null };
  }
};


const Lib = {};
Lib.Utils = require('helper-utils')(Lib, {});

const ContactAddress = require('helper-contact-address')(Lib, {
  Adapter: stubAdapter
});


module.exports = {
  ContactAddress: ContactAddress,
  Lib: Lib,
  stubAdapter: stubAdapter,
  STUB_COUNTRIES: STUB_COUNTRIES
};
