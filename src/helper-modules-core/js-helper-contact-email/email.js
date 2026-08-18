// Info: Email address validation, sanitization, canonicalization, and
// disposable domain checking. Port module requiring a swappable adapter
// for validation depth.
//
// The adapter provides syntax validation, disposable domain checking, and
// canonicalization. Two adapters ship:
//   adapter-basic    - own regex, no disposable data, Gmail-only canonicalize
//   adapter-extended - validator.js syntax, disposable domain list, all-provider canonicalize
//
// Both adapters expose the same 3-method contract, so calling code is
// identical regardless of validation depth.
//
// Construction (in the composition root):
//   const Adapter = require('helper-contact-email-adapter-basic')(Lib, {});
//   Lib.ContactEmail = require('helper-contact-email')(Lib, { Adapter });
//
// Compatibility: Node.js 24+ and any modern browser.
//
// Factory pattern: each loader call returns an independent instance.
'use strict';


/////////////////////////// Module-Loader START ////////////////////////////////

/********************************************************************
Factory loader. Each call returns an independent ContactEmail interface
with its own Lib, CONFIG, ERRORS, and Validators, bound to one adapter.

@param {Object} shared_libs - Lib container with Utils
@param {Object} config      - Overrides merged over module config defaults
                               Must include: { Adapter: ready-to-use adapter }

@return {Object} - Public ContactEmail interface
*********************************************************************/
module.exports = function loader (shared_libs, config) {

  // Dependencies for this instance
  const Lib = {
    Utils: shared_libs.Utils
  };

  // Merge overrides over defaults
  const CONFIG = Object.assign(
    {},
    require('./email.config'),
    config || {}
  );

  // Error catalog (frozen, shared across instances)
  const ERRORS = require('./email.errors');

  // Validators module (singleton, initialized with Lib, ERRORS)
  const Validators = require('./email.validators')(Lib, ERRORS);

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
Builds the public interface for one factory instance.

@param {Object} Lib         - Dependency container (Utils)
@param {Object} CONFIG      - Merged configuration for this instance
@param {Object} ERRORS      - Frozen error catalog for this module
@param {Object} Validators  - Validators module instance
@param {Object} adapter     - Ready-to-use adapter object

@return {Object} - Public ContactEmail interface
*********************************************************************/
const createInterface = function (Lib, CONFIG, ERRORS, Validators, adapter) {

  /////////////////////////// Public Functions START //////////////////////////////
  const ContactEmail = {

    // ~~~~~~~~~~~~~~~~~~~~ Sanitization ~~~~~~~~~~~~~~~~~~~~

    /********************************************************************
    Strip disallowed characters from an email address.
    Trims whitespace and removes characters not in the allowed set.
    Does not validate - just cleans.

    @param {String} email - Raw email input

    @return {String} - Sanitized email
    *********************************************************************/
    sanitizeEmail: function (email) {

      // Validate input
      Validators.assertString('email', email);

      // Trim whitespace first
      const trimmed = email.trim();

      // Strip disallowed characters
      return trimmed.replace(CONFIG.EMAIL_SANITIZE_REGEX, '');

    },


    // ~~~~~~~~~~~~~~~~~~~~ String Utilities ~~~~~~~~~~~~~~~~~~~~
    // Split an email on @. Do not validate.

    /********************************************************************
    Extract the domain part (after @) from an email address.
    Returns null if there is no @ or the domain is empty.
    Does not validate the domain.

    @param {String} email - Email address

    @return {String|null} - Domain part or null
    *********************************************************************/
    getDomainPart: function (email) {

      // Validate input
      Validators.assertString('email', email);

      // Split on @
      const atIndex = email.indexOf('@');

      // No @ found
      if (atIndex === -1) {
        return null;
      }

      // Extract domain
      const domain = email.slice(atIndex + 1);

      // Empty domain
      if (Lib.Utils.isEmptyString(domain)) {
        return null;
      }

      // Return the extracted domain
      return domain;

    },


    /********************************************************************
    Extract the local part (before @) from an email address.
    Returns null if there is no @ or the local part is empty.
    Does not validate the local part.

    @param {String} email - Email address

    @return {String|null} - Local part or null
    *********************************************************************/
    getLocalPart: function (email) {

      // Validate input
      Validators.assertString('email', email);

      // Split on @
      const atIndex = email.indexOf('@');

      // No @ found
      if (atIndex === -1) {
        return null;
      }

      // Extract local part
      const local = email.slice(0, atIndex);

      // Empty local
      if (Lib.Utils.isEmptyString(local)) {
        return null;
      }

      // Return the extracted local part
      return local;

    },


    // ~~~~~~~~~~~~~~~~~~~~ Validation ~~~~~~~~~~~~~~~~~~~~

    /********************************************************************
    Validate an email address's syntax. Delegates to the adapter for
    the actual syntax check. The adapter returns { valid, reason }
    where reason is a stable error type string.

    @param {String} email - Email address to validate

    @return {Object} - { success, error }
    *********************************************************************/
    validateSyntax: function (email) {

      // Validate input
      Validators.assertString('email', email);

      // Delegate to adapter
      const result = adapter.validateSyntax(email);

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
        error: ERRORS[result.reason] || ERRORS.CONTACT_EMAIL_INVALID_SYNTAX
      };

    },


    /********************************************************************
    Check if an email address uses a disposable domain. Delegates to
    the adapter's isDisposableDomain after extracting the domain part.
    Returns an envelope so the caller gets the reason.

    The basic adapter always returns false (no disposable data).
    The extended adapter checks against a committed list of ~5K domains.

    @param {String} email - Email address to check

    @return {Object} - { success, error }
    *********************************************************************/
    validateDisposable: function (email) {

      // Validate input
      Validators.assertString('email', email);

      // Extract domain
      const domain = ContactEmail.getDomainPart(email);

      // No domain - syntax is wrong, but this function checks disposability
      // Return success=true with no error if we cannot extract a domain
      if (domain === null) {

        // Return success (no disposable check possible)
        return {
          success: true,
          error: null
        };
      }

      // Ask the adapter if the domain is disposable
      const isDisposable = adapter.isDisposableDomain(domain);

      // Disposable domain found
      if (isDisposable) {
        return {
          success: false,
          error: ERRORS.CONTACT_EMAIL_DISPOSABLE
        };
      }

      // Not disposable - return success
      return {
        success: true,
        error: null
      };

    },


    // ~~~~~~~~~~~~~~~~~~~~ Predicates ~~~~~~~~~~~~~~~~~~~~

    /********************************************************************
    Quick predicate: is the domain of this email a known disposable
    provider? Delegates to the adapter after extracting the domain.

    The basic adapter always returns false.

    @param {String} domain - Domain part (e.g. 'gmail.com')

    @return {Boolean} - true if the domain is disposable
    *********************************************************************/
    isDisposableDomain: function (domain) {

      // Validate input
      Validators.assertString('domain', domain);

      // Delegate to adapter
      return adapter.isDisposableDomain(domain);

    },


    // ~~~~~~~~~~~~~~~~~~~~ Canonicalization ~~~~~~~~~~~~~~~~~~~~
    // For duplicate detection only. Never use for storage or delivery.

    /********************************************************************
    Canonicalize an email address for duplicate detection.
    Delegates to the adapter. The basic adapter does Gmail-only folding
    (remove dots, remove plus-tags). The extended adapter uses
    validator.normalizeEmail() for all providers.

    WARNING: Never use the canonicalized address for storage or delivery.
    It exists for duplicate detection only. Storing a Gmail-folded
    address loses the user's actual address.

    @param {String} email - Email address to canonicalize

    @return {String|null} - Canonicalized email or null if invalid
    *********************************************************************/
    canonicalize: function (email) {

      // Validate input
      Validators.assertString('email', email);

      // Delegate to adapter
      return adapter.canonicalize(email);

    }


  };///////////////////////////// Public Functions END //////////////////////////



  return ContactEmail;

};///////////////////////////// createInterface END //////////////////////////////
