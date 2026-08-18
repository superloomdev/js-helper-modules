// Info: Test suite for helper-contact-phone-adapter-basic.
// Tests the adapter contract directly and through the parent core.
// Covers 5 countries with different length rules, plus edge cases.
'use strict';


const { test } = require('node:test');
const assert = require('node:assert/strict');

const { Adapter, ContactPhone, COUNTRY_DATA } = require('./loader');



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
  assert.ok(countries.includes('de'));
  assert.ok(countries.includes('jp'));

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


test('getMetadata returns a copy, not internal reference', function () {

  const meta1 = Adapter.getMetadata('us');
  meta1.calling_code = '999';

  const meta2 = Adapter.getMetadata('us');
  assert.equal(meta2.calling_code, '1');

});



// ~~~~~~~~~~~~~~~~~~~~ validateSyntax ~~~~~~~~~~~~~~~~~~~~

test('validateSyntax accepts valid US number', function () {

  const result = Adapter.validateSyntax('us', '2345678900');
  assert.equal(result.valid, true);
  assert.equal(result.reason, null);

});


test('validateSyntax accepts valid India number', function () {

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

  const us = COUNTRY_DATA.us;
  const result = Adapter.validateSyntax('us', '123');
  assert.equal(result.valid, false);
  assert.equal(result.reason, 'CONTACT_PHONE_TOO_SHORT');

});


test('validateSyntax rejects too-long number', function () {

  const result = Adapter.validateSyntax('us', '12345678901234');
  assert.equal(result.valid, false);
  assert.equal(result.reason, 'CONTACT_PHONE_TOO_LONG');

});



// ~~~~~~~~~~~~~~~~~~~~ getNumberType ~~~~~~~~~~~~~~~~~~~~

test('getNumberType always returns null', function () {

  assert.equal(Adapter.getNumberType('us', '2345678900'), null);
  assert.equal(Adapter.getNumberType('in', '9876543210'), null);

});



// ~~~~~~~~~~~~~~~~~~~~ Integration with parent core ~~~~~~~~~~~~~~~~~~~~

test('core validateSyntax works through basic adapter', function () {

  const result = ContactPhone.validateSyntax('in', '9876543210');
  assert.equal(result.success, true);
  assert.equal(result.error, null);

});


test('core formatE164 works through basic adapter', function () {

  const result = ContactPhone.formatE164('in', '9876543210');
  assert.equal(result, '+919876543210');

});


test('core createPhoneId works through basic adapter', function () {

  const result = ContactPhone.createPhoneId('us', '2345678900');
  assert.equal(result, 'us.0098765432');

});


test('core parseE164 works through basic adapter', function () {

  const result = ContactPhone.parseE164('+919876543210');
  assert.deepEqual(result, {
    country_code: 'in',
    national_number: '9876543210'
  });

});


test('core listCountries works through basic adapter', function () {

  const result = ContactPhone.listCountries();
  assert.equal(result.success, true);
  assert.ok(result.countries.length > 200);

});


test('core getNumberType returns null through basic adapter', function () {

  const result = ContactPhone.getNumberType('in', '9876543210');
  assert.equal(result.success, true);
  assert.equal(result.type, null);

});



// ~~~~~~~~~~~~~~~~~~~~ Data integrity ~~~~~~~~~~~~~~~~~~~~

test('all countries have calling_code, min_length, max_length', function () {

  const countries = Adapter.listCountries();

  countries.forEach(function (cc) {
    const meta = Adapter.getMetadata(cc);
    assert.ok(meta !== null, cc + ' should have metadata');
    assert.equal(typeof meta.calling_code, 'string', cc + ' calling_code should be string');
    assert.equal(typeof meta.min_length, 'number', cc + ' min_length should be number');
    assert.equal(typeof meta.max_length, 'number', cc + ' max_length should be number');
    assert.ok(meta.min_length > 0, cc + ' min_length should be positive');
    assert.ok(meta.max_length >= meta.min_length, cc + ' max_length >= min_length');
  });

});


test('max_length does not exceed E.164 limit', function () {

  const countries = Adapter.listCountries();

  countries.forEach(function (cc) {
    const meta = Adapter.getMetadata(cc);
    const e164Max = 15 - meta.calling_code.length;
    assert.ok(
      meta.max_length <= e164Max,
      cc + ' max_length ' + meta.max_length + ' exceeds E.164 max ' + e164Max
    );
  });

});
