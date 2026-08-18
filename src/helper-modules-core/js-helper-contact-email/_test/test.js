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
