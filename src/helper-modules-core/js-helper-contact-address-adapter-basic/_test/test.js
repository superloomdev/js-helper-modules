// Info: Test suite for helper-contact-address-adapter-basic.
'use strict';


const { test } = require('node:test');
const assert = require('node:assert/strict');

const { Adapter, ContactAddress } = require('./loader');



// ~~~~~~~~~~~~~~~~~~~~ Adapter Contract ~~~~~~~~~~~~~~~~~~~~

test('adapter exposes 5 contract methods', function () {

  assert.equal(typeof Adapter.listCountries, 'function');
  assert.equal(typeof Adapter.getPostalRule, 'function');
  assert.equal(typeof Adapter.listSubdivisions, 'function');
  assert.equal(typeof Adapter.validatePostalCode, 'function');
  assert.equal(typeof Adapter.validateSubdivision, 'function');

});


test('listCountries returns non-empty array', function () {

  const countries = Adapter.listCountries();

  assert.ok(Array.isArray(countries));
  assert.ok(countries.length > 200);

});


test('listCountries includes known countries', function () {

  const countries = Adapter.listCountries();

  assert.ok(countries.includes('us'));
  assert.ok(countries.includes('in'));
  assert.ok(countries.includes('gb'));

});



// ~~~~~~~~~~~~~~~~~~~~ getPostalRule ~~~~~~~~~~~~~~~~~~~~

test('getPostalRule returns rule for known country', function () {

  const rule = Adapter.getPostalRule('us');

  assert.ok(rule);
  assert.equal(rule.min_length, 5);
  assert.equal(rule.max_length, 10);
  assert.equal(rule.required, true);
  assert.equal(rule.pattern, null);

});


test('getPostalRule returns null for unknown country', function () {

  assert.equal(Adapter.getPostalRule('zz'), null);

});


test('getPostalRule returns required=false for country with no postal system', function () {

  const rule = Adapter.getPostalRule('ae');

  assert.equal(rule.required, false);

});



// ~~~~~~~~~~~~~~~~~~~~ listSubdivisions ~~~~~~~~~~~~~~~~~~~~

test('listSubdivisions always returns null', function () {

  assert.equal(Adapter.listSubdivisions('us'), null);
  assert.equal(Adapter.listSubdivisions('in'), null);

});



// ~~~~~~~~~~~~~~~~~~~~ validatePostalCode ~~~~~~~~~~~~~~~~~~~~

test('validatePostalCode accepts valid US postal code', function () {

  const result = Adapter.validatePostalCode('us', '90210');
  assert.equal(result.valid, true);
  assert.equal(result.reason, null);

});


test('validatePostalCode accepts valid US ZIP+4', function () {

  const result = Adapter.validatePostalCode('us', '90210-1234');
  assert.equal(result.valid, true);

});


test('validatePostalCode rejects too-short postal code', function () {

  const result = Adapter.validatePostalCode('us', '902');
  assert.equal(result.valid, false);
  assert.equal(result.reason, 'CONTACT_ADDRESS_TOO_SHORT');

});


test('validatePostalCode rejects too-long postal code', function () {

  const result = Adapter.validatePostalCode('us', '12345678901');
  assert.equal(result.valid, false);
  assert.equal(result.reason, 'CONTACT_ADDRESS_TOO_LONG');

});


test('validatePostalCode accepts any value for no-postal-system country', function () {

  const result = Adapter.validatePostalCode('ae', 'anything');
  assert.equal(result.valid, true);

});


test('validatePostalCode rejects unknown country', function () {

  const result = Adapter.validatePostalCode('zz', '12345');
  assert.equal(result.valid, false);
  assert.equal(result.reason, 'CONTACT_ADDRESS_INVALID_COUNTRY');

});



// ~~~~~~~~~~~~~~~~~~~~ validateSubdivision ~~~~~~~~~~~~~~~~~~~~

test('validateSubdivision always returns valid', function () {

  const result = Adapter.validateSubdivision('us', 'CA');
  assert.equal(result.valid, true);
  assert.equal(result.reason, null);

});



// ~~~~~~~~~~~~~~~~~~~~ Integration with core ~~~~~~~~~~~~~~~~~~~~

test('core validateSyntax works through basic adapter', function () {

  const result = ContactAddress.validateSyntax('postal_code', '90210', { country_code: 'us' });
  assert.equal(result.success, true);

});


test('core validateSyntax rejects invalid country through basic adapter', function () {

  const result = ContactAddress.validateSyntax('country', 'zz', {});
  assert.equal(result.success, false);
  assert.equal(result.error.type, 'CONTACT_ADDRESS_INVALID_COUNTRY');

});


test('core listSubdivisions returns null through basic adapter', function () {

  const result = ContactAddress.listSubdivisions('us');
  assert.equal(result.success, true);
  assert.equal(result.subdivisions, null);

});


test('core validateAddress works through basic adapter', function () {

  const result = ContactAddress.validateAddress({
    line_1: '123 Main St',
    locality: 'Springfield',
    subdivision: 'IL',
    postal_code: '62701',
    country: 'us'
  });

  assert.equal(result.success, true);

});
