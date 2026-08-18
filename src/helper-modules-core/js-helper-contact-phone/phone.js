// Info: Phone number validation, formatting, and ID management.
// Port module requiring a swappable adapter for country data and
// validation depth. The core owns no country data.
//
// The adapter provides country metadata, syntax validation, and number
// type classification. Two adapters ship:
//   adapter-basic    - lean country table, length + charset validation
//   adapter-extended - wraps libphonenumber-js, pattern + type validation
//
// Both adapters expose the same 4-method contract, so calling code is
// identical regardless of validation depth.
//
// Construction (in the composition root):
//   const Adapter = require('helper-contact-phone-adapter-basic')(Lib, {});
//   Lib.ContactPhone = require('helper-contact-phone')(Lib, { Adapter });
//
// Compatibility: Node.js 24+ and any modern browser.
//
// Factory pattern: each loader call returns an independent instance with
// its own Lib, CONFIG, ERRORS, and Validators. Functions close over these
// dependencies without module-level globals.
'use strict';


/////////////////////////// Module-Loader START ////////////////////////////////

/********************************************************************
Factory loader. Each call returns an independent ContactPhone interface
with its own Lib, CONFIG, ERRORS, and Validators, bound to one adapter.
Validates CONFIG and adapter contract at construction time so
misconfiguration fails at startup, not on first call.

@param {Object} shared_libs - Lib container with Utils
@param {Object} config      - Overrides merged over module config defaults
                               Must include: { Adapter: ready-to-use adapter }

@return {Object} - Public ContactPhone interface
*********************************************************************/
module.exports = function loader (shared_libs, config) {

  // Dependencies for this instance
  const Lib = {
    Utils: shared_libs.Utils
  };

  // Merge overrides over defaults
  const CONFIG = Object.assign(
    {},
    require('./phone.config'),
    config || {}
  );

  // Error catalog (frozen, shared across instances)
  const ERRORS = require('./phone.errors');

  // Validators module (singleton, initialized with Lib, ERRORS)
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
Builds the public interface for one factory instance. Public functions
close over the provided Lib, CONFIG, ERRORS, Validators, and adapter.

@param {Object} Lib         - Dependency container (Utils)
@param {Object} CONFIG      - Merged configuration for this instance
@param {Object} ERRORS      - Frozen error catalog for this module
@param {Object} Validators  - Validators module instance
@param {Object} adapter     - Ready-to-use adapter object

@return {Object} - Public ContactPhone interface
*********************************************************************/
const createInterface = function (Lib, CONFIG, ERRORS, Validators, adapter) {

  /////////////////////////// Public Functions START //////////////////////////////
  const ContactPhone = {

    // ~~~~~~~~~~~~~~~~~~~~ Sanitization ~~~~~~~~~~~~~~~~~~~~
    // Strip disallowed characters. Return a string directly.
    // A sanitizer cannot meaningfully fail - it returns what it can.

    /********************************************************************
    Strip non-numeric characters from a national phone number.
    Returns the digit-only string. Empty string in, empty string out.

@param {String} national_number - Raw phone number input

@return {String} - Digits only
    *********************************************************************/
    sanitizeNumber: function (national_number) {

      // Validate input
      Validators.assertString('national_number', national_number);

      // Strip everything that is not a digit
      return national_number.replace(CONFIG.NATIONAL_SANITIZE_REGEX, '');

    },


    /********************************************************************
    Strip disallowed characters from a full phone number that may
    include a + prefix and a calling code. Returns the cleaned string
    preserving the leading + if present.

@param {String} phone - Raw full phone number input (e.g. '+91 98765 43210')

@return {String} - Cleaned string (e.g. '+919876543210')
    *********************************************************************/
    sanitizeFullNumber: function (phone) {

      // Validate input
      Validators.assertString('phone', phone);

      // Strip disallowed characters but keep + and digits
      const cleaned = phone.replace(CONFIG.PHONE_SANITIZE_REGEX, '');

      // Preserve leading + if it was the first character
      if (cleaned.startsWith('+')) {
        return '+' + cleaned.replace(/[^0-9]/g, '');
      }

      // Return digits only (no + prefix)
      return cleaned.replace(/[^0-9]/g, '');

    },


    // ~~~~~~~~~~~~~~~~~~~~ Predicates ~~~~~~~~~~~~~~~~~~~~
    // Cheap boolean checks. No error reason, just yes or no.

    /********************************************************************
    Check if a country code is known to the adapter.

@param {String} country_code - ISO 3166-1 alpha-2, lowercase

@return {Boolean} - true if the adapter has metadata for this country
    *********************************************************************/
    isKnownCountry: function (country_code) {

      // Validate input
      Validators.assertString('country_code', country_code);

      // Ask the adapter for metadata; null means unknown
      return adapter.getMetadata(country_code) !== null;

    },


    // ~~~~~~~~~~~~~~~~~~~~ Lookup ~~~~~~~~~~~~~~~~~~~~
    // Return envelopes with payload on success, error on failure.

    /********************************************************************
    List all country codes the adapter knows about.

@return {Object} - { success, countries, error }
    *********************************************************************/
    listCountries: function () {

      // Ask the adapter for the full country list
      const countries = adapter.listCountries();

      // Report success
      return {
        success: true,
        countries: countries,
        error: null
      };

    },


    /********************************************************************
    Get metadata (calling code, length bounds) for a country.

@param {String} country_code - ISO 3166-1 alpha-2, lowercase

@return {Object} - { success, metadata, error }
    *********************************************************************/
    getCountryMetadata: function (country_code) {

      // Validate input
      Validators.assertString('country_code', country_code);

      // Ask the adapter for metadata
      const metadata = adapter.getMetadata(country_code);

      // Unknown country
      if (metadata === null) {
        return {
          success: false,
          metadata: null,
          error: ERRORS.CONTACT_PHONE_UNKNOWN_COUNTRY
        };
      }

      // Report success
      return {
        success: true,
        metadata: metadata,
        error: null
      };

    },


    // ~~~~~~~~~~~~~~~~~~~~ Validation ~~~~~~~~~~~~~~~~~~~~
    // Return envelopes: { success, error }. The caller learns why.

    /********************************************************************
    Validate a national phone number against the country's rules.
    Delegates to the adapter for syntax checking. The adapter returns
    { valid, reason } where reason is a stable error type string.

@param {String} country_code    - ISO 3166-1 alpha-2, lowercase
@param {String} national_number - National number digits

@return {Object} - { success, error }
    *********************************************************************/
    validateSyntax: function (country_code, national_number) {

      // Validate inputs
      Validators.assertString('country_code', country_code);
      Validators.assertString('national_number', national_number);

      // Delegate to adapter
      const result = adapter.validateSyntax(country_code, national_number);

      // Map adapter result to envelope
      if (result.valid) {
        return {
          success: true,
          error: null
        };
      }

      // Map reason string to catalog entry
      return {
        success: false,
        error: ERRORS[result.reason] || ERRORS.CONTACT_PHONE_NOT_A_NUMBER
      };

    },


    // ~~~~~~~~~~~~~~~~~~~~ Number Type ~~~~~~~~~~~~~~~~~~~~
    // Classification: mobile, fixed line, etc.

    /********************************************************************
    Get the type of a phone number (MOBILE, FIXED_LINE, etc.).
    The basic adapter always returns null (no type data).
    The extended adapter returns the actual type from libphonenumber-js.

@param {String} country_code    - ISO 3166-1 alpha-2, lowercase
@param {String} national_number - National number digits

@return {Object} - { success, type, error }
    *********************************************************************/
    getNumberType: function (country_code, national_number) {

      // Validate inputs
      Validators.assertString('country_code', country_code);
      Validators.assertString('national_number', national_number);

      // Check country is known first
      const metadata = adapter.getMetadata(country_code);

      // Unknown country
      if (metadata === null) {
        return {
          success: false,
          type: null,
          error: ERRORS.CONTACT_PHONE_UNKNOWN_COUNTRY
        };
      }

      // Ask the adapter for the number type
      const type = adapter.getNumberType(country_code, national_number);

      // Report success
      return {
        success: true,
        type: type,
        error: null
      };

    },


    // ~~~~~~~~~~~~~~~~~~~~ Formatting ~~~~~~~~~~~~~~~~~~~~
    // Render values into externally-standardized strings.

    /********************************************************************
    Format a phone number as an E.164 string: +<calling_code><national_number>.
    Returns null if the country is unknown or the result would exceed
    the E.164 maximum length of 15 digits.

@param {String} country_code    - ISO 3166-1 alpha-2, lowercase
@param {String} national_number - National number digits

@return {String|null} - E.164 string (e.g. '+919876543210') or null
    *********************************************************************/
    formatE164: function (country_code, national_number) {

      // Validate inputs
      Validators.assertString('country_code', country_code);
      Validators.assertString('national_number', national_number);

      // Get country metadata
      const metadata = adapter.getMetadata(country_code);

      // Unknown country
      if (metadata === null) {
        return null;
      }

      // Build the E.164 string
      const e164 = '+' + metadata.calling_code + national_number;

      // E.164 max length check (15 digits total, not counting the +)
      if (e164.length - 1 > CONFIG.E164_MAX_LENGTH) {
        return null;
      }

      // Return the formatted E.164 string
      return e164;

    },


    /********************************************************************
    Developer-friendly alias for formatE164. Same behavior, clearer name
    for developers who do not know E.164 by heart.

@param {String} country_code    - ISO 3166-1 alpha-2, lowercase
@param {String} national_number - National number digits

@return {String|null} - Full number string (e.g. '+919876543210') or null
    *********************************************************************/
    formatFullNumber: function (country_code, national_number) {

      // Delegate to formatE164
      return ContactPhone.formatE164(country_code, national_number);

    },


    // ~~~~~~~~~~~~~~~~~~~~ Parsing ~~~~~~~~~~~~~~~~~~~~
    // Read structured values back out of strings. Return Object or null.

    /********************************************************************
    Parse an E.164 string into its country code and national number.
    Anchors the match to the string start to avoid the CTP bug (B2)
    where a recurring digit sequence caused a wrong split.

    Returns null if the string is not a valid E.164 format or if no
    known country matches the calling code prefix.

@param {String} e164_number - E.164 string (e.g. '+919876543210')

@return {Object|null} - { country_code, national_number } or null
    *********************************************************************/
    parseE164: function (e164_number) {

      // Validate input
      Validators.assertString('e164_number', e164_number);

      // Must start with +
      if (!e164_number.startsWith('+')) {
        return null;
      }

      // Extract digits after +
      const digits = e164_number.slice(1);

      // Must have at least one digit
      if (Lib.Utils.isEmptyString(digits)) {
        return null;
      }

      // Try to match a known calling code prefix.
      // Iterate over all countries and check if the digits start with
      // any country's calling code. This is O(n) in the number of
      // countries, which is acceptable for a synchronous client-side call.
      const countries = adapter.listCountries();

      // Sort by calling code length descending so longer prefixes match first
      // (e.g. 1 matches before shorter codes that might be substrings)
      const candidates = [];

      for (let i = 0; i < countries.length; i++) {
        const cc = countries[i];

        // Fetch metadata for this country
        const metadata = adapter.getMetadata(cc);

        // Check metadata is non-null
        if (metadata !== null) {

          // Push as a candidate
          candidates.push({ country_code: cc, calling_code: metadata.calling_code });
        }
      }

      // Sort by calling code length descending for longest-prefix match
      candidates.sort(function (a, b) {
        return b.calling_code.length - a.calling_code.length;
      });

      // Find the first matching prefix
      for (let i = 0; i < candidates.length; i++) {
        const candidate = candidates[i];

        // Check if digits start with this calling code
        if (digits.startsWith(candidate.calling_code)) {

          // Extract the national number after the calling code
          const national_number = digits.slice(candidate.calling_code.length);

          // Verify the national number is non-empty
          if (!Lib.Utils.isEmptyString(national_number)) {

            // Return the parsed result
            return {
              country_code: candidate.country_code,
              national_number: national_number
            };
          }
        }
      }

      // No matching calling code prefix found
      return null;

    },


    /********************************************************************
    Developer-friendly alias for parseE164. Same behavior, clearer name
    for developers who do not know E.164 by heart.

@param {String} full_number - Full number string (e.g. '+919876543210')

@return {Object|null} - { country_code, national_number } or null
    *********************************************************************/
    parseFullNumber: function (full_number) {

      // Delegate to parseE164
      return ContactPhone.parseE164(full_number);

    },


    // ~~~~~~~~~~~~~~~~~~~~ Phone ID ~~~~~~~~~~~~~~~~~~~~
    // Storage-oriented encoding for database indexing.
    // Format: country_code + '.' + reversed(national_number)
    // Country code at the start for begins_with prefix queries.
    // Reversal distributes sequentially-issued numbers across partitions.

    /********************************************************************
    Create a phone ID from a country code and national number.
    The encoding is: country_code + '.' + reversed(national_number).
    Returns null if the country is unknown.

    This is a storage convention, not a display format.

@param {String} country_code    - ISO 3166-1 alpha-2, lowercase
@param {String} national_number - National number digits

@return {String|null} - Phone ID (e.g. 'in.0123456789') or null
    *********************************************************************/
    createPhoneId: function (country_code, national_number) {

      // Validate inputs
      Validators.assertString('country_code', country_code);
      Validators.assertString('national_number', national_number);

      // Verify country is known
      const metadata = adapter.getMetadata(country_code);

      // Unknown country
      if (metadata === null) {
        return null;
      }

      // Reverse the national number
      const reversed = Lib.Utils.stringReverse(national_number);

      // Build the phone ID
      return country_code + CONFIG.PHONE_ID_SEPARATOR + reversed;

    },


    /********************************************************************
    Parse a phone ID back into its country code and national number.
    Returns null if the format is invalid or the country is unknown.

@param {String} phone_id - Phone ID (e.g. 'in.0123456789')

@return {Object|null} - { country_code, national_number } or null
    *********************************************************************/
    parsePhoneId: function (phone_id) {

      // Validate input
      Validators.assertString('phone_id', phone_id);

      // Split on the separator
      const sep = CONFIG.PHONE_ID_SEPARATOR;
      const sepIndex = phone_id.indexOf(sep);

      // No separator found
      if (sepIndex === -1) {
        return null;
      }

      // Extract country code and reversed number
      const country_code = phone_id.slice(0, sepIndex);
      const reversed = phone_id.slice(sepIndex + sep.length);

      // Both parts must be non-empty
      if (Lib.Utils.isEmptyString(country_code) || Lib.Utils.isEmptyString(reversed)) {
        return null;
      }

      // Verify country is known
      const metadata = adapter.getMetadata(country_code);

      // Unknown country
      if (metadata === null) {
        return null;
      }

      // Un-reverse the national number
      const national_number = Lib.Utils.stringReverse(reversed);

      // Return the parsed components
      return {
        country_code: country_code,
        national_number: national_number
      };

    }


  };///////////////////////////// Public Functions END ///////////////////////////



  return ContactPhone;

};///////////////////////////// createInterface END //////////////////////////////
