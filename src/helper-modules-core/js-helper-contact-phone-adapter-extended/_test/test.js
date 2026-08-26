// Info: Test suite for helper-contact-phone-adapter-extended.
// Tests the adapter contract directly and through the parent core.
// Covers pattern validation (which basic cannot do) and number type.


import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Adapter, BasicAdapter, ContactPhone, ContactPhoneBasic } from './loader.js';



// ~~~~~~~~~~~~~~~~~~~~ Adapter Contract ~~~~~~~~~~~~~~~~~~~~

test('adapter exposes 4 contract methods', function () {

  assert.equal(typeof Adapter.listCountries, 'function');
  assert.equal(typeof Adapter.getMetadata, 'function');
  assert.equal(typeof Adapter.validateSyntax, 'function');
  assert.equal(typeof Adapter.getNumberType, 'function');

});


test('listCountries returns non-empty array', function () {

  const countries = Adapter.listCountries();

  assert.ok(Array.isArray(countries));
  assert.ok(countries.length > 200, 'should have 200+ countries');

});


test('listCountries includes known countries', function () {

  const countries = Adapter.listCountries();

  assert.ok(countries.includes('us'));
  assert.ok(countries.includes('in'));
  assert.ok(countries.includes('gb'));

});



// ~~~~~~~~~~~~~~~~~~~~ getMetadata ~~~~~~~~~~~~~~~~~~~~

test('getMetadata returns metadata for known countries', function () {

  const us = Adapter.getMetadata('us');
  assert.equal(us.calling_code, '1');
  assert.equal(typeof us.min_length, 'number');
  assert.equal(typeof us.max_length, 'number');

  const inMeta = Adapter.getMetadata('in');
  assert.equal(inMeta.calling_code, '91');

});


test('getMetadata returns null for unknown country', function () {

  assert.equal(Adapter.getMetadata('zz'), null);

});



// ~~~~~~~~~~~~~~~~~~~~ validateSyntax ~~~~~~~~~~~~~~~~~~~~

test('validateSyntax accepts valid US number', function () {

  const result = Adapter.validateSyntax('us', '2345678900');
  assert.equal(result.valid, true);
  assert.equal(result.reason, null);

});


test('validateSyntax accepts valid India mobile', function () {

  const result = Adapter.validateSyntax('in', '9876543210');
  assert.equal(result.valid, true);
  assert.equal(result.reason, null);

});


test('validateSyntax rejects unknown country', function () {

  const result = Adapter.validateSyntax('zz', '9876543210');
  assert.equal(result.valid, false);
  assert.equal(result.reason, 'CONTACT_PHONE_UNKNOWN_COUNTRY');

});


test('validateSyntax rejects non-numeric input', function () {

  const result = Adapter.validateSyntax('in', 'abcdefghij');
  assert.equal(result.valid, false);
  assert.equal(result.reason, 'CONTACT_PHONE_NOT_A_NUMBER');

});


test('validateSyntax rejects too-short number', function () {

  const result = Adapter.validateSyntax('us', '123');
  assert.equal(result.valid, false);
  // Could be TOO_SHORT or INVALID_PATTERN depending on libphonenumber-js
  assert.ok(
    result.reason === 'CONTACT_PHONE_TOO_SHORT' || result.reason === 'CONTACT_PHONE_INVALID_PATTERN',
    'expected TOO_SHORT or INVALID_PATTERN, got ' + result.reason
  );

});


test('validateSyntax rejects too-long number', function () {

  const result = Adapter.validateSyntax('us', '12345678901234');
  assert.equal(result.valid, false);
  assert.ok(
    result.reason === 'CONTACT_PHONE_TOO_LONG' || result.reason === 'CONTACT_PHONE_INVALID_PATTERN',
    'expected TOO_LONG or INVALID_PATTERN, got ' + result.reason
  );

});


test('validateSyntax rejects wrong pattern (India all-zeros)', function () {

  // 0000000000 has the right length but an invalid digit pattern
  const result = Adapter.validateSyntax('in', '0000000000');
  assert.equal(result.valid, false);
  assert.equal(result.reason, 'CONTACT_PHONE_INVALID_PATTERN');

});



// ~~~~~~~~~~~~~~~~~~~~ getNumberType ~~~~~~~~~~~~~~~~~~~~

test('getNumberType returns type for valid US number', function () {

  // US numbers have type classification in libphonenumber-js metadata
  const type = Adapter.getNumberType('us', '2155551234');
  assert.ok(type !== null, 'should return a type');
  assert.equal(type, 'FIXED_LINE_OR_MOBILE');

});


test('getNumberType returns null for invalid number', function () {

  const type = Adapter.getNumberType('in', 'abc');
  assert.equal(type, null);

});


test('getNumberType returns null for unknown country', function () {

  const type = Adapter.getNumberType('zz', '9876543210');
  assert.equal(type, null);

});



// ~~~~~~~~~~~~~~~~~~~~ Integration with parent core ~~~~~~~~~~~~~~~~~~~~

test('core validateSyntax works through extended adapter', function () {

  const result = ContactPhone.validateSyntax('in', '9876543210');
  assert.equal(result.success, true);
  assert.equal(result.error, null);

});


test('core formatE164 works through extended adapter', function () {

  const result = ContactPhone.formatE164('in', '9876543210');
  assert.equal(result, '+919876543210');

});


test('core getNumberType returns type through extended adapter', function () {

  const result = ContactPhone.getNumberType('us', '2155551234');
  assert.equal(result.success, true);
  assert.ok(result.type !== null, 'should return a type');

});


test('core createPhoneId works through extended adapter', function () {

  const result = ContactPhone.createPhoneId('us', '2345678900');
  assert.equal(result, 'us.0098765432');

});


test('core parseE164 works through extended adapter', function () {

  const result = ContactPhone.parseE164('+919876543210');
  assert.deepEqual(result, {
    country_code: 'in',
    national_number: '9876543210'
  });

});



// ~~~~~~~~~~~~~~~~~~~~ Swap proof: same call sites as basic ~~~~~~~~~~~~~~~~~~~~
// Both adapters are loaded and driven through identical call sites. The
// contract Decision D2 protects is that swapping the adapter changes depth,
// never the call site and never the reason vocabulary a caller branches on.
// Asserting only against the extended adapter would prove nothing about the
// pair, so every test below calls both.

test('swap: both adapters expose the identical contract surface', function () {

  // The four contract method names must match exactly, in both directions
  const extended_methods = Object.keys(Adapter).sort();
  const basic_methods = Object.keys(BasicAdapter).sort();

  assert.deepEqual(extended_methods, basic_methods);

});


test('swap: both adapters accept the same valid US number', function () {

  // A number both adapters can judge must be accepted by both
  assert.equal(Adapter.validateSyntax('us', '2345678900').valid, true);
  assert.equal(BasicAdapter.validateSyntax('us', '2345678900').valid, true);

});


test('swap: both adapters reject an unknown country with the same reason', function () {

  // Reason strings must agree, not just the valid flag
  const extended = Adapter.validateSyntax('zz', '9876543210');
  const basic = BasicAdapter.validateSyntax('zz', '9876543210');

  assert.equal(extended.valid, false);
  assert.equal(basic.valid, false);
  assert.equal(extended.reason, basic.reason);
  assert.equal(extended.reason, 'CONTACT_PHONE_UNKNOWN_COUNTRY');

});


test('swap: both adapters reject a non-numeric input with the same reason', function () {

  // Charset rejection is inside both adapters' competence
  const extended = Adapter.validateSyntax('in', 'abcdefghij');
  const basic = BasicAdapter.validateSyntax('in', 'abcdefghij');

  assert.equal(extended.valid, false);
  assert.equal(basic.valid, false);
  assert.equal(extended.reason, basic.reason);
  assert.equal(extended.reason, 'CONTACT_PHONE_NOT_A_NUMBER');

});


test('swap: both adapters report the same calling code for a country', function () {

  // Metadata that both carry must agree, or a formatted E.164 differs by adapter
  const countries = ['us', 'in', 'gb', 'de', 'ae'];

  for (let i = 0; i < countries.length; i++) {
    const code = countries[i];

    assert.equal(
      Adapter.getMetadata(code).calling_code,
      BasicAdapter.getMetadata(code).calling_code,
      'calling_code disagrees for ' + code
    );
  }

});


test('swap: identical call sites through the core return identical verdicts', function () {

  // The whole point of D2: the caller's code does not change with the adapter
  const cases = [
    ['us', '2345678900'],
    ['in', '9876543210'],
    ['zz', '9876543210'],
    ['in', 'abcdefghij']
  ];

  for (let i = 0; i < cases.length; i++) {
    const country = cases[i][0];
    const number = cases[i][1];

    // Same function, same arguments, different wired adapter
    const extended = ContactPhone.validateSyntax(country, number);
    const basic = ContactPhoneBasic.validateSyntax(country, number);

    assert.equal(extended.success, basic.success, 'success disagrees for ' + country + '/' + number);
  }

});


test('swap: only the extended adapter can classify number type', function () {

  // The documented depth difference, pinned so it stays deliberate
  assert.equal(BasicAdapter.getNumberType('us', '2345678900'), null);
  assert.notEqual(Adapter.getNumberType('us', '2345678900'), null);

});
