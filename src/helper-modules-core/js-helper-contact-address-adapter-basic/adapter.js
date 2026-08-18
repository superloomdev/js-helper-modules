// Info: Basic address adapter for helper-contact-address.
// Postal code length bounds per country. No subdivision data.
// Zero runtime third-party dependencies.
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


// Generated postal data (committed, no build step for consumers)
const POSTAL_DATA = require('./data/basic.postal-data.json');


/////////////////////////// Module-Loader START ////////////////////////////////
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
const createInterface = function (Lib, CONFIG, ERRORS, Validators) { // eslint-disable-line no-unused-vars

  /////////////////////////// Public Functions START //////////////////////////////
  const Adapter = {


    /********************************************************************
    List all country codes the adapter has data for.

@return {Array} - Array of ISO 3166-1 alpha-2 country codes (lowercase)
    *********************************************************************/
    listCountries: function () {

      // Return the keys of the postal data object
      return Object.keys(POSTAL_DATA);

    },


    /********************************************************************
    Get the postal code rule for a country.
    Returns null for unknown countries.

@param {String} country_code - ISO 3166-1 alpha-2, lowercase

@return {Object|null} - { min_length, max_length, pattern, required }
    *********************************************************************/
    getPostalRule: function (country_code) {

      // Look up the country in the data
      const rule = POSTAL_DATA[country_code];

      // Unknown country
      if (!rule) {
        return null;
      }

      // Basic adapter has no regex patterns
      return {
        min_length: rule.min_length,
        max_length: rule.max_length,
        pattern: null,
        required: rule.required
      };

    },


    /********************************************************************
    List subdivisions for a country.
    The basic adapter has no subdivision data and always returns null.

@param {String} country_code - ISO 3166-1 alpha-2, lowercase

@return {null} - Always null (no subdivision data in basic adapter)
    *********************************************************************/
    listSubdivisions: function (country_code) { // eslint-disable-line no-unused-vars

      // Basic adapter has no subdivision data
      return null;

    },


    /********************************************************************
    Validate a postal code for a country using length bounds only.
    No regex pattern validation.

@param {String} country_code  - ISO 3166-1 alpha-2, lowercase
@param {String} postal_code   - Postal code to validate

@return {Object} - { valid: Boolean, reason: String|null }
    *********************************************************************/
    validatePostalCode: function (country_code, postal_code) {

      // Look up the country
      const rule = POSTAL_DATA[country_code];

      // Unknown country
      if (!rule) {
        return {
          valid: false,
          reason: 'CONTACT_ADDRESS_INVALID_COUNTRY'
        };
      }

      // No postal system - accept anything
      if (!rule.required) {
        return {
          valid: true,
          reason: null
        };
      }

      // Length check
      if (postal_code.length < rule.min_length) {
        return {
          valid: false,
          reason: 'CONTACT_ADDRESS_TOO_SHORT'
        };
      }

      // Check maximum length
      if (postal_code.length > rule.max_length) {
        return {
          valid: false,
          reason: 'CONTACT_ADDRESS_TOO_LONG'
        };
      }

      // Valid: length bounds pass
      return {
        valid: true,
        reason: null
      };

    },


    /********************************************************************
    Validate a subdivision code for a country.
    The basic adapter has no subdivision data and always returns valid.

@param {String} country_code       - ISO 3166-1 alpha-2, lowercase
@param {String} subdivision_code   - Subdivision code to validate

@return {Object} - { valid: true, reason: null }
    *********************************************************************/
    validateSubdivision: function (country_code, subdivision_code) { // eslint-disable-line no-unused-vars

      // Basic adapter has no subdivision data - accept anything
      return {
        valid: true,
        reason: null
      };

    }


  };///////////////////////////// Public Functions END //////////////////////////

  // Return the public Adapter interface
  return Adapter;

};///////////////////////////// createInterface END //////////////////////////////
