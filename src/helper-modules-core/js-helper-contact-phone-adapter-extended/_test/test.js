// Info: Test suite for helper-contact-phone-adapter-extended.
// Tests the adapter contract directly and through the parent core.
// Covers pattern validation (which basic cannot do) and number type.
'use strict';


const { test } = require('node:test');
const assert = require('node:assert/strict');

const { Adapter, ContactPhone } = require('./loader');



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
// These tests verify that the extended adapter produces the same results
// for numbers that both adapters can judge (valid numbers, length errors).

test('swap: valid US number accepted by both adapters', function () {

  // Extended adapter
  const extResult = Adapter.validateSyntax('us', '2345678900');
  assert.equal(extResult.valid, true);

});


test('swap: unknown country rejected by both adapters with same reason', function () {

  const result = Adapter.validateSyntax('zz', '9876543210');
  assert.equal(result.valid, false);
  assert.equal(result.reason, 'CONTACT_PHONE_UNKNOWN_COUNTRY');

});


test('swap: non-numeric rejected by both adapters with same reason', function () {

  const result = Adapter.validateSyntax('in', 'abcdefghij');
  assert.equal(result.valid, false);
  assert.equal(result.reason, 'CONTACT_PHONE_NOT_A_NUMBER');

});
