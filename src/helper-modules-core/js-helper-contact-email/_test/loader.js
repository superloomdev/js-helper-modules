// Info: Test loader for helper-contact-email.
// Builds a Lib container with Utils and a stub adapter.
'use strict';


// Stub adapter with known behavior for testing
const stubAdapter = {
  validateSyntax: function (email) {
    if (!email || email.length === 0) {
      return { valid: false, reason: 'CONTACT_EMAIL_EMPTY' };
    }
    if (!email.includes('@')) {
      return { valid: false, reason: 'CONTACT_EMAIL_NO_AT' };
    }
    const parts = email.split('@');
    if (parts.length > 2) {
      return { valid: false, reason: 'CONTACT_EMAIL_MULTIPLE_AT' };
    }
    if (parts[0].length === 0) {
      return { valid: false, reason: 'CONTACT_EMAIL_EMPTY_LOCAL' };
    }
    if (parts[1].length === 0) {
      return { valid: false, reason: 'CONTACT_EMAIL_EMPTY_DOMAIN' };
    }
    if (!/^[\w.+-]+@[\w.-]+\.\w{2,}$/.test(email)) {
      return { valid: false, reason: 'CONTACT_EMAIL_INVALID_SYNTAX' };
    }
    return { valid: true, reason: null };
  },
  isDisposableDomain: function (domain) {
    return domain === 'mailinator.com';
  },
  canonicalize: function (email) {
    if (!email || !email.includes('@')) {
      return null;
    }
    const [local, domain] = email.split('@');
    if (domain === 'gmail.com') {
      let folded = local.replace(/\./g, '');
      const plusIdx = folded.indexOf('+');
      if (plusIdx !== -1) {
        folded = folded.slice(0, plusIdx);
      }
      return folded + '@gmail.com';
    }
    return email;
  }
};


// Build Lib container
const Lib = {};
Lib.Utils = require('helper-utils')(Lib, {});


// Load the module under test
const ContactEmail = require('helper-contact-email')(Lib, {
  Adapter: stubAdapter
});


module.exports = {
  ContactEmail: ContactEmail,
  Lib: Lib,
  stubAdapter: stubAdapter
};
