// Info: Test suite for helper-contact-email-adapter-basic.


import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Adapter, ContactEmail } from './loader.js';



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


test('validateSyntax accepts valid email with dots and plus', function () {

  const result = Adapter.validateSyntax('user.name+tag@example.com');
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

test('isDisposableDomain always returns false', function () {

  assert.equal(Adapter.isDisposableDomain('mailinator.com'), false);
  assert.equal(Adapter.isDisposableDomain('gmail.com'), false);
  assert.equal(Adapter.isDisposableDomain('guerrillamail.com'), false);

});



// ~~~~~~~~~~~~~~~~~~~~ canonicalize ~~~~~~~~~~~~~~~~~~~~

test('canonicalize folds Gmail dots', function () {

  assert.equal(Adapter.canonicalize('user.name@gmail.com'), 'username@gmail.com');

});


test('canonicalize removes Gmail plus tags', function () {

  assert.equal(Adapter.canonicalize('user+tag@gmail.com'), 'user@gmail.com');

});


test('canonicalize normalizes googlemail.com to gmail.com', function () {

  assert.equal(Adapter.canonicalize('user.name@googlemail.com'), 'username@gmail.com');

});


test('canonicalize lowercases non-Gmail', function () {

  assert.equal(Adapter.canonicalize('User.Name@Yahoo.Com'), 'user.name@yahoo.com');

});


test('canonicalize returns null for invalid', function () {

  assert.equal(Adapter.canonicalize('invalid'), null);

});



// ~~~~~~~~~~~~~~~~~~~~ Integration with core ~~~~~~~~~~~~~~~~~~~~

test('core validateSyntax works through basic adapter', function () {

  const result = ContactEmail.validateSyntax('user@gmail.com');
  assert.equal(result.success, true);

});


test('core isDisposableDomain returns false through basic adapter', function () {

  assert.equal(ContactEmail.isDisposableDomain('mailinator.com'), false);

});


test('core canonicalize works through basic adapter', function () {

  assert.equal(ContactEmail.canonicalize('user.name@gmail.com'), 'username@gmail.com');

});
