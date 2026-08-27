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
//   import contactAddressAdapterBasic from 'helper-contact-address-adapter-basic';
//   const Adapter = contactAddressAdapterBasic(Lib, {});
//   import contactAddress from 'helper-contact-address';
//   Lib.ContactAddress = contactAddress(Lib, { Adapter });
//
// Compatibility: Node.js 24+ and any modern browser.
import CONFIG_DEFAULTS from './address.config.js';
import ERRORS from './address.errors.js';
import createValidators from './address.validators.js';


/////////////////////////// Module-Loader START ////////////////////////////////
export default function loader (shared_libs, config) {

  // Dependencies for this instance
  const Lib = {
    Utils: shared_libs.Utils
  };

  // Merge overrides over defaults
  const CONFIG = Object.assign(
    {},
    CONFIG_DEFAULTS,
    config || {}
  );

  // Error catalog and validators
  const Validators = createValidators(Lib, ERRORS);

  // Validate config immediately so misconfiguration fails at startup
  Validators.validateConfig(CONFIG);

  // Adapter + contract validation
  const adapter = CONFIG.Adapter;
  Validators.validateAdapterContract(adapter);

  // Create and return the public interface
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

        // Return invalid format error
        return {
          success: false,
          error: ERRORS.CONTACT_ADDRESS_INVALID_FORMAT
        };
      }

      // Check required fields
      if (policy === 'required') {

        // Reject empty required fields
        if (value === null || value === undefined || value === '') {
          return {
            success: false,
            error: ERRORS.CONTACT_ADDRESS_EMPTY
          };
        }
      }

      // Optional fields: skip if empty
      if (policy === 'optional' && (value === null || value === undefined || value === '')) {

        // Return success for empty optional field
        return {
          success: true,
          error: null
        };
      }

      // String fields: check length bounds
      const lengths = CONFIG.FIELD_LENGTHS[field_name];

      if (lengths && Lib.Utils.isString(value)) {

        if (value.length < lengths.min) {

          // Return too-short error
          return {
            success: false,
            error: ERRORS.CONTACT_ADDRESS_TOO_SHORT
          };
        }

        if (value.length > lengths.max) {

          // Return too-long error
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

          // Return invalid country error
          return {
            success: false,
            error: ERRORS.CONTACT_ADDRESS_INVALID_COUNTRY
          };
        }

        // Return success for valid country
        return {
          success: true,
          error: null
        };

      }

      // Tag field: check enum
      if (field_name === 'tag') {

        Validators.assertString('value', value);

        if (!CONFIG.VALID_TAGS.includes(value)) {

          // Return invalid tag error
          return {
            success: false,
            error: ERRORS.CONTACT_ADDRESS_INVALID_TAG
          };
        }

        // Return success for valid tag
        return {
          success: true,
          error: null
        };

      }

      // Coordinates field: check shape and ranges
      if (field_name === 'coordinates') {

        if (!Lib.Utils.isObject(value)) {

          // Return invalid coordinates error
          return {
            success: false,
            error: ERRORS.CONTACT_ADDRESS_INVALID_COORDINATES
          };
        }

        // Extract latitude and longitude
        const lat = value.latitude;
        const lng = value.longitude;

        // Validate coordinate ranges
        if (!Lib.Utils.isNumber(lat) || !Lib.Utils.isNumber(lng) ||
            lat < CONFIG.LATITUDE_MIN || lat > CONFIG.LATITUDE_MAX ||
            lng < CONFIG.LONGITUDE_MIN || lng > CONFIG.LONGITUDE_MAX) {

          // Return invalid coordinates error
          return {
            success: false,
            error: ERRORS.CONTACT_ADDRESS_INVALID_COORDINATES
          };
        }

        // Return success for valid coordinates
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

          // Map adapter reason to catalog entry
          return {
            success: false,
            error: ERRORS[result.reason] || ERRORS.CONTACT_ADDRESS_INVALID_FORMAT
          };
        }

        // Return success for valid postal code
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

          // Map adapter reason to catalog entry
          return {
            success: false,
            error: ERRORS[result.reason] || ERRORS.CONTACT_ADDRESS_INVALID_FORMAT
          };
        }

        // Return success for valid subdivision
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

        // Return invalid format error
        return {
          success: false,
          errors: [{ field: '_form', error: ERRORS.CONTACT_ADDRESS_INVALID_FORMAT }],
          error: ERRORS.CONTACT_ADDRESS_INVALID_FORMAT
        };
      }

      // Build error collection and context
      const errors = [];
      const context = {
        country_code: data.country ? data.country.toLowerCase() : ''
      };

      // Validate each field in the policy
      Object.keys(CONFIG.FIELD_POLICY).forEach(function (field_name) {

        // Validate this field
        const value = data[field_name];
        const result = ContactAddress.validateSyntax(field_name, value, context);

        // Collect errors for later reporting
        if (!result.success) {
          errors.push({
            field: field_name,
            error: result.error
          });
        }

      });

      // Report errors if any were found
      if (errors.length > 0) {
        return {
          success: false,
          errors: errors,
          error: errors[0].error
        };
      }

      // Return success with no errors
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
    buildAddress: function (data) {

      // Validate input
      if (!Lib.Utils.isObject(data)) {

        // Return empty object for invalid input
        return {};
      }

      // Build the normalized result
      const result = {};

      // Copy and normalize each known field
      Object.keys(CONFIG.FIELD_POLICY).forEach(function (field_name) {

        // Read the field value
        const value = data[field_name];

        // Skip undefined and null fields
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

      // Return the normalized address
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

        // Return success with null subdivisions
        return {
          success: true,
          subdivisions: null,
          error: null
        };
      }

      // Return success with subdivisions
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
