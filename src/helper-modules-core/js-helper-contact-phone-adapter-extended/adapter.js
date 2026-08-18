// Info: Extended phone adapter for js-helper-contact-phone.
// Wraps libphonenumber-js with max metadata for full validation depth:
// digit pattern validation and number type classification.
//
// Runtime dependency: libphonenumber-js (~145 KB max metadata).
// Choose this adapter on servers where validation depth matters more
// than bundle size. For browser builds, use adapter-basic instead.
//
// Standard factory shape: receives shared_libs, owns its own CONFIG, ERRORS,
// and Validators. Returns a ready-to-use adapter object that the parent
// consumes via CONFIG.Adapter.
//
// Adapter contract (4 methods):
//   listCountries() -> [String]
//   getMetadata(country_code) -> { calling_code, min_length, max_length } | null
//   validateSyntax(country_code, national_number) -> { valid, reason }
//   getNumberType(country_code, national_number) -> String | null
//
// Compatibility: Node.js 24+ and any modern browser.
'use strict';


// Load libphonenumber-js with max metadata for full validation depth
const { parsePhoneNumberFromString, Metadata, getCountryCallingCode } = require('libphonenumber-js');
const maxMetadata = require('libphonenumber-js/max/metadata');


// Build a Metadata instance for querying country info
const metadata = new Metadata(maxMetadata);


/////////////////////////// Module-Loader START ////////////////////////////////

/********************************************************************
Thin loader. Picks dependencies from the injected container, merges
config over defaults, validates config via the Validators singleton,
then delegates to createInterface. Each call returns an independent
Adapter instance.

@param {Object} shared_libs - Dependency container (Utils)
@param {Object} config - Overrides merged over adapter config defaults

@return {Object} - Adapter interface (the parent's adapter contract)
*********************************************************************/
module.exports = function loader (shared_libs, config) {

  // Dependencies for this instance - by reference from the shared container
  const Lib = {
    Utils: shared_libs.Utils
  };

  // Merge overrides over adapter config defaults
  const CONFIG = Object.assign(
    {},
    require('./adapter.config'),
    config || {}
  );

  // Own frozen error catalog
  const ERRORS = require('./adapter.errors');

  // Load the validators singleton and inject Lib + ERRORS
  const Validators = require('./adapter.validators')(Lib, ERRORS);

  // Validate config - throws on misconfiguration
  Validators.validateConfig(CONFIG);

  // Build the public Adapter interface
  return createInterface(Lib, CONFIG, ERRORS, Validators);

};///////////////////////////// Module-Loader END ///////////////////////////////



/////////////////////////// createInterface START //////////////////////////////

/********************************************************************
Builds the public Adapter interface closed over Lib, CONFIG, ERRORS,
and Validators. Statelessness means createInterface closes over nothing
beyond its four fixed slots plus the module-scope libphonenumber-js
metadata.

@param {Object} Lib         - Dependency container (Utils)
@param {Object} CONFIG      - Merged adapter configuration
@param {Object} ERRORS      - Frozen error catalog
@param {Object} Validators  - Config validators

@return {Object} - { listCountries, getMetadata, validateSyntax, getNumberType }
*********************************************************************/
const createInterface = function (Lib, CONFIG, ERRORS, Validators) { // eslint-disable-line no-unused-vars

  /////////////////////////// Public Functions START //////////////////////////////
  const Adapter = {


    /********************************************************************
    List all country codes the adapter has data for.

    @return {Array} - Array of ISO 3166-1 alpha-2 country codes (lowercase)
    *********************************************************************/
    listCountries: function () {

      // Get all countries from the metadata and convert to lowercase
      return Object.keys(maxMetadata.countries).map(function (code) {
        return code.toLowerCase();
      });

    },


    /********************************************************************
    Get metadata (calling code, length bounds) for a country.
    Uses libphonenumber-js's Metadata API to extract possibleLengths.

    @param {String} country_code - ISO 3166-1 alpha-2, lowercase

    @return {Object|null} - { calling_code, min_length, max_length } or null
    *********************************************************************/
    getMetadata: function (country_code) {

      // Convert to uppercase for libphonenumber-js
      const isoCode = country_code.toUpperCase();

      // Check if the country exists in metadata
      if (!maxMetadata.countries[isoCode]) {
        return null;
      }

      // Get the calling code
      const callingCode = String(getCountryCallingCode(isoCode));

      // Get the Metadata instance for this country to extract lengths
      metadata.country(isoCode);

      // Extract possible lengths
      const possibleLengths = metadata.possibleLengths();

      let minLength = 4;
      let maxLength = 14;

      if (possibleLengths && possibleLengths.length > 0) {
        const lengths = [];
        possibleLengths.forEach(function (item) {
          if (Array.isArray(item)) {
            for (let i = item[0]; i <= item[1]; i++) {
              lengths.push(i);
            }
          } else {
            lengths.push(item);
          }
        });
        if (lengths.length > 0) {
          minLength = Math.min.apply(null, lengths);
          maxLength = Math.max.apply(null, lengths);
        }
      }

      // Cap max_length at E.164 maximum
      const e164Max = 15 - callingCode.length;
      if (maxLength > e164Max) {
        maxLength = e164Max;
      }

      return {
        calling_code: callingCode,
        min_length: minLength,
        max_length: maxLength
      };

    },


    /********************************************************************
    Validate a national phone number's syntax using libphonenumber-js.
    Provides digit pattern validation in addition to length and charset.
    Returns { valid, reason } where reason is a stable error type string
    matching the core's error catalog.

    @param {String} country_code    - ISO 3166-1 alpha-2, lowercase
    @param {String} national_number - National number digits

    @return {Object} - { valid: Boolean, reason: String|null }
    *********************************************************************/
    validateSyntax: function (country_code, national_number) {

      // Convert to uppercase for libphonenumber-js
      const isoCode = country_code.toUpperCase();

      // Check if the country exists
      if (!maxMetadata.countries[isoCode]) {
        return {
          valid: false,
          reason: 'CONTACT_PHONE_UNKNOWN_COUNTRY'
        };
      }

      // Check that the input is all digits
      if (!/^[0-9]+$/.test(national_number)) {
        return {
          valid: false,
          reason: 'CONTACT_PHONE_NOT_A_NUMBER'
        };
      }

      // Get the calling code to build a full E.164 number
      const callingCode = String(getCountryCallingCode(isoCode));
      const e164Number = '+' + callingCode + national_number;

      // Parse with libphonenumber-js
      const parsed = parsePhoneNumberFromString(e164Number, { defaultCountry: isoCode, metadata: maxMetadata });

      // Parse failed entirely
      if (parsed === undefined || parsed === null) {
        return {
          valid: false,
          reason: 'CONTACT_PHONE_NOT_A_NUMBER'
        };
      }

      // Check if the number is valid
      if (parsed.isValid()) {
        return {
          valid: true,
          reason: null
        };
      }

      // Check if it's possible but not valid (wrong pattern)
      if (parsed.isPossible()) {
        return {
          valid: false,
          reason: 'CONTACT_PHONE_INVALID_PATTERN'
        };
      }

      // Not even possible - determine if it's too short or too long
      // Get the country's length bounds
      metadata.country(isoCode);
      const possibleLengths = metadata.possibleLengths();

      let minLength = 4;
      let maxLength = 14;

      if (possibleLengths && possibleLengths.length > 0) {
        const lengths = [];
        possibleLengths.forEach(function (item) {
          if (Array.isArray(item)) {
            for (let i = item[0]; i <= item[1]; i++) {
              lengths.push(i);
            }
          } else {
            lengths.push(item);
          }
        });
        if (lengths.length > 0) {
          minLength = Math.min.apply(null, lengths);
          maxLength = Math.max.apply(null, lengths);
        }
      }

      // Cap at E.164
      const e164Max = 15 - callingCode.length;
      if (maxLength > e164Max) {
        maxLength = e164Max;
      }

      if (national_number.length < minLength) {
        return {
          valid: false,
          reason: 'CONTACT_PHONE_TOO_SHORT'
        };
      }

      if (national_number.length > maxLength) {
        return {
          valid: false,
          reason: 'CONTACT_PHONE_TOO_LONG'
        };
      }

      // Length is within bounds but still not possible - invalid pattern
      return {
        valid: false,
        reason: 'CONTACT_PHONE_INVALID_PATTERN'
      };

    },


    /********************************************************************
    Get the type of a phone number using libphonenumber-js.
    Returns one of: MOBILE, FIXED_LINE, FIXED_LINE_OR_MOBILE, TOLL_FREE,
    PREMIUM_RATE, SHARED_COST, VOIP, PERSONAL_NUMBER, PAGER, UAN, VOICEMAIL.
    Returns null if the type cannot be determined.

    @param {String} country_code    - ISO 3166-1 alpha-2, lowercase
    @param {String} national_number - National number digits

    @return {String|null} - Number type or null
    *********************************************************************/
    getNumberType: function (country_code, national_number) {

      // Convert to uppercase for libphonenumber-js
      const isoCode = country_code.toUpperCase();

      // Check if the country exists
      if (!maxMetadata.countries[isoCode]) {
        return null;
      }

      // Build the E.164 number
      const callingCode = String(getCountryCallingCode(isoCode));
      const e164Number = '+' + callingCode + national_number;

      // Parse with libphonenumber-js
      const parsed = parsePhoneNumberFromString(e164Number, { defaultCountry: isoCode, metadata: maxMetadata });

      // Parse failed
      if (parsed === undefined || parsed === null) {
        return null;
      }

      // Get the number type
      const type = parsed.getType();

      // Return the type string or null
      return type || null;

    }


  };///////////////////////////// Public Functions END //////////////////////////



  return Adapter;

};///////////////////////////// createInterface END //////////////////////////////
