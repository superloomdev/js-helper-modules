// Info: Lean phone adapter for helper-contact-phone.
// Carries a generated country table with calling codes and per-country
// phone number length bounds. No national-prefix patterns - this is
// cheap structural validation, safe for a browser bundle. For
// authoritative validation, use the libphonenumber adapter instead.
//
// Standard factory shape: receives shared_libs, owns its own CONFIG,
// ERRORS, and Validators. Returns a ready-to-use adapter object that
// the parent consumes via CONFIG.Adapter.
//
// Adapter contract (3 methods):
//   listCountries()                              -> [String]
//   getMetadata(country_code)                    -> { calling_code, min_length, max_length } | null
//   validateNumber(country_code, national_number) -> { valid: Boolean, reason: String | null }
//
// Reason codes: UNKNOWN_COUNTRY, CHARSET, TOO_SHORT, TOO_LONG
// The basic adapter never emits PATTERN or NOT_ASSIGNED.
//
// Compatibility: Node.js 24+
'use strict';


// Generated country data (frozen, committed, no runtime dependency on libphonenumber-js)
const COUNTRY_DATA = require('./basic.country-data.js');


/////////////////////////// Module-Loader START ////////////////////////////////

/********************************************************************
Thin loader. Picks dependencies from the injected container, merges
config over defaults, validates config via the Validators singleton,
then delegates to createInterface. Each call returns an independent
Adapter instance.

@param {Object} shared_libs - Dependency container (Utils, Debug)
@param {Object} config - Overrides merged over adapter config defaults
                         (adapter-specific keys)

@return {Object} - Adapter interface (the parent's adapter contract)
*********************************************************************/
module.exports = function loader (shared_libs, config) {

  // Dependencies for this instance - by reference from the shared container
  const Lib = {
    Utils: shared_libs.Utils,
    Debug: shared_libs.Debug
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

};/////////////////////////// Module-Loader END /////////////////////////////////



/////////////////////////// createInterface START //////////////////////////////

/********************************************************************
Build the public Adapter interface closed over Lib, CONFIG, ERRORS,
and Validators. Statelessness means createInterface closes over nothing
beyond its four fixed slots.

@param {Object} Lib         - Dependency container (Utils, Debug)
@param {Object} CONFIG      - Merged adapter configuration
@param {Object} ERRORS      - Frozen error catalog
@param {Object} Validators  - Config validators

@return {Object} - { listCountries, getMetadata, validateNumber }
*********************************************************************/
const createInterface = function (Lib, CONFIG, ERRORS, Validators) { // eslint-disable-line no-unused-vars

  ////////////////////////////// Public Functions START ////////////////////////
  const Adapter = {

    // ~~~~~~~~~~~~~~~~~~~~ Country Listing ~~~~~~~~~~~~~~~~~~~~

    /********************************************************************
    List all country codes the adapter knows about.

    @return {Array} - Array of ISO 3166-1 alpha-2 country codes (lowercase)
    *********************************************************************/
    listCountries: function () {

      // Return all keys from the generated country data
      return Object.keys(COUNTRY_DATA);

    },


    // ~~~~~~~~~~~~~~~~~~~~ Metadata Lookup ~~~~~~~~~~~~~~~~~~~~

    /********************************************************************
    Get phone metadata for a country (calling code, length bounds).

    @param {String} country_code - ISO 3166-1 alpha-2 country code

    @return {Object|null} - { calling_code, min_length, max_length } or null
    *********************************************************************/
    getMetadata: function (country_code) {

      // Return metadata or null for unknown countries
      if (Object.prototype.hasOwnProperty.call(COUNTRY_DATA, country_code)) {
        return COUNTRY_DATA[country_code];
      }

      return null;

    },


    // ~~~~~~~~~~~~~~~~~~~~ Number Validation ~~~~~~~~~~~~~~~~~~~~

    /********************************************************************
    Validate a national phone number against the adapter rules.
    Checks country existence, charset (digits only), and length bounds.
    Never emits PATTERN or NOT_ASSIGNED - those are for the
    libphonenumber adapter.

    @param {String} country_code     - ISO 3166-1 alpha-2 country code
    @param {String} national_number  - National phone number (no calling code)

    @return {Object} - { valid: Boolean, reason: String | null }
    *********************************************************************/
    validateNumber: function (country_code, national_number) {

      // Check country exists in the data
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

  };////////////////////////////// Public Functions END ////////////////////////

  return Adapter;

};///////////////////////////// createInterface END /////////////////////////////
