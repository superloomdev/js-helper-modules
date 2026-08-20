// Info: Test suite for helper-contact-email.
// Uses a stub adapter with known behavior.
'use strict';


const { test } = require('node:test');
const assert = require('node:assert/strict');

const { ContactEmail, Lib } = require('./loader');



// ~~~~~~~~~~~~~~~~~~~~ Construction ~~~~~~~~~~~~~~~~~~~~

test('construction with valid adapter succeeds', function () {

  assert.equal(typeof ContactEmail, 'object');
  assert.equal(typeof ContactEmail.validateSyntax, 'function');
  assert.equal(typeof ContactEmail.canonicalize, 'function');

});


test('construction without adapter throws', function () {

  assert.throws(function () {
    require('helper-contact-email')(Lib, {});
  }, /CONFIG\.Adapter must be/);

});


test('construction with adapter missing methods throws', function () {

  assert.throws(function () {
    require('helper-contact-email')(Lib, { Adapter: { validateSyntax: function () {} } });
  }, /Invalid adapter contract: missing method/);

});



// ~~~~~~~~~~~~~~~~~~~~ sanitizeEmail ~~~~~~~~~~~~~~~~~~~~

test('sanitizeEmail strips disallowed characters', function () {

  assert.equal(ContactEmail.sanitizeEmail('user name@gmail.com'), 'username@gmail.com');
  assert.equal(ContactEmail.sanitizeEmail('user!name@gmail.com'), 'username@gmail.com');

});


test('sanitizeEmail trims whitespace', function () {

  assert.equal(ContactEmail.sanitizeEmail('  user@gmail.com  '), 'user@gmail.com');

});


test('sanitizeEmail preserves valid characters', function () {

  assert.equal(ContactEmail.sanitizeEmail('user.name+tag@gmail.com'), 'user.name+tag@gmail.com');

});


test('sanitizeEmail non-string throws TypeError', function () {

  assert.throws(function () {
    ContactEmail.sanitizeEmail(123);
  }, TypeError);

});



// ~~~~~~~~~~~~~~~~~~~~ getDomainPart ~~~~~~~~~~~~~~~~~~~~

test('getDomainPart extracts domain', function () {

  assert.equal(ContactEmail.getDomainPart('user@gmail.com'), 'gmail.com');

});


test('getDomainPart returns null for no @', function () {

  assert.equal(ContactEmail.getDomainPart('usergmail.com'), null);

});


test('getDomainPart returns null for empty domain', function () {

  assert.equal(ContactEmail.getDomainPart('user@'), null);

});



// ~~~~~~~~~~~~~~~~~~~~ getLocalPart ~~~~~~~~~~~~~~~~~~~~

test('getLocalPart extracts local part', function () {

  assert.equal(ContactEmail.getLocalPart('user@gmail.com'), 'user');

});


test('getLocalPart returns null for no @', function () {

  assert.equal(ContactEmail.getLocalPart('usergmail.com'), null);

});


test('getLocalPart returns null for empty local', function () {

  assert.equal(ContactEmail.getLocalPart('@gmail.com'), null);

});



// ~~~~~~~~~~~~~~~~~~~~ validateSyntax ~~~~~~~~~~~~~~~~~~~~

test('validateSyntax accepts valid email', function () {

  const result = ContactEmail.validateSyntax('user@gmail.com');
  assert.equal(result.success, true);
  assert.equal(result.error, null);

});


test('validateSyntax rejects empty email', function () {

  const result = ContactEmail.validateSyntax('');
  assert.equal(result.success, false);
  assert.equal(result.error.type, 'CONTACT_EMAIL_EMPTY');

});


test('validateSyntax rejects email without @', function () {

  const result = ContactEmail.validateSyntax('usergmail.com');
  assert.equal(result.success, false);
  assert.equal(result.error.type, 'CONTACT_EMAIL_NO_AT');

});


test('validateSyntax rejects email with multiple @', function () {

  const result = ContactEmail.validateSyntax('user@@gmail.com');
  assert.equal(result.success, false);
  assert.equal(result.error.type, 'CONTACT_EMAIL_MULTIPLE_AT');

});


test('validateSyntax rejects empty local part', function () {

  const result = ContactEmail.validateSyntax('@gmail.com');
  assert.equal(result.success, false);
  assert.equal(result.error.type, 'CONTACT_EMAIL_EMPTY_LOCAL');

});


test('validateSyntax rejects empty domain part', function () {

  const result = ContactEmail.validateSyntax('user@');
  assert.equal(result.success, false);
  assert.equal(result.error.type, 'CONTACT_EMAIL_EMPTY_DOMAIN');

});



// ~~~~~~~~~~~~~~~~~~~~ validateDisposable ~~~~~~~~~~~~~~~~~~~~

test('validateDisposable rejects disposable domain', function () {

  const result = ContactEmail.validateDisposable('user@mailinator.com');
  assert.equal(result.success, false);
  assert.equal(result.error.type, 'CONTACT_EMAIL_DISPOSABLE');

});


test('validateDisposable accepts non-disposable domain', function () {

  const result = ContactEmail.validateDisposable('user@gmail.com');
  assert.equal(result.success, true);
  assert.equal(result.error, null);

});


test('validateDisposable returns success for email without @', function () {

  // No domain to check - not a disposable check failure
  const result = ContactEmail.validateDisposable('usergmail.com');
  assert.equal(result.success, true);
  assert.equal(result.error, null);

});



// ~~~~~~~~~~~~~~~~~~~~ isDisposableDomain ~~~~~~~~~~~~~~~~~~~~

test('isDisposableDomain returns true for disposable domain', function () {

  assert.equal(ContactEmail.isDisposableDomain('mailinator.com'), true);

});


test('isDisposableDomain returns false for non-disposable domain', function () {

  assert.equal(ContactEmail.isDisposableDomain('gmail.com'), false);

});



// ~~~~~~~~~~~~~~~~~~~~ canonicalize ~~~~~~~~~~~~~~~~~~~~

test('canonicalize folds Gmail dots', function () {

  assert.equal(ContactEmail.canonicalize('user.name@gmail.com'), 'username@gmail.com');

});


test('canonicalize removes Gmail plus tags', function () {

  assert.equal(ContactEmail.canonicalize('user+tag@gmail.com'), 'user@gmail.com');

});


test('canonicalize folds Gmail dots and plus tags together', function () {

  assert.equal(ContactEmail.canonicalize('user.name+tag@gmail.com'), 'username@gmail.com');

});


test('canonicalize does not fold non-Gmail domains', function () {

  assert.equal(ContactEmail.canonicalize('user.name@yahoo.com'), 'user.name@yahoo.com');

});


test('canonicalize returns null for invalid email', function () {

  assert.equal(ContactEmail.canonicalize('invalid'), null);

});


// ~~~~~~~~~~~~~~~~~~~~ Length limits (defect B1 regression) ~~~~~~~~~~~~~~~~~~~~
// The legacy module guarded its max-length check with isNullOrUndefined(max_length),
// so the check only ran when no limit was configured and then compared against null.
// It therefore never rejected anything. These tests pin the limits as enforced.

test('validateSyntax rejects an address over EMAIL_MAX_LENGTH', function () {

  // 246 local + '@' + 'a.com' (5) = 252, under both part limits but over 254 overall
  const local = 'a'.repeat(246);
  const result = ContactEmail.validateSyntax(local + '@' + 'b'.repeat(250) + '.com');

  assert.equal(result.success, false);
  assert.equal(result.error.type, 'CONTACT_EMAIL_TOO_LONG');

});


test('validateSyntax rejects a local part over LOCAL_MAX_LENGTH', function () {

  // 65 characters before @, one over the RFC 5321 limit of 64
  const result = ContactEmail.validateSyntax('a'.repeat(65) + '@gmail.com');

  assert.equal(result.success, false);
  assert.equal(result.error.type, 'CONTACT_EMAIL_LOCAL_TOO_LONG');

});


test('validateSyntax accepts a local part exactly at LOCAL_MAX_LENGTH', function () {

  // 64 characters before @ is the boundary and must be accepted
  const result = ContactEmail.validateSyntax('a'.repeat(64) + '@gmail.com');

  assert.equal(result.success, true);

});


test('validateSyntax accepts an address exactly at EMAIL_MAX_LENGTH', function () {

  // 64 local + '@' + 189 domain = 254 exactly, the boundary
  const address = 'a'.repeat(64) + '@' + 'b'.repeat(185) + '.com';

  assert.equal(address.length, 254);
  assert.equal(ContactEmail.validateSyntax(address).success, true);

});


// ~~~~~~~~~~~~~~~~~~~~ Verb uniformity ~~~~~~~~~~~~~~~~~~~~
// Every exported name must begin with a verb taken from the published
// catalog. This is the guard that keeps construct/deconstruct out: they
// read naturally, they are what the legacy source used, and they are a
// second answer to a question create/parse and format/parse already settle.

test('every exported function name begins with an approved verb', function () {

  // The approved set, plus canonicalize as a recorded exception
  const approved = ['sanitize', 'validate', 'is', 'list', 'get', 'create', 'parse', 'format'];
  const exceptions = ['canonicalize'];

  // Check each exported name against the set
  const names = Object.keys(ContactEmail);

  for (let i = 0; i < names.length; i++) {
    const name = names[i];

    // An explicitly recorded exception is allowed through
    if (exceptions.indexOf(name) !== -1) {
      continue;
    }

    // Match the leading verb
    const matched = approved.some(function (verb) {
      return name.startsWith(verb);
    });

    assert.ok(matched, name + ' does not begin with an approved verb');
  }

});


test('no exported name uses the banned construct or deconstruct verbs', function () {

  // The specific drift this family was drafted with before the audit caught it
  const names = Object.keys(ContactEmail);

  for (let i = 0; i < names.length; i++) {
    assert.ok(!names[i].startsWith('construct'), names[i] + ' uses the banned construct verb');
    assert.ok(!names[i].startsWith('deconstruct'), names[i] + ' uses the banned deconstruct verb');
  }

});
