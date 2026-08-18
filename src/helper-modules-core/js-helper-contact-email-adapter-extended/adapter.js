// Info: Extended email adapter for js-helper-contact-email.
// Uses validator.isEmail() for syntax validation, a committed disposable
// domain list (~5K domains) for disposable checking, and
// validator.normalizeEmail() for all-provider canonicalization.
//
// Runtime dependency: validator (~50 KB).
// Build-time devDependency: disposable-email-domains-js (for domain list).
// The generated disposable-domains.js (~80 KB) is committed.
//
// Adapter contract (3 methods):
//   validateSyntax(email) -> { valid, reason }
//   isDisposableDomain(domain) -> Boolean
//   canonicalize(email) -> String | null
//
// Compatibility: Node.js 24+ and any modern browser.
'use strict';


// Runtime dependency: validator
const validator = require('validator');

// Generated disposable domain list (committed, no build step for consumers)
const DISPOSABLE_DOMAINS = require('./_data/disposable-domains.js');


/////////////////////////// Module-Loader START ////////////////////////////////
module.exports = function loader (shared_libs, config) {

  const Lib = {
    Utils: shared_libs.Utils
  };

  const CONFIG = Object.assign(
    {},
    require('./adapter.config'),
    config || {}
  );

  const ERRORS = require('./adapter.errors');
  const Validators = require('./adapter.validators')(Lib, ERRORS);
  Validators.validateConfig(CONFIG);

  return createInterface(Lib, CONFIG, ERRORS, Validators);

};///////////////////////////// Module-Loader END ///////////////////////////////



/////////////////////////// createInterface START //////////////////////////////
const createInterface = function (Lib, CONFIG, ERRORS, Validators) { // eslint-disable-line no-unused-vars

  /////////////////////////// Public Functions START //////////////////////////////
  const Adapter = {


    /********************************************************************
    Validate an email address's syntax using validator.isEmail().
    Provides granular reason codes for common failure modes before
    falling back to validator.isEmail() for the full check.

    @param {String} email - Email address to validate

    @return {Object} - { valid: Boolean, reason: String|null }
    *********************************************************************/
    validateSyntax: function (email) {

      // Empty check
      if (!email || email.length === 0) {
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

      // Full syntax check with validator.isEmail()
      if (!validator.isEmail(email, CONFIG.EMAIL_VALIDATION_OPTIONS)) {
        return {
          valid: false,
          reason: 'CONTACT_EMAIL_INVALID_SYNTAX'
        };
      }

      return {
        valid: true,
        reason: null
      };

    },


    /********************************************************************
    Check if a domain is a known disposable email provider.
    Checks against the committed list of ~5K disposable domains.

    @param {String} domain - Domain part (e.g. 'mailinator.com')

    @return {Boolean} - true if the domain is disposable
    *********************************************************************/
    isDisposableDomain: function (domain) {

      // Lowercase for case-insensitive lookup
      return DISPOSABLE_DOMAINS.has(domain.toLowerCase());

    },


    /********************************************************************
    Canonicalize an email address for duplicate detection.
    Uses validator.normalizeEmail() which handles Gmail, Outlook, iCloud,
    Yahoo, and Fastmail provider-specific folding rules.

    WARNING: Never use for storage or delivery. Duplicate detection only.

    @param {String} email - Email address to canonicalize

    @return {String|null} - Canonicalized email or null if invalid
    *********************************************************************/
    canonicalize: function (email) {

      // Validate basic structure
      if (!email || !email.includes('@')) {
        return null;
      }

      // Use validator.normalizeEmail() for all-provider canonicalization
      const normalized = validator.normalizeEmail(email);

      // normalizeEmail returns false on failure
      if (normalized === false) {
        return null;
      }

      return normalized;

    }


  };///////////////////////////// Public Functions END //////////////////////////

  return Adapter;

};///////////////////////////// createInterface END //////////////////////////////
