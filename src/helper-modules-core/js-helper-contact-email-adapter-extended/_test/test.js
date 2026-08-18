// Info: Test suite for helper-contact-email-adapter-extended.
'use strict';


const { test } = require('node:test');
const assert = require('node:assert/strict');

const { Adapter, ContactEmail } = require('./loader');



// ~~~~~~~~~~~~~~~~~~~~ Adapter Contract ~~~~~~~~~~~~~~~~~~~~

test('adapter exposes 3 contract methods', function () {

  assert.equal(typeof Adapter.validateSyntax, 'function');
  assert.equal(typeof Adapter.isDisposableDomain, 'function');
  assert.equal(typeof Adapter.canonicalize, 'function');

});



// ~~~~~~~~~~~~~~~~~~~~ validateSyntax ~~~~~~~~~~~~~~~~~~~~

test('validateSyntax accepts valid email', function () {

  const result = Adapter.validateSyntax('user@gmail.com');
  assert.equal(result.valid, true);
  assert.equal(result.reason, null);

});


test('validateSyntax accepts complex valid email', function () {

  const result = Adapter.validateSyntax('user.name+tag@sub.example.com');
  assert.equal(result.valid, true);

});


test('validateSyntax rejects empty', function () {

  assert.equal(Adapter.validateSyntax('').reason, 'CONTACT_EMAIL_EMPTY');

});


test('validateSyntax rejects no @', function () {

  assert.equal(Adapter.validateSyntax('usergmail.com').reason, 'CONTACT_EMAIL_NO_AT');

});


test('validateSyntax rejects multiple @', function () {

  assert.equal(Adapter.validateSyntax('user@@gmail.com').reason, 'CONTACT_EMAIL_MULTIPLE_AT');

});


test('validateSyntax rejects empty local', function () {

  assert.equal(Adapter.validateSyntax('@gmail.com').reason, 'CONTACT_EMAIL_EMPTY_LOCAL');

});


test('validateSyntax rejects empty domain', function () {

  assert.equal(Adapter.validateSyntax('user@').reason, 'CONTACT_EMAIL_EMPTY_DOMAIN');

});


test('validateSyntax rejects invalid syntax', function () {

  assert.equal(Adapter.validateSyntax('user@gmail').reason, 'CONTACT_EMAIL_INVALID_SYNTAX');

});



// ~~~~~~~~~~~~~~~~~~~~ isDisposableDomain ~~~~~~~~~~~~~~~~~~~~

test('isDisposableDomain returns true for known disposable domain', function () {

  assert.equal(Adapter.isDisposableDomain('mailinator.com'), true);

});


test('isDisposableDomain returns false for non-disposable domain', function () {

  assert.equal(Adapter.isDisposableDomain('gmail.com'), false);

});


test('isDisposableDomain is case-insensitive', function () {

  assert.equal(Adapter.isDisposableDomain('Mailinator.com'), true);

});



// ~~~~~~~~~~~~~~~~~~~~ canonicalize ~~~~~~~~~~~~~~~~~~~~

test('canonicalize folds Gmail dots', function () {

  const result = Adapter.canonicalize('user.name@gmail.com');
  assert.ok(result !== null);
  assert.ok(result.includes('username'));
  assert.ok(result.includes('gmail.com'));

});


test('canonicalize removes Gmail plus tags', function () {

  const result = Adapter.canonicalize('user+tag@gmail.com');
  assert.ok(result !== null);
  assert.ok(result.includes('user'));
  assert.ok(!result.includes('tag'));

});


test('canonicalize returns null for invalid', function () {

  assert.equal(Adapter.canonicalize('invalid'), null);

});



// ~~~~~~~~~~~~~~~~~~~~ Integration with core ~~~~~~~~~~~~~~~~~~~~

test('core validateSyntax works through extended adapter', function () {

  const result = ContactEmail.validateSyntax('user@gmail.com');
  assert.equal(result.success, true);

});


test('core validateDisposable rejects disposable through extended adapter', function () {

  const result = ContactEmail.validateDisposable('user@mailinator.com');
  assert.equal(result.success, false);
  assert.equal(result.error.type, 'CONTACT_EMAIL_DISPOSABLE');

});


test('core isDisposableDomain returns true through extended adapter', function () {

  assert.equal(ContactEmail.isDisposableDomain('mailinator.com'), true);

});


test('core canonicalize works through extended adapter', function () {

  const result = ContactEmail.canonicalize('user.name@gmail.com');
  assert.ok(result !== null);

});



// ~~~~~~~~~~~~~~~~~~~~ Swap proof ~~~~~~~~~~~~~~~~~~~~

test('swap: valid email accepted by extended adapter', function () {

  const result = Adapter.validateSyntax('user@gmail.com');
  assert.equal(result.valid, true);

});


test('swap: empty rejected with same reason as basic', function () {

  assert.equal(Adapter.validateSyntax('').reason, 'CONTACT_EMAIL_EMPTY');

});


test('swap: no @ rejected with same reason as basic', function () {

  assert.equal(Adapter.validateSyntax('usergmail.com').reason, 'CONTACT_EMAIL_NO_AT');

});
