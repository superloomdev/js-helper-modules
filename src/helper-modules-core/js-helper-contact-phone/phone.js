// Info: Phone number validation, sanitization, and E.164 formatting.
// The core holds no country data - a required adapter supplies calling
// codes, length bounds, and validation logic. The caller chooses adapter
// depth at the composition root: basic for lean browser bundles,
// libphonenumber for authoritative server-side validation.
//
// Each loader call returns an independent ContactPhone interface with its
// own Lib, CONFIG, ERRORS, and Validators, bound to one ready-to-use adapter.
// Stateless - no per-instance resources.
//
// Adapter contract (3 methods every adapter must implement):
//   listCountries()                              -> [String]
//   getMetadata(country_code)                    -> { calling_code, min_length, max_length } | null
//   validateNumber(country_code, national_number) -> { valid: Boolean, reason: String | null }
//
// Reason codes (shared by both adapters):
//   UNKNOWN_COUNTRY, CHARSET, TOO_SHORT, TOO_LONG, PATTERN, NOT_ASSIGNED
// The basic adapter never emits PATTERN or NOT_ASSIGNED.
//
// Compatibility: Node.js 24+
'use strict';


/////////////////////////// Module-Loader START ////////////////////////////////

/********************************************************************
Factory loader. One call = one independent ContactPhone instance with its
own Lib, CONFIG, ERRORS, and Validators, bound to one adapter. Validates
CONFIG at construction time so misconfiguration fails at startup, not on
first request.

@param {Object} shared_libs - Lib container with Utils, Debug
@param {Object} config      - Overrides merged over module config defaults
                               Must include: { Adapter: ready-to-use adapter }

@return {Object} - Public ContactPhone interface
*********************************************************************/
module.exports = function loader (shared_libs, config) {

  // Dependencies for this instance
  const Lib = {
    Utils: shared_libs.Utils,
    Debug: shared_libs.Debug
  };

  // Merge overrides over defaults
  const CONFIG = Object.assign(
    {},
    require('./phone.config'),
    config || {}
  );

  // Error catalog (frozen, owned by the main module)
  const ERRORS = require('./phone.errors');

  // Validators singleton - Lib, ERRORS, and any static data injected here
  const Validators = require('./phone.validators')(Lib, ERRORS);

  // Validate config immediately so misconfiguration fails at startup
  Validators.validateConfig(CONFIG);

  // Adapter + contract validation
  const adapter = CONFIG.Adapter;
  Validators.validateAdapterContract(adapter);

  // Create and return the public interface
  return createInterface(Lib, CONFIG, ERRORS, Validators, adapter);

};///////////////////////////// Module-Loader END ///////////////////////////////



/////////////////////////// createInterface START //////////////////////////////

/********************************************************************
Build the public ContactPhone interface closed over Lib, CONFIG,
ERRORS, Validators, and adapter.

@param {Object} Lib        - Dependency container
@param {Object} CONFIG     - Merged configuration
@param {Object} ERRORS     - Error catalog
@param {Object} Validators - Validators singleton (used at loader time only)
@param {Object} adapter    - Instantiated adapter (3-method contract)

@return {Object} - Public ContactPhone interface
*********************************************************************/
const createInterface = function (Lib, CONFIG, ERRORS, Validators, adapter) {

  ////////////////////////////// Public Functions START ////////////////////////
  const ContactPhone = {

    // ~~~~~~~~~~~~~~~~~~~~ Sanitization ~~~~~~~~~~~~~~~~~~~~
    // Strip disallowed characters from phone number strings.

    /********************************************************************
    Strip non-digit characters from a national phone number string.
    Returns the cleaned string. Returns '' for null or undefined input.

    @param {String} number - National phone number string

    @return {String} - Sanitized string (digits only)
    *********************************************************************/
    sanitizeNumber: function (number) {

      // Guard null and undefined input
      if (Lib.Utils.isNullOrUndefined(number)) {
        return '';
      }

      // Strip non-digit characters
      return String(number).replace(/[^0-9]/g, '');

    },


    /********************************************************************
    Strip non-digit and non-plus characters from a full phone number
    string (may include country calling code prefix). Returns the
    cleaned string. Returns '' for null or undefined input.

    @param {String} phone - Full phone number string (may start with +)

    @return {String} - Sanitized string (digits and leading + only)
    *********************************************************************/
    sanitizeFullNumber: function (phone) {

      // Guard null and undefined input
      if (Lib.Utils.isNullOrUndefined(phone)) {
        return '';
      }

      // Strip non-digit and non-plus characters
      return String(phone).replace(/[^0-9+]/g, '');

    },


    // ~~~~~~~~~~~~~~~~~~~~ Predicates ~~~~~~~~~~~~~~~~~~~~
    // Cheap boolean checks with no error reason.

    /********************************************************************
    Return true if the country code is in the adapter known list.

    @param {String} country_code - ISO 3166-1 alpha-2 country code

    @return {Boolean}
    *********************************************************************/
    isKnownCountry: function (country_code) {

      // Guard non-string input
      if (!Lib.Utils.isString(country_code)) {
        return false;
      }

      // Check against adapter country list
      return adapter.listCountries().indexOf(country_code.toLowerCase()) !== -1;

    },


    // ~~~~~~~~~~~~~~~~~~~~ Lookups ~~~~~~~~~~~~~~~~~~~~
    // Fetch metadata or lists from the adapter, wrapped in envelopes.

    /********************************************************************
    List all country codes the adapter knows about.

    @return {Object} - { success, countries, error }
    *********************************************************************/
    listCountries: function () {

      // Fetch country list from adapter
      const countries = adapter.listCountries();

      // Return successful envelope
      return {
        success: true,
        countries: countries,
        error: null
      };

    },


    /********************************************************************
    Get phone metadata for a country (calling code, length bounds).

    @param {String} country_code - ISO 3166-1 alpha-2 country code

    @return {Object} - { success, metadata, error }
    *********************************************************************/
    getCountryMetadata: function (country_code) {

      // Validate country code is a string
      if (!Lib.Utils.isString(country_code)) {
        return {
          success: false,
          metadata: null,
          error: ERRORS.UNKNOWN_COUNTRY
        };
      }

      // Fetch metadata from adapter
      const metadata = adapter.getMetadata(country_code.toLowerCase());

      // Adapter returned null - unknown country
      if (metadata === null) {
        return {
          success: false,
          metadata: null,
          error: ERRORS.UNKNOWN_COUNTRY
        };
      }

      // Return successful envelope
      return {
        success: true,
        metadata: metadata,
        error: null
      };

    },


    // ~~~~~~~~~~~~~~~~~~~~ Validation ~~~~~~~~~~~~~~~~~~~~
    // Check and explain. Returns an envelope with a reason.

    /********************************************************************
    Validate a national phone number against the adapter rules.
    The adapter checks country existence, charset, and length bounds.
    Returns an envelope with success and error. The error type carries
    the reason code from the adapter.

    @param {String} country_code    - ISO 3166-1 alpha-2 country code
    @param {String} national_number - National phone number (no calling code)

    @return {Object} - { success, error }
    *********************************************************************/
    validateNumber: function (country_code, national_number) {

      // Validate country code is a string
      if (!Lib.Utils.isString(country_code)) {
        return {
          success: false,
          error: ERRORS.UNKNOWN_COUNTRY
        };
      }

      // Validate national number is a string
      if (!Lib.Utils.isString(national_number)) {
        return {
          success: false,
          error: ERRORS.INVALID_NUMBER
        };
      }

      // Delegate validation to the adapter
      const result = adapter.validateNumber(
        country_code.toLowerCase(),
        national_number
      );

      // Adapter says valid
      if (result.valid) {
        return {
          success: true,
          error: null
        };
      }

      // Adapter says invalid - wrap the reason in our error catalog
      return {
        success: false,
        error: {
          type: 'CONTACT_PHONE_INVALID_NUMBER',
          message: result.reason || 'Validation failed'
        }
      };

    },


    // ~~~~~~~~~~~~~~~~~~~~ E.164 Format and Parse ~~~~~~~~~~~~~~~~~~~~
    // Build and read the externally-standardized E.164 string form.

    /********************************************************************
    Format a national number into E.164 form (+calling_code + national_number).
    Returns null if the country is unknown or the number is null.

    @param {String} country_code    - ISO 3166-1 alpha-2 country code
    @param {String} national_number - National phone number (no calling code)

    @return {String|null} - E.164 formatted string, or null
    *********************************************************************/
    formatE164: function (country_code, national_number) {

      // Guard null national number
      if (Lib.Utils.isNullOrUndefined(national_number)) {
        return null;
      }

      // Validate country code is a string
      if (!Lib.Utils.isString(country_code)) {
        return null;
      }

      // Fetch metadata from adapter
      const metadata = adapter.getMetadata(country_code.toLowerCase());

      // Unknown country - cannot format
      if (metadata === null) {
        return null;
      }

      // Build E.164: +calling_code + national_number
      return '+' + metadata.calling_code + String(national_number);

    },


    /********************************************************************
    Parse an E.164 formatted string into its country code and national number.
    Anchors the match to the string start to fix B2: the legacy code split
    on the literal calling code, which could recur later in the number.

    Returns an object { country_code, national_number } or null if no
    country's calling code matches the start of the string.

    @param {String} e164_number - E.164 formatted phone number (starts with +)

    @return {Object|null} - { country_code, national_number } or null
    *********************************************************************/
    parseE164: function (e164_number) {

      // Guard null and non-string input
      if (!Lib.Utils.isString(e164_number)) {
        return null;
      }

      // Must start with +
      if (e164_number.charAt(0) !== '+') {
        return null;
      }

      // Strip the leading + for matching
      const digits = e164_number.slice(1);

      // Iterate all known countries to find one whose calling code
      // matches the start of the digit string (anchored match, fixes B2)
      const countries = adapter.listCountries();

      // Sort by calling code length descending so longer codes match first
      // (e.g. +1 matches US, but +91 matches IN - we want the longest match)
      const candidates = [];

      countries.forEach(function (code) {

        const metadata = adapter.getMetadata(code);

        if (metadata !== null) {
          candidates.push({
            country_code: code,
            calling_code: metadata.calling_code
          });
        }

      });

      // Sort by calling code string length descending, then lexicographically
      candidates.sort(function (a, b) {

        if (b.calling_code.length !== a.calling_code.length) {
          return b.calling_code.length - a.calling_code.length;
        }

        return a.calling_code.localeCompare(b.calling_code);

      });

      // Find the first candidate whose calling code is a prefix of digits
      for (let i = 0; i < candidates.length; i++) {

        const candidate = candidates[i];
        const cc = candidate.calling_code;

        // Check if digits starts with this calling code (anchored match)
        if (digits.slice(0, cc.length) === cc) {

          // Extract the national number (the remainder after the calling code)
          const national_number = digits.slice(cc.length);

          // Validate the remainder is non-empty
          if (national_number.length === 0) {
            continue;
          }

          // Return parsed result as an object (not a positional array)
          return {
            country_code: candidate.country_code,
            national_number: national_number
          };

        }

      }

      // No matching country found
      return null;

    },


    // ~~~~~~~~~~~~~~~~~~~~ Phone ID Create and Parse ~~~~~~~~~~~~~~~~~~~~
    // Build and read the Superloom-owned storage identifier.
    // The encoding is: reversed(national_number) + '.' + country_code
    // The reversal distributes sequentially-issued numbers across a
    // partitioned key space.

    /********************************************************************
    Create a phone ID from a country code and national number.
    The ID format is reversed(national_number) + '.' + country_code.
    Returns null if the national number is null or empty.

    @param {String} country_code    - ISO 3166-1 alpha-2 country code
    @param {String} national_number - National phone number (no calling code)

    @return {String|null} - Phone ID string, or null
    *********************************************************************/
    createPhoneId: function (country_code, national_number) {

      // Guard null or empty national number
      if (Lib.Utils.isNullOrUndefined(national_number) || national_number === '') {
        return null;
      }

      // Guard non-string country code
      if (!Lib.Utils.isString(country_code)) {
        return null;
      }

      // Reverse the national number and append the country code
      const reversed = String(national_number).split('').reverse().join('');

      return reversed + '.' + country_code.toLowerCase();

    },


    /********************************************************************
    Parse a phone ID back into its country code and national number.
    Returns an object { country_code, national_number } or null if the
    input is null or malformed.

    @param {String} phone_id - Phone ID string

    @return {Object|null} - { country_code, national_number } or null
    *********************************************************************/
    parsePhoneId: function (phone_id) {

      // Guard null and non-string input
      if (!Lib.Utils.isString(phone_id) || phone_id === '') {
        return null;
      }

      // Split on the dot separator
      const dotIndex = phone_id.indexOf('.');

      // No dot found - malformed
      if (dotIndex === -1) {
        return null;
      }

      // Extract reversed number and country code
      const reversed = phone_id.slice(0, dotIndex);
      const country_code = phone_id.slice(dotIndex + 1);

      // Validate both parts are non-empty
      if (reversed === '' || country_code === '') {
        return null;
      }

      // Reverse the number back to its original form
      const national_number = reversed.split('').reverse().join('');

      // Return parsed result as an object (not a positional array)
      return {
        country_code: country_code,
        national_number: national_number
      };

    }

  };////////////////////////////// Public Functions END ////////////////////////

  return ContactPhone;

};///////////////////////////// createInterface END /////////////////////////////
