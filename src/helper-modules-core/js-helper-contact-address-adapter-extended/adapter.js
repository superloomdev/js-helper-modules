// Info: Extended address adapter for js-helper-contact-address.
// Postal code regex patterns and ISO 3166-2 subdivision lists.
// Zero runtime third-party dependencies (data is generated at build time).
//
// Adapter contract (5 methods):
//   listCountries() -> [String]
//   getPostalRule(country_code) -> { min_length, max_length, pattern, required } | null
//   listSubdivisions(country_code) -> [{ code, name }] | null
//   validatePostalCode(country_code, postal_code) -> { valid, reason }
//   validateSubdivision(country_code, subdivision_code) -> { valid, reason }
//
// Compatibility: Node.js 24+ and any modern browser.
'use strict';


// Generated address data (committed, no build step for consumers)
const ADDRESS_DATA = require('./_data/extended.address-data.js');


// Cache for compiled RegExp objects
const REGEX_CACHE = {};


/********************************************************************
Convert a pattern string like "/^(?:\\d{6})$/" to a RegExp object.
Caches compiled patterns for reuse.

@param {String} patternStr - Pattern string from generated data

@return {RegExp} - Compiled RegExp
*********************************************************************/
const compilePattern = function (patternStr) {

  // Check cache
  if (REGEX_CACHE[patternStr]) {
    return REGEX_CACHE[patternStr];
  }

  // Parse the pattern string: "/pattern/flags"
  const match = patternStr.match(/^\/(.+)\/([gimsuy]*)$/);

  let regex;

  if (match) {
    regex = new RegExp(match[1], match[2]);
  } else {
    // Fallback: treat as a raw pattern
    regex = new RegExp(patternStr);
  }

  // Cache for reuse
  REGEX_CACHE[patternStr] = regex;

  return regex;

};


/********************************************************************
Extract min and max digit length from a regex pattern string.
Used for getPostalRule's min_length/max_length fields.

@param {Array} patterns - Array of pattern strings

@return {Object} - { min_length, max_length }
*********************************************************************/
const extractLengthBounds = function (patterns) {

  let minLength = 999;
  let maxLength = 0;

  patterns.forEach(function (patternStr) {

    // Find all \d{N} or \d{N,M} occurrences
    const regex = /\\d\{(\d+)(?:,(\d+))?\}/g;
    let match;

    while ((match = regex.exec(patternStr)) !== null) {

      const min = parseInt(match[1], 10);
      const max = match[2] ? parseInt(match[2], 10) : min;

      if (min < minLength) {
        minLength = min;
      }

      if (max > maxLength) {
        maxLength = max;
      }

    }

  });

  if (minLength === 999) {
    minLength = 0;
  }

  return {
    min_length: minLength,
    max_length: maxLength
  };

};


/////////////////////////// Module-Loader START ////////////////////////////////
module.exports = function loader (shared_libs, config) {

  const Lib = {
    Utils: shared_libs.Utils
  };

  const CONFIG = Object.assign(
    {},
    require('./adapter.config'),
    config || {}
  );

  const ERRORS = require('./adapter.errors');
  const Validators = require('./adapter.validators')(Lib, ERRORS);
  Validators.validateConfig(CONFIG);

  return createInterface(Lib, CONFIG, ERRORS, Validators);

};///////////////////////////// Module-Loader END ///////////////////////////////



/////////////////////////// createInterface START //////////////////////////////
const createInterface = function (Lib, CONFIG, ERRORS, Validators) { // eslint-disable-line no-unused-vars

  /////////////////////////// Public Functions START //////////////////////////////
  const Adapter = {


    /********************************************************************
    List all country codes the adapter has data for.

    @return {Array} - Array of ISO 3166-1 alpha-2 country codes (lowercase)
    *********************************************************************/
    listCountries: function () {

      return Object.keys(ADDRESS_DATA);

    },


    /********************************************************************
    Get the postal code rule for a country.
    Returns null for unknown countries.

    @param {String} country_code - ISO 3166-1 alpha-2, lowercase

    @return {Object|null} - { min_length, max_length, pattern, required }
    *********************************************************************/
    getPostalRule: function (country_code) {

      const data = ADDRESS_DATA[country_code];

      if (!data) {
        return null;
      }

      // Extract length bounds from patterns
      const bounds = data.patterns.length > 0
        ? extractLengthBounds(data.patterns)
        : { min_length: 0, max_length: 0 };

      // Compile the first pattern for the rule
      const pattern = data.patterns.length > 0
        ? compilePattern(data.patterns[0])
        : null;

      return {
        min_length: bounds.min_length,
        max_length: bounds.max_length,
        pattern: pattern,
        required: data.required
      };

    },


    /********************************************************************
    List subdivisions for a country.
    Returns null if no subdivision data is available.

    @param {String} country_code - ISO 3166-1 alpha-2, lowercase

    @return {Array|null} - [{ code, name }] or null
    *********************************************************************/
    listSubdivisions: function (country_code) {

      const data = ADDRESS_DATA[country_code];

      if (!data) {
        return null;
      }

      return data.subdivisions;

    },


    /********************************************************************
    Validate a postal code for a country using regex patterns.
    Falls back to length bounds if no patterns are available.

    @param {String} country_code  - ISO 3166-1 alpha-2, lowercase
    @param {String} postal_code   - Postal code to validate

    @return {Object} - { valid: Boolean, reason: String|null }
    *********************************************************************/
    validatePostalCode: function (country_code, postal_code) {

      const data = ADDRESS_DATA[country_code];

      // Unknown country
      if (!data) {
        return {
          valid: false,
          reason: 'CONTACT_ADDRESS_INVALID_COUNTRY'
        };
      }

      // No postal system - accept anything
      if (!data.required) {
        return {
          valid: true,
          reason: null
        };
      }

      // No patterns - fall back to length bounds
      if (data.patterns.length === 0) {
        return {
          valid: true,
          reason: null
        };
      }

      // Try each pattern - any match is valid
      for (let i = 0; i < data.patterns.length; i++) {

        const regex = compilePattern(data.patterns[i]);

        if (regex.test(postal_code)) {
          return {
            valid: true,
            reason: null
          };
        }

      }

      // No pattern matched - determine if it's a length issue
      const bounds = extractLengthBounds(data.patterns);

      if (postal_code.length < bounds.min_length) {
        return {
          valid: false,
          reason: 'CONTACT_ADDRESS_TOO_SHORT'
        };
      }

      if (postal_code.length > bounds.max_length) {
        return {
          valid: false,
          reason: 'CONTACT_ADDRESS_TOO_LONG'
        };
      }

      // Length is within bounds but pattern doesn't match
      return {
        valid: false,
        reason: 'CONTACT_ADDRESS_INVALID_FORMAT'
      };

    },


    /********************************************************************
    Validate a subdivision code for a country.
    Checks against the subdivision list if available.
    Returns valid if no subdivision data is available (graceful fallback).

    @param {String} country_code       - ISO 3166-1 alpha-2, lowercase
    @param {String} subdivision_code   - Subdivision code to validate

    @return {Object} - { valid: Boolean, reason: String|null }
    *********************************************************************/
    validateSubdivision: function (country_code, subdivision_code) {

      const data = ADDRESS_DATA[country_code];

      // Unknown country
      if (!data) {
        return {
          valid: false,
          reason: 'CONTACT_ADDRESS_INVALID_COUNTRY'
        };
      }

      // No subdivision data - accept anything (graceful fallback)
      if (!data.subdivisions || data.subdivisions.length === 0) {
        return {
          valid: true,
          reason: null
        };
      }

      // Check if the subdivision code exists in the list
      const upperCode = subdivision_code.toUpperCase();

      const found = data.subdivisions.some(function (sub) {
        return sub.code.toUpperCase() === upperCode;
      });

      if (!found) {
        return {
          valid: false,
          reason: 'CONTACT_ADDRESS_INVALID_SUBDIVISION'
        };
      }

      return {
        valid: true,
        reason: null
      };

    }


  };///////////////////////////// Public Functions END //////////////////////////

  return Adapter;

};///////////////////////////// createInterface END //////////////////////////////
