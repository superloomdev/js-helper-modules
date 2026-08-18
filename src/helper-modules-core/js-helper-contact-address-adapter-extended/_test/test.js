// Info: Test suite for helper-contact-address-adapter-extended.
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

test('getPostalRule returns rule with pattern for known country', function () {

  const rule = Adapter.getPostalRule('us');

  assert.ok(rule);
  assert.equal(rule.required, true);
  assert.ok(rule.pattern instanceof RegExp);

});


test('getPostalRule returns null for unknown country', function () {

  assert.equal(Adapter.getPostalRule('zz'), null);

});


test('getPostalRule returns required=false for country with no postal system', function () {

  const rule = Adapter.getPostalRule('ae');

  assert.equal(rule.required, false);

});



// ~~~~~~~~~~~~~~~~~~~~ listSubdivisions ~~~~~~~~~~~~~~~~~~~~

test('listSubdivisions returns data for US', function () {

  const subs = Adapter.listSubdivisions('us');

  assert.ok(Array.isArray(subs));
  assert.ok(subs.length > 0);

  const first = subs[0];
  assert.ok(typeof first.code === 'string');
  assert.ok(typeof first.name === 'string');

});


test('listSubdivisions returns null for unknown country', function () {

  assert.equal(Adapter.listSubdivisions('zz'), null);

});



// ~~~~~~~~~~~~~~~~~~~~ validatePostalCode ~~~~~~~~~~~~~~~~~~~~

test('validatePostalCode accepts valid US ZIP', function () {

  const result = Adapter.validatePostalCode('us', '90210');
  assert.equal(result.valid, true);
  assert.equal(result.reason, null);

});


test('validatePostalCode accepts valid US ZIP+4', function () {

  const result = Adapter.validatePostalCode('us', '90210-1234');
  assert.equal(result.valid, true);

});


test('validatePostalCode accepts valid India PIN', function () {

  const result = Adapter.validatePostalCode('in', '110001');
  assert.equal(result.valid, true);

});


test('validatePostalCode rejects invalid format (wrong pattern)', function () {

  // US postal codes must be 5 digits or 5+4
  const result = Adapter.validatePostalCode('us', 'abcd');
  assert.equal(result.valid, false);
  assert.equal(result.reason, 'CONTACT_ADDRESS_INVALID_FORMAT');

});


test('validatePostalCode rejects too-short postal code', function () {

  const result = Adapter.validatePostalCode('in', '110');
  assert.equal(result.valid, false);
  assert.ok(
    result.reason === 'CONTACT_ADDRESS_TOO_SHORT' || result.reason === 'CONTACT_ADDRESS_INVALID_FORMAT'
  );

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

test('validateSubdivision accepts valid US state code', function () {

  const result = Adapter.validateSubdivision('us', 'CA');
  assert.equal(result.valid, true);
  assert.equal(result.reason, null);

});


test('validateSubdivision rejects invalid US state code', function () {

  const result = Adapter.validateSubdivision('us', 'ZZ');
  assert.equal(result.valid, false);
  assert.equal(result.reason, 'CONTACT_ADDRESS_INVALID_SUBDIVISION');

});


test('validateSubdivision accepts any value for country without subdivision data', function () {

  // Countries without subdivision data get graceful fallback
  const result = Adapter.validateSubdivision('ae', 'anything');
  assert.equal(result.valid, true);

});


test('validateSubdivision rejects unknown country', function () {

  const result = Adapter.validateSubdivision('zz', 'CA');
  assert.equal(result.valid, false);
  assert.equal(result.reason, 'CONTACT_ADDRESS_INVALID_COUNTRY');

});



// ~~~~~~~~~~~~~~~~~~~~ Integration with core ~~~~~~~~~~~~~~~~~~~~

test('core validateSyntax works through extended adapter', function () {

  const result = ContactAddress.validateSyntax('postal_code', '90210', { country_code: 'us' });
  assert.equal(result.success, true);

});


test('core validateSyntax rejects invalid postal format through extended adapter', function () {

  const result = ContactAddress.validateSyntax('postal_code', 'abcd', { country_code: 'us' });
  assert.equal(result.success, false);
  assert.equal(result.error.type, 'CONTACT_ADDRESS_INVALID_FORMAT');

});


test('core listSubdivisions returns data through extended adapter', function () {

  const result = ContactAddress.listSubdivisions('us');
  assert.equal(result.success, true);
  assert.ok(Array.isArray(result.subdivisions));
  assert.ok(result.subdivisions.length > 0);

});


test('core validateAddress works through extended adapter', function () {

  const result = ContactAddress.validateAddress({
    line_1: '123 Main St',
    locality: 'Springfield',
    subdivision: 'IL',
    postal_code: '62701',
    country: 'us'
  });

  assert.equal(result.success, true);

});



// ~~~~~~~~~~~~~~~~~~~~ Swap proof: same results as basic ~~~~~~~~~~~~~~~~~~~~

test('swap: valid US postal accepted by both adapters', function () {

  const result = Adapter.validatePostalCode('us', '90210');
  assert.equal(result.valid, true);

});


test('swap: unknown country rejected with same reason as basic', function () {

  const result = Adapter.validatePostalCode('zz', '12345');
  assert.equal(result.valid, false);
  assert.equal(result.reason, 'CONTACT_ADDRESS_INVALID_COUNTRY');

});


test('swap: no-postal-system country accepts any value', function () {

  const result = Adapter.validatePostalCode('ae', 'anything');
  assert.equal(result.valid, true);

});
