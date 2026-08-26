// Info: Basic email adapter for helper-contact-email.
// Own regex syntax validation. No disposable domain data.
// Gmail-only canonicalization (dot/plus-tag folding).
// Zero runtime third-party dependencies.
//
// Adapter contract (3 methods):
//   validateSyntax(email) -> { valid, reason }
//   isDisposableDomain(domain) -> Boolean
//   canonicalize(email) -> String | null
//
// Compatibility: Node.js 24+ and any modern browser.

import CONFIG_DEFAULTS from './adapter.config.js';
import ERRORS from './adapter.errors.js';
import createValidators from './adapter.validators.js';

/////////////////////////// Module-Loader START ////////////////////////////////
export default function loader (shared_libs, config) {

  // Dependencies for this instance - by reference from the shared container
  const Lib = {
    Utils: shared_libs.Utils
  };

  // Merge overrides over adapter config defaults
  const CONFIG = Object.assign(
    {},
    CONFIG_DEFAULTS,
    config || {}
  );

  // Own frozen error catalog
  // ERRORS is imported at the top of the file

  // Load the validators singleton and inject Lib + ERRORS
  const Validators = createValidators(Lib, ERRORS);

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
    Validate an email address's syntax using a simple regex.
    Provides granular reason codes for common failure modes.

    @param {String} email - Email address to validate

    @return {Object} - { valid: Boolean, reason: String|null }
    *********************************************************************/
    validateSyntax: function (email) {

      // Empty check
      if (Lib.Utils.isNullOrUndefined(email) || Lib.Utils.isEmptyString(email)) {
        return {
          valid: false,
          reason: 'CONTACT_EMAIL_EMPTY'
        };
      }

      // @ presence check
      const atIndex = email.indexOf('@');
      if (atIndex === -1) {
        return {
          valid: false,
          reason: 'CONTACT_EMAIL_NO_AT'
        };
      }

      // Multiple @ check
      if (email.indexOf('@', atIndex + 1) !== -1) {
        return {
          valid: false,
          reason: 'CONTACT_EMAIL_MULTIPLE_AT'
        };
      }

      // Empty local part
      if (atIndex === 0) {
        return {
          valid: false,
          reason: 'CONTACT_EMAIL_EMPTY_LOCAL'
        };
      }

      // Empty domain part
      if (atIndex === email.length - 1) {
        return {
          valid: false,
          reason: 'CONTACT_EMAIL_EMPTY_DOMAIN'
        };
      }

      // Full syntax check with regex
      if (!CONFIG.EMAIL_REGEX.test(email)) {
        return {
          valid: false,
          reason: 'CONTACT_EMAIL_INVALID_SYNTAX'
        };
      }

      // Valid: all checks pass
      return {
        valid: true,
        reason: null
      };

    },


    /********************************************************************
    Check if a domain is a known disposable email provider.
    The basic adapter has no disposable data and always returns false.

    @param {String} domain - Domain part (e.g. 'gmail.com')

    @return {Boolean} - Always false (no disposable data in basic adapter)
    *********************************************************************/
    isDisposableDomain: function (domain) { // eslint-disable-line no-unused-vars

      // Basic adapter has no disposable data
      return false;

    },


    /********************************************************************
    Canonicalize an email address for duplicate detection.
    Gmail: remove dots, remove plus-tags.
    Other domains: return as-is (lowercased).

    WARNING: Never use for storage or delivery. Duplicate detection only.

    @param {String} email - Email address to canonicalize

    @return {String|null} - Canonicalized email or null if invalid
    *********************************************************************/
    canonicalize: function (email) {

      // Validate basic structure
      if (!email || !email.includes('@')) {
        return null;
      }

      // Lowercase
      const lower = email.toLowerCase();

      // Split
      const atIndex = lower.indexOf('@');
      const local = lower.slice(0, atIndex);
      const domain = lower.slice(atIndex + 1);

      // Gmail folding
      if (domain === 'gmail.com' || domain === 'googlemail.com') {
        let folded = local.replace(/\./g, '');
        const plusIdx = folded.indexOf('+');
        if (plusIdx !== -1) {
          folded = folded.slice(0, plusIdx);
        }
        // Return the folded Gmail address
        return folded + '@gmail.com';
      }

      // Non-Gmail: return lowercased as-is
      return lower;

    }


  };///////////////////////////// Public Functions END //////////////////////////

  // Return the public Adapter interface
  return Adapter;

};///////////////////////////// createInterface END //////////////////////////////
