// Info: Postal address validation and field policy management.
// Port module requiring a swappable adapter for postal code and
// subdivision validation depth.
//
// The adapter provides country lists, postal code rules, and subdivision
// data. Two adapters ship:
//   adapter-basic    - postal length bounds only, no subdivisions
//   adapter-extended - postal regex patterns + subdivision lists
//
// Field policy: 'required' and 'optional' only. No 'hidden' state.
// Tags: 'home', 'work', 'other' (string enum).
// Coordinates: { latitude, longitude } in decimal degrees, range-checked.
// Metadata: free-form object for extensibility.
//
// Construction (in the composition root):
//   const Adapter = require('helper-contact-address-adapter-basic')(Lib, {});
//   Lib.ContactAddress = require('helper-contact-address')(Lib, { Adapter });
//
// Compatibility: Node.js 24+ and any modern browser.
'use strict';


/////////////////////////// Module-Loader START ////////////////////////////////
module.exports = function loader (shared_libs, config) {

  const Lib = {
    Utils: shared_libs.Utils
  };

  const CONFIG = Object.assign(
    {},
    require('./address.config'),
    config || {}
  );

  const ERRORS = require('./address.errors');
  const Validators = require('./address.validators')(Lib, ERRORS);

  Validators.validateConfig(CONFIG);

  const adapter = CONFIG.Adapter;
  Validators.validateAdapterContract(adapter);

  return createInterface(Lib, CONFIG, ERRORS, Validators, adapter);

};///////////////////////////// Module-Loader END ///////////////////////////////



/////////////////////////// createInterface START //////////////////////////////
const createInterface = function (Lib, CONFIG, ERRORS, Validators, adapter) {

  /////////////////////////// Public Functions START //////////////////////////////
  const ContactAddress = {


    /********************************************************************
    Strip disallowed characters from a postal code.
    Keeps letters, digits, spaces, and hyphens.

    @param {String} postal_code - Raw postal code input

    @return {String} - Sanitized postal code
    *********************************************************************/
    sanitizePostalCode: function (postal_code) {

      // Validate input
      Validators.assertString('postal_code', postal_code);

      // Strip disallowed characters
      return postal_code.replace(CONFIG.POSTAL_SANITIZE_REGEX, '');

    },


    /********************************************************************
    Validate a single address field's format.
    Uses the field policy and length bounds from CONFIG, and delegates
    country-dependent checks (postal code, subdivision) to the adapter.

    @param {String} field_name - One of: line_1, line_2, landmark, locality,
                                  subdivision, postal_code, country,
                                  coordinates, label, tag, metadata
    @param {*} value           - The field value to validate
    @param {Object} context    - { country_code } for country-dependent checks

    @return {Object} - { success, error }
    *********************************************************************/
    validateSyntax: function (field_name, value, context) {

      // Validate field_name
      Validators.assertString('field_name', field_name);

      // Get field policy
      const policy = CONFIG.FIELD_POLICY[field_name];

      // Unknown field
      if (policy === undefined) {
        return {
          success: false,
          error: ERRORS.CONTACT_ADDRESS_INVALID_FORMAT
        };
      }

      // Check required fields
      if (policy === 'required') {
        if (value === null || value === undefined || value === '') {
          return {
            success: false,
            error: ERRORS.CONTACT_ADDRESS_EMPTY
          };
        }
      }

      // Optional fields: skip if empty
      if (policy === 'optional' && (value === null || value === undefined || value === '')) {
        return {
          success: true,
          error: null
        };
      }

      // String fields: check length bounds
      const lengths = CONFIG.FIELD_LENGTHS[field_name];

      if (lengths && Lib.Utils.isString(value)) {

        if (value.length < lengths.min) {
          return {
            success: false,
            error: ERRORS.CONTACT_ADDRESS_TOO_SHORT
          };
        }

        if (value.length > lengths.max) {
          return {
            success: false,
            error: ERRORS.CONTACT_ADDRESS_TOO_LONG
          };
        }

      }

      // Country field: check via adapter
      if (field_name === 'country') {

        Validators.assertString('value', value);

        const countries = adapter.listCountries();

        if (!countries.includes(value.toLowerCase())) {
          return {
            success: false,
            error: ERRORS.CONTACT_ADDRESS_INVALID_COUNTRY
          };
        }

        return {
          success: true,
          error: null
        };

      }

      // Tag field: check enum
      if (field_name === 'tag') {

        Validators.assertString('value', value);

        if (!CONFIG.VALID_TAGS.includes(value)) {
          return {
            success: false,
            error: ERRORS.CONTACT_ADDRESS_INVALID_TAG
          };
        }

        return {
          success: true,
          error: null
        };

      }

      // Coordinates field: check shape and ranges
      if (field_name === 'coordinates') {

        if (!Lib.Utils.isObject(value)) {
          return {
            success: false,
            error: ERRORS.CONTACT_ADDRESS_INVALID_COORDINATES
          };
        }

        const lat = value.latitude;
        const lng = value.longitude;

        if (typeof lat !== 'number' || typeof lng !== 'number' ||
            isNaN(lat) || isNaN(lng) ||
            lat < CONFIG.LATITUDE_MIN || lat > CONFIG.LATITUDE_MAX ||
            lng < CONFIG.LONGITUDE_MIN || lng > CONFIG.LONGITUDE_MAX) {
          return {
            success: false,
            error: ERRORS.CONTACT_ADDRESS_INVALID_COORDINATES
          };
        }

        return {
          success: true,
          error: null
        };

      }

      // Postal code field: delegate to adapter
      if (field_name === 'postal_code') {

        Validators.assertString('value', value);

        const country_code = (context && context.country_code) || '';

        const result = adapter.validatePostalCode(country_code, value);

        if (!result.valid) {
          return {
            success: false,
            error: ERRORS[result.reason] || ERRORS.CONTACT_ADDRESS_INVALID_FORMAT
          };
        }

        return {
          success: true,
          error: null
        };

      }

      // Subdivision field: delegate to adapter
      if (field_name === 'subdivision') {

        Validators.assertString('value', value);

        const country_code = (context && context.country_code) || '';

        const result = adapter.validateSubdivision(country_code, value);

        if (!result.valid) {
          return {
            success: false,
            error: ERRORS[result.reason] || ERRORS.CONTACT_ADDRESS_INVALID_FORMAT
          };
        }

        return {
          success: true,
          error: null
        };

      }

      // Default: field passed all checks
      return {
        success: true,
        error: null
      };

    },


    /********************************************************************
    Validate a complete address object. Runs validateSyntax on every
    field and returns all errors at once in an errors array.
    This is the one shape departure - a form needs every field's failure,
    not just the first.

    @param {Object} data - Address data object

    @return {Object} - { success, errors, error }
    *********************************************************************/
    validateAddress: function (data) {

      // Validate input
      if (!Lib.Utils.isObject(data)) {
        return {
          success: false,
          errors: [{ field: '_form', error: ERRORS.CONTACT_ADDRESS_INVALID_FORMAT }],
          error: ERRORS.CONTACT_ADDRESS_INVALID_FORMAT
        };
      }

      const errors = [];
      const context = {
        country_code: data.country ? data.country.toLowerCase() : ''
      };

      // Validate each field in the policy
      Object.keys(CONFIG.FIELD_POLICY).forEach(function (field_name) {

        const value = data[field_name];
        const result = ContactAddress.validateSyntax(field_name, value, context);

        if (!result.success) {
          errors.push({
            field: field_name,
            error: result.error
          });
        }

      });

      if (errors.length > 0) {
        return {
          success: false,
          errors: errors,
          error: errors[0].error
        };
      }

      return {
        success: true,
        errors: [],
        error: null
      };

    },


    /********************************************************************
    Create a normalized address data object from input.
    Lowercases the country code, trims string fields.

    @param {Object} data - Raw address data

    @return {Object} - Normalized address data
    *********************************************************************/
    createAddress: function (data) {

      // Validate input
      if (!Lib.Utils.isObject(data)) {
        return {};
      }

      const result = {};

      // Copy and normalize each known field
      Object.keys(CONFIG.FIELD_POLICY).forEach(function (field_name) {

        const value = data[field_name];

        if (value === undefined || value === null) {
          return;
        }

        // Trim and lowercase string fields
        if (Lib.Utils.isString(value)) {
          if (field_name === 'country') {
            result[field_name] = value.trim().toLowerCase();
          } else {
            result[field_name] = value.trim();
          }
        } else {
          result[field_name] = value;
        }

      });

      return result;

    },


    /********************************************************************
    List subdivisions for a country. Delegates to the adapter.
    The basic adapter returns null (no subdivision data).
    The extended adapter returns [{ code, name }] from iso-3166-2 data.

    @param {String} country_code - ISO 3166-1 alpha-2, lowercase

    @return {Object} - { success, subdivisions, error }
    *********************************************************************/
    listSubdivisions: function (country_code) {

      // Validate input
      Validators.assertString('country_code', country_code);

      // Ask the adapter
      const subdivisions = adapter.listSubdivisions(country_code);

      // Null means no data (basic adapter) or unknown country
      if (subdivisions === null) {
        return {
          success: true,
          subdivisions: null,
          error: null
        };
      }

      return {
        success: true,
        subdivisions: subdivisions,
        error: null
      };

    },


    /********************************************************************
    Get the configured field policy.

    @return {Object} - { field_name: 'required'|'optional', ... }
    *********************************************************************/
    getFieldPolicy: function () {

      // Return a copy so callers cannot mutate the internal policy
      return Object.assign({}, CONFIG.FIELD_POLICY);

    }


  };///////////////////////////// Public Functions END //////////////////////////

  return ContactAddress;

};///////////////////////////// createInterface END //////////////////////////////
