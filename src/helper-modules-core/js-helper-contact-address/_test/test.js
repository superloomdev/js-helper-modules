// Info: Test suite for helper-contact-address.
'use strict';


const { test } = require('node:test');
const assert = require('node:assert/strict');

const { ContactAddress, Lib } = require('./loader');



// ~~~~~~~~~~~~~~~~~~~~ Construction ~~~~~~~~~~~~~~~~~~~~

test('construction with valid adapter succeeds', function () {

  assert.equal(typeof ContactAddress, 'object');
  assert.equal(typeof ContactAddress.validateSyntax, 'function');

});


test('construction without adapter throws', function () {

  assert.throws(function () {
    require('helper-contact-address')(Lib, {});
  }, /CONFIG\.Adapter must be/);

});



// ~~~~~~~~~~~~~~~~~~~~ sanitizePostalCode ~~~~~~~~~~~~~~~~~~~~

test('sanitizePostalCode strips disallowed characters', function () {

  assert.equal(ContactAddress.sanitizePostalCode('90210!@#'), '90210');
  assert.equal(ContactAddress.sanitizePostalCode('110 001'), '110 001');
  assert.equal(ContactAddress.sanitizePostalCode('SW1A 1AA'), 'SW1A 1AA');

});


test('sanitizePostalCode non-string throws TypeError', function () {

  assert.throws(function () {
    ContactAddress.sanitizePostalCode(123);
  }, TypeError);

});



// ~~~~~~~~~~~~~~~~~~~~ validateSyntax: required fields ~~~~~~~~~~~~~~~~~~~~

test('validateSyntax rejects empty required field', function () {

  const result = ContactAddress.validateSyntax('line_1', '', {});
  assert.equal(result.success, false);
  assert.equal(result.error.type, 'CONTACT_ADDRESS_EMPTY');

});


test('validateSyntax rejects null required field', function () {

  const result = ContactAddress.validateSyntax('locality', null, {});
  assert.equal(result.success, false);
  assert.equal(result.error.type, 'CONTACT_ADDRESS_EMPTY');

});


test('validateSyntax accepts non-empty required field', function () {

  const result = ContactAddress.validateSyntax('line_1', '123 Main St', {});
  assert.equal(result.success, true);

});



// ~~~~~~~~~~~~~~~~~~~~ validateSyntax: optional fields ~~~~~~~~~~~~~~~~~~~~

test('validateSyntax accepts empty optional field', function () {

  const result = ContactAddress.validateSyntax('line_2', '', {});
  assert.equal(result.success, true);

});


test('validateSyntax accepts null optional field', function () {

  const result = ContactAddress.validateSyntax('landmark', null, {});
  assert.equal(result.success, true);

});



// ~~~~~~~~~~~~~~~~~~~~ validateSyntax: length bounds ~~~~~~~~~~~~~~~~~~~~

test('validateSyntax rejects too-long field', function () {

  const longValue = 'a'.repeat(201);
  const result = ContactAddress.validateSyntax('line_1', longValue, {});
  assert.equal(result.success, false);
  assert.equal(result.error.type, 'CONTACT_ADDRESS_TOO_LONG');

});



// ~~~~~~~~~~~~~~~~~~~~ validateSyntax: country ~~~~~~~~~~~~~~~~~~~~

test('validateSyntax accepts valid country', function () {

  const result = ContactAddress.validateSyntax('country', 'us', {});
  assert.equal(result.success, true);

});


test('validateSyntax rejects invalid country', function () {

  const result = ContactAddress.validateSyntax('country', 'zz', {});
  assert.equal(result.success, false);
  assert.equal(result.error.type, 'CONTACT_ADDRESS_INVALID_COUNTRY');

});



// ~~~~~~~~~~~~~~~~~~~~ validateSyntax: tag ~~~~~~~~~~~~~~~~~~~~

test('validateSyntax accepts valid tag', function () {

  assert.equal(ContactAddress.validateSyntax('tag', 'home', {}).success, true);
  assert.equal(ContactAddress.validateSyntax('tag', 'work', {}).success, true);
  assert.equal(ContactAddress.validateSyntax('tag', 'other', {}).success, true);

});


test('validateSyntax rejects invalid tag', function () {

  const result = ContactAddress.validateSyntax('tag', 'invalid', {});
  assert.equal(result.success, false);
  assert.equal(result.error.type, 'CONTACT_ADDRESS_INVALID_TAG');

});



// ~~~~~~~~~~~~~~~~~~~~ validateSyntax: coordinates ~~~~~~~~~~~~~~~~~~~~

test('validateSyntax accepts valid coordinates', function () {

  const result = ContactAddress.validateSyntax('coordinates', { latitude: 37.7749, longitude: -122.4194 }, {});
  assert.equal(result.success, true);

});


test('validateSyntax rejects invalid coordinates (out of range)', function () {

  const result = ContactAddress.validateSyntax('coordinates', { latitude: 91, longitude: 0 }, {});
  assert.equal(result.success, false);
  assert.equal(result.error.type, 'CONTACT_ADDRESS_INVALID_COORDINATES');

});


test('validateSyntax rejects non-object coordinates', function () {

  const result = ContactAddress.validateSyntax('coordinates', 'not coords', {});
  assert.equal(result.success, false);
  assert.equal(result.error.type, 'CONTACT_ADDRESS_INVALID_COORDINATES');

});



// ~~~~~~~~~~~~~~~~~~~~ validateSyntax: postal_code ~~~~~~~~~~~~~~~~~~~~

test('validateSyntax accepts valid US postal code', function () {

  const result = ContactAddress.validateSyntax('postal_code', '90210', { country_code: 'us' });
  assert.equal(result.success, true);

});


test('validateSyntax rejects too-short postal code', function () {

  const result = ContactAddress.validateSyntax('postal_code', '902', { country_code: 'us' });
  assert.equal(result.success, false);
  assert.equal(result.error.type, 'CONTACT_ADDRESS_TOO_SHORT');

});


test('validateSyntax accepts postal code for country with no postal system', function () {

  // ae has no postal system - any value is accepted by the adapter
  const result = ContactAddress.validateSyntax('postal_code', 'N/A', { country_code: 'ae' });
  assert.equal(result.success, true);

});



// ~~~~~~~~~~~~~~~~~~~~ validateAddress ~~~~~~~~~~~~~~~~~~~~

test('validateAddress rejects incomplete address', function () {

  const result = ContactAddress.validateAddress({
    line_1: '123 Main St',
    country: 'us'
    // missing required fields: locality, subdivision, postal_code
  });

  assert.equal(result.success, false);
  assert.ok(result.errors.length > 0);

});


test('validateAddress accepts complete address', function () {

  const result = ContactAddress.validateAddress({
    line_1: '123 Main St',
    locality: 'Springfield',
    subdivision: 'IL',
    postal_code: '62701',
    country: 'us'
  });

  assert.equal(result.success, true);
  assert.equal(result.errors.length, 0);

});


test('validateAddress returns all errors', function () {

  const result = ContactAddress.validateAddress({
    country: 'zz',
    tag: 'invalid'
  });

  assert.equal(result.success, false);
  assert.ok(result.errors.length >= 5, 'should have multiple errors');

});



// ~~~~~~~~~~~~~~~~~~~~ createAddress ~~~~~~~~~~~~~~~~~~~~

test('createAddress normalizes country code', function () {

  const result = ContactAddress.createAddress({
    line_1: '123 Main St',
    country: 'US'
  });

  assert.equal(result.country, 'us');

});


test('createAddress trims string fields', function () {

  const result = ContactAddress.createAddress({
    line_1: '  123 Main St  ',
    locality: '  Springfield  '
  });

  assert.equal(result.line_1, '123 Main St');
  assert.equal(result.locality, 'Springfield');

});


test('createAddress returns empty object for non-object input', function () {

  assert.deepEqual(ContactAddress.createAddress(null), {});
  assert.deepEqual(ContactAddress.createAddress('string'), {});

});



// ~~~~~~~~~~~~~~~~~~~~ listSubdivisions ~~~~~~~~~~~~~~~~~~~~

test('listSubdivisions returns null from stub adapter', function () {

  const result = ContactAddress.listSubdivisions('us');
  assert.equal(result.success, true);
  assert.equal(result.subdivisions, null);

});



// ~~~~~~~~~~~~~~~~~~~~ getFieldPolicy ~~~~~~~~~~~~~~~~~~~~

test('getFieldPolicy returns the policy', function () {

  const policy = ContactAddress.getFieldPolicy();

  assert.equal(policy.line_1, 'required');
  assert.equal(policy.line_2, 'optional');
  assert.equal(policy.country, 'required');

});


test('getFieldPolicy returns a copy', function () {

  const policy1 = ContactAddress.getFieldPolicy();
  policy1.line_1 = 'optional';

  const policy2 = ContactAddress.getFieldPolicy();
  assert.equal(policy2.line_1, 'required');

});
