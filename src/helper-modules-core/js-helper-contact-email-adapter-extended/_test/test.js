// Info: Test suite for helper-contact-email-adapter-extended.
'use strict';


const { test } = require('node:test');
const assert = require('node:assert/strict');

const { Adapter, BasicAdapter, ContactEmail, ContactEmailBasic } = require('./loader');



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
// Both adapters are loaded and driven through identical call sites, because
// asserting only against the extended adapter proves nothing about the pair.

test('swap: both adapters expose the identical contract surface', function () {

  // The three contract method names must match exactly, in both directions
  assert.deepEqual(Object.keys(Adapter).sort(), Object.keys(BasicAdapter).sort());

});


test('swap: both adapters accept the same valid address', function () {

  // A plain address is inside both adapters' competence
  assert.equal(Adapter.validateSyntax('user@gmail.com').valid, true);
  assert.equal(BasicAdapter.validateSyntax('user@gmail.com').valid, true);

});


test('swap: both adapters agree on every shared structural reason', function () {

  // These four failures are structural, so the reason strings must match
  const cases = ['', 'usergmail.com', 'user@@gmail.com', '@gmail.com'];

  for (let i = 0; i < cases.length; i++) {
    const input = cases[i];

    // Same input, both adapters
    const extended = Adapter.validateSyntax(input);
    const basic = BasicAdapter.validateSyntax(input);

    assert.equal(extended.valid, false, 'extended accepted ' + JSON.stringify(input));
    assert.equal(basic.valid, false, 'basic accepted ' + JSON.stringify(input));
    assert.equal(extended.reason, basic.reason, 'reason disagrees for ' + JSON.stringify(input));
  }

});


test('swap: identical call sites through the core return identical verdicts', function () {

  // The caller's code does not change with the adapter
  const cases = ['user@gmail.com', '', 'usergmail.com', 'user@@gmail.com'];

  for (let i = 0; i < cases.length; i++) {
    const input = cases[i];

    assert.equal(
      ContactEmail.validateSyntax(input).success,
      ContactEmailBasic.validateSyntax(input).success,
      'success disagrees for ' + JSON.stringify(input)
    );
  }

});


test('swap: the core enforces length identically under both adapters', function () {

  // Length is a core concern, so both wirings must reject the same over-long address
  const too_long = 'a'.repeat(65) + '@gmail.com';

  assert.equal(ContactEmail.validateSyntax(too_long).error.type, 'CONTACT_EMAIL_LOCAL_TOO_LONG');
  assert.equal(ContactEmailBasic.validateSyntax(too_long).error.type, 'CONTACT_EMAIL_LOCAL_TOO_LONG');

});


test('swap: only the extended adapter carries disposable-domain data', function () {

  // The documented depth difference, pinned so it stays deliberate
  assert.equal(BasicAdapter.isDisposableDomain('mailinator.com'), false);
  assert.equal(Adapter.isDisposableDomain('mailinator.com'), true);

});
