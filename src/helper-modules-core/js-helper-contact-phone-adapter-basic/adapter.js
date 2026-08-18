// Info: Basic phone adapter for helper-contact-phone.
// Provides lean country data (calling codes, length bounds) and
// charset validation. No pattern validation, no number type.
//
// Data is generated from libphonenumber-js metadata at build time.
// The generated file (~20 KB) is committed. No runtime third-party
// dependencies.
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


// Generated country data (committed, no build step required for consumers)
const COUNTRY_DATA = require('./_data/basic.country-data.js');


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
beyond its four fixed slots plus the static COUNTRY_DATA.

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

      // Return the keys of the country data object
      return Object.keys(COUNTRY_DATA);

    },


    /********************************************************************
    Get metadata (calling code, length bounds) for a country.

    @param {String} country_code - ISO 3166-1 alpha-2, lowercase

    @return {Object|null} - { calling_code, min_length, max_length } or null
    *********************************************************************/
    getMetadata: function (country_code) {

      // Look up the country in the data
      const data = COUNTRY_DATA[country_code];

      // Unknown country
      if (data === undefined) {
        return null;
      }

      // Return a copy so callers cannot mutate the internal data
      return {
        calling_code: data.calling_code,
        min_length: data.min_length,
        max_length: data.max_length
      };

    },


    /********************************************************************
    Validate a national phone number's syntax (length + charset).
    No pattern validation - the basic adapter does not carry pattern data.
    Returns { valid, reason } where reason is a stable error type string
    matching the core's error catalog.

    @param {String} country_code    - ISO 3166-1 alpha-2, lowercase
    @param {String} national_number - National number digits

    @return {Object} - { valid: Boolean, reason: String|null }
    *********************************************************************/
    validateSyntax: function (country_code, national_number) {

      // Look up the country
      const data = COUNTRY_DATA[country_code];

      // Unknown country
      if (data === undefined) {
        return {
          valid: false,
          reason: 'CONTACT_PHONE_UNKNOWN_COUNTRY'
        };
      }

      // Check that the input is all digits
      if (!CONFIG.NATIONAL_NUMBER_REGEX.test(national_number)) {
        return {
          valid: false,
          reason: 'CONTACT_PHONE_NOT_A_NUMBER'
        };
      }

      // Check minimum length
      if (national_number.length < data.min_length) {
        return {
          valid: false,
          reason: 'CONTACT_PHONE_TOO_SHORT'
        };
      }

      // Check maximum length
      if (national_number.length > data.max_length) {
        return {
          valid: false,
          reason: 'CONTACT_PHONE_TOO_LONG'
        };
      }

      // Valid: length and charset pass
      return {
        valid: true,
        reason: null
      };

    },


    /********************************************************************
    Get the type of a phone number. The basic adapter has no type data
    and always returns null.

    @param {String} country_code    - ISO 3166-1 alpha-2, lowercase
    @param {String} national_number - National number digits

    @return {null} - Always null (no type data in basic adapter)
    *********************************************************************/
    getNumberType: function (country_code, national_number) { // eslint-disable-line no-unused-vars

      // Basic adapter has no type data
      return null;

    }


  };///////////////////////////// Public Functions END //////////////////////////



  // Return the public Adapter interface
  return Adapter;

};///////////////////////////// createInterface END //////////////////////////////
