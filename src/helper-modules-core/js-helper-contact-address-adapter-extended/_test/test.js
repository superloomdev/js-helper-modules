// Info: Test suite for helper-contact-address-adapter-extended.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import loader from './loader.js';
const { Adapter, BasicAdapter, ContactAddress, ContactAddressBasic } = loader;



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
// Both adapters are loaded and driven through identical call sites, because
// asserting only against the extended adapter proves nothing about the pair.

test('swap: both adapters expose the identical contract surface', function () {

  // The five contract method names must match exactly, in both directions
  assert.deepEqual(Object.keys(Adapter).sort(), Object.keys(BasicAdapter).sort());

});


test('swap: both adapters accept the same valid US postal code', function () {

  // A well-formed code of correct length is inside both adapters' competence
  assert.equal(Adapter.validatePostalCode('us', '90210').valid, true);
  assert.equal(BasicAdapter.validatePostalCode('us', '90210').valid, true);

});


test('swap: both adapters reject an unknown country with the same reason', function () {

  const extended = Adapter.validatePostalCode('zz', '12345');
  const basic = BasicAdapter.validatePostalCode('zz', '12345');

  assert.equal(extended.valid, false);
  assert.equal(basic.valid, false);
  assert.equal(extended.reason, basic.reason);
  assert.equal(extended.reason, 'CONTACT_ADDRESS_INVALID_COUNTRY');

});


test('swap: both adapters accept any value for a no-postal-system country', function () {

  // Defect B3: the absence of a postal system is modelled, never compared against null
  assert.equal(Adapter.validatePostalCode('ae', 'anything').valid, true);
  assert.equal(BasicAdapter.validatePostalCode('ae', 'anything').valid, true);

});


test('swap: both adapters agree on the set of countries they serve', function () {

  // A country present in one adapter and absent from the other is silent drift
  assert.deepEqual(Adapter.listCountries().slice().sort(), BasicAdapter.listCountries().slice().sort());

});


test('swap: identical call sites through the core return identical verdicts', function () {

  // Cases both adapters can judge must agree end to end
  const cases = [
    ['us', '90210'],
    ['zz', '12345'],
    ['ae', 'anything']
  ];

  for (let i = 0; i < cases.length; i++) {
    const country = cases[i][0];
    const postal = cases[i][1];

    const extended = ContactAddress.validateSyntax('postal_code', postal, { country_code: country });
    const basic = ContactAddressBasic.validateSyntax('postal_code', postal, { country_code: country });

    assert.equal(extended.success, basic.success, 'success disagrees for ' + country + '/' + postal);
  }

});


test('swap: only the extended adapter carries subdivision data', function () {

  // The documented depth difference, pinned so it stays deliberate
  assert.equal(BasicAdapter.listSubdivisions('us'), null);
  assert.ok(Array.isArray(Adapter.listSubdivisions('us')));

  // Basic reports every subdivision valid; extended rejects a bogus one
  assert.equal(BasicAdapter.validateSubdivision('us', 'ZZZ').valid, true);
  assert.equal(Adapter.validateSubdivision('us', 'ZZZ').valid, false);

});
