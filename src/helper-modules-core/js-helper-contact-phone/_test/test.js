// Info: Test suite for helper-contact-phone.
// Uses a stub adapter with known data for 5 countries (us, in, gb, de, jp).
// Covers all 13 public functions, error envelopes, and edge cases.


import { test } from 'node:test';
import assert from 'node:assert/strict';
import contactPhoneLoader from 'helper-contact-phone';
import { ContactPhone, Lib, STUB_COUNTRIES, STUB_METADATA } from './loader.js';



// ~~~~~~~~~~~~~~~~~~~~ Construction & Adapter Validation ~~~~~~~~~~~~~~~~~~~~

test('construction with valid adapter succeeds', function () {

  assert.equal(typeof ContactPhone, 'object');
  assert.equal(typeof ContactPhone.validateSyntax, 'function');
  assert.equal(typeof ContactPhone.formatE164, 'function');

});


test('construction without adapter throws', function () {

  assert.throws(function () {
    contactPhoneLoader(Lib, {});
  }, /CONFIG\.Adapter must be/);

});


test('construction with adapter missing methods throws', function () {

  assert.throws(function () {
    contactPhoneLoader(Lib, { Adapter: { listCountries: function () {} } });
  }, /Invalid adapter contract: missing method/);

});



// ~~~~~~~~~~~~~~~~~~~~ sanitizeNumber ~~~~~~~~~~~~~~~~~~~~

test('sanitizeNumber strips non-digits', function () {

  assert.equal(ContactPhone.sanitizeNumber('98765 43210'), '9876543210');
  assert.equal(ContactPhone.sanitizeNumber('(987) 654-3210'), '9876543210');
  assert.equal(ContactPhone.sanitizeNumber('+91-98765-43210'), '919876543210');

});


test('sanitizeNumber empty string returns empty string', function () {

  assert.equal(ContactPhone.sanitizeNumber(''), '');

});


test('sanitizeNumber non-string throws TypeError', function () {

  assert.throws(function () {
    ContactPhone.sanitizeNumber(12345);
  }, TypeError);

});



// ~~~~~~~~~~~~~~~~~~~~ sanitizeFullNumber ~~~~~~~~~~~~~~~~~~~~

test('sanitizeFullNumber preserves leading +', function () {

  assert.equal(ContactPhone.sanitizeFullNumber('+91 98765 43210'), '+919876543210');
  assert.equal(ContactPhone.sanitizeFullNumber('+1 (234) 567-8900'), '+12345678900');

});


test('sanitizeFullNumber without + returns digits only', function () {

  assert.equal(ContactPhone.sanitizeFullNumber('91 98765 43210'), '919876543210');

});


test('sanitizeFullNumber non-string throws TypeError', function () {

  assert.throws(function () {
    ContactPhone.sanitizeFullNumber(null);
  }, TypeError);

});



// ~~~~~~~~~~~~~~~~~~~~ isKnownCountry ~~~~~~~~~~~~~~~~~~~~

test('isKnownCountry returns true for known countries', function () {

  assert.equal(ContactPhone.isKnownCountry('us'), true);
  assert.equal(ContactPhone.isKnownCountry('in'), true);
  assert.equal(ContactPhone.isKnownCountry('gb'), true);

});


test('isKnownCountry returns false for unknown countries', function () {

  assert.equal(ContactPhone.isKnownCountry('zz'), false);
  assert.equal(ContactPhone.isKnownCountry('xx'), false);

});


test('isKnownCountry non-string throws TypeError', function () {

  assert.throws(function () {
    ContactPhone.isKnownCountry(123);
  }, TypeError);

});



// ~~~~~~~~~~~~~~~~~~~~ listCountries ~~~~~~~~~~~~~~~~~~~~

test('listCountries returns all known countries', function () {

  const result = ContactPhone.listCountries();

  assert.equal(result.success, true);
  assert.equal(result.error, null);
  assert.deepEqual(result.countries.sort(), STUB_COUNTRIES.sort());

});



// ~~~~~~~~~~~~~~~~~~~~ getCountryMetadata ~~~~~~~~~~~~~~~~~~~~

test('getCountryMetadata returns metadata for known country', function () {

  const result = ContactPhone.getCountryMetadata('in');

  assert.equal(result.success, true);
  assert.equal(result.error, null);
  assert.deepEqual(result.metadata, STUB_METADATA.in);

});


test('getCountryMetadata returns error for unknown country', function () {

  const result = ContactPhone.getCountryMetadata('zz');

  assert.equal(result.success, false);
  assert.equal(result.error.type, 'CONTACT_PHONE_UNKNOWN_COUNTRY');
  assert.equal(result.metadata, null);

});



// ~~~~~~~~~~~~~~~~~~~~ validateSyntax ~~~~~~~~~~~~~~~~~~~~

test('validateSyntax accepts valid number', function () {

  const result = ContactPhone.validateSyntax('in', '9876543210');

  assert.equal(result.success, true);
  assert.equal(result.error, null);

});


test('validateSyntax rejects too-short number', function () {

  const result = ContactPhone.validateSyntax('in', '98765');

  assert.equal(result.success, false);
  assert.equal(result.error.type, 'CONTACT_PHONE_TOO_SHORT');

});


test('validateSyntax rejects too-long number', function () {

  const result = ContactPhone.validateSyntax('in', '98765432101234');

  assert.equal(result.success, false);
  assert.equal(result.error.type, 'CONTACT_PHONE_TOO_LONG');

});


test('validateSyntax rejects unknown country', function () {

  const result = ContactPhone.validateSyntax('zz', '9876543210');

  assert.equal(result.success, false);
  assert.equal(result.error.type, 'CONTACT_PHONE_UNKNOWN_COUNTRY');

});


test('validateSyntax rejects non-numeric input', function () {

  const result = ContactPhone.validateSyntax('in', 'abcdefghij');

  assert.equal(result.success, false);
  assert.equal(result.error.type, 'CONTACT_PHONE_NOT_A_NUMBER');

});



// ~~~~~~~~~~~~~~~~~~~~ getNumberType ~~~~~~~~~~~~~~~~~~~~

test('getNumberType returns null from stub adapter', function () {

  const result = ContactPhone.getNumberType('in', '9876543210');

  assert.equal(result.success, true);
  assert.equal(result.type, null);
  assert.equal(result.error, null);

});


test('getNumberType rejects unknown country', function () {

  const result = ContactPhone.getNumberType('zz', '9876543210');

  assert.equal(result.success, false);
  assert.equal(result.type, null);
  assert.equal(result.error.type, 'CONTACT_PHONE_UNKNOWN_COUNTRY');

});



// ~~~~~~~~~~~~~~~~~~~~ formatE164 ~~~~~~~~~~~~~~~~~~~~

test('formatE164 produces correct E.164 string', function () {

  assert.equal(ContactPhone.formatE164('in', '9876543210'), '+919876543210');
  assert.equal(ContactPhone.formatE164('us', '2345678900'), '+12345678900');
  assert.equal(ContactPhone.formatE164('gb', '7911234567'), '+447911234567');

});


test('formatE164 returns null for unknown country', function () {

  assert.equal(ContactPhone.formatE164('zz', '9876543210'), null);

});


test('formatE164 returns null when result exceeds 15 digits', function () {

  // de has calling_code '49' and max_length 11, so 49 + 14 digits = 16 > 15
  assert.equal(ContactPhone.formatE164('de', '12345678901234'), null);

});



// ~~~~~~~~~~~~~~~~~~~~ formatFullNumber (alias) ~~~~~~~~~~~~~~~~~~~~

test('formatFullNumber is an alias for formatE164', function () {

  assert.equal(
    ContactPhone.formatFullNumber('in', '9876543210'),
    ContactPhone.formatE164('in', '9876543210')
  );

});



// ~~~~~~~~~~~~~~~~~~~~ parseE164 ~~~~~~~~~~~~~~~~~~~~

test('parseE164 parses valid E.164 string', function () {

  const result = ContactPhone.parseE164('+919876543210');

  assert.deepEqual(result, {
    country_code: 'in',
    national_number: '9876543210'
  });

});


test('parseE164 parses US number', function () {

  const result = ContactPhone.parseE164('+12345678900');

  assert.deepEqual(result, {
    country_code: 'us',
    national_number: '2345678900'
  });

});


test('parseE164 returns null for string without +', function () {

  assert.equal(ContactPhone.parseE164('919876543210'), null);

});


test('parseE164 returns null for unknown calling code', function () {

  assert.equal(ContactPhone.parseE164('+9999876543210'), null);

});


test('parseE164 returns null for empty digits', function () {

  assert.equal(ContactPhone.parseE164('+'), null);

});



// ~~~~~~~~~~~~~~~~~~~~ parseFullNumber (alias) ~~~~~~~~~~~~~~~~~~~~

test('parseFullNumber is an alias for parseE164', function () {

  assert.deepEqual(
    ContactPhone.parseFullNumber('+919876543210'),
    ContactPhone.parseE164('+919876543210')
  );

});



// ~~~~~~~~~~~~~~~~~~~~ createPhoneId ~~~~~~~~~~~~~~~~~~~~

test('createPhoneId produces correct encoding', function () {

  // in.0123456789 = 'in' + '.' + reversed('9876543210')
  assert.equal(ContactPhone.createPhoneId('in', '9876543210'), 'in.0123456789');

});


test('createPhoneId returns null for unknown country', function () {

  assert.equal(ContactPhone.createPhoneId('zz', '9876543210'), null);

});


test('createPhoneId non-string throws TypeError', function () {

  assert.throws(function () {
    ContactPhone.createPhoneId(null, '9876543210');
  }, TypeError);

});



// ~~~~~~~~~~~~~~~~~~~~ parsePhoneId ~~~~~~~~~~~~~~~~~~~~

test('parsePhoneId parses valid phone ID', function () {

  const result = ContactPhone.parsePhoneId('in.0123456789');

  assert.deepEqual(result, {
    country_code: 'in',
    national_number: '9876543210'
  });

});


test('parsePhoneId returns null for invalid format', function () {

  assert.equal(ContactPhone.parsePhoneId('invalid'), null);
  assert.equal(ContactPhone.parsePhoneId('in.'), null);
  assert.equal(ContactPhone.parsePhoneId('.0123456789'), null);

});


test('parsePhoneId returns null for unknown country', function () {

  assert.equal(ContactPhone.parsePhoneId('zz.0123456789'), null);

});



// ~~~~~~~~~~~~~~~~~~~~ Round-trip: createPhoneId -> parsePhoneId ~~~~~~~~~~~~~~~~~~~~

test('phone ID round-trip preserves data', function () {

  const country_code = 'us';
  const national_number = '2345678900';
  const phone_id = ContactPhone.createPhoneId(country_code, national_number);
  const parsed = ContactPhone.parsePhoneId(phone_id);

  assert.deepEqual(parsed, { country_code: country_code, national_number: national_number });

});



// ~~~~~~~~~~~~~~~~~~~~ Round-trip: formatE164 -> parseE164 ~~~~~~~~~~~~~~~~~~~~

test('E.164 round-trip preserves data', function () {

  const country_code = 'gb';
  const national_number = '7911234567';
  const e164 = ContactPhone.formatE164(country_code, national_number);
  const parsed = ContactPhone.parseE164(e164);

  assert.deepEqual(parsed, { country_code: country_code, national_number: national_number });

});


// ~~~~~~~~~~~~~~~~~~~~ Verb uniformity ~~~~~~~~~~~~~~~~~~~~
// Every exported name must begin with a verb taken from the published
// catalog. This is the guard that keeps construct/deconstruct out: they
// read naturally, they are what the legacy source used, and they are a
// second answer to a question create/parse and format/parse already settle.

test('every exported function name begins with an approved verb', function () {

  // The approved set, plus canonicalize as a recorded exception
  const approved = ['sanitize', 'validate', 'is', 'list', 'get', 'create', 'parse', 'format'];
  const exceptions = ['canonicalize'];

  // Check each exported name against the set
  const names = Object.keys(ContactPhone);

  for (let i = 0; i < names.length; i++) {
    const name = names[i];

    // An explicitly recorded exception is allowed through
    if (exceptions.indexOf(name) !== -1) {
      continue;
    }

    // Match the leading verb
    const matched = approved.some(function (verb) {
      return name.startsWith(verb);
    });

    assert.ok(matched, name + ' does not begin with an approved verb');
  }

});


test('no exported name uses the banned construct or deconstruct verbs', function () {

  // The specific drift this family was drafted with before the audit caught it
  const names = Object.keys(ContactPhone);

  for (let i = 0; i < names.length; i++) {
    assert.ok(!names[i].startsWith('construct'), names[i] + ' uses the banned construct verb');
    assert.ok(!names[i].startsWith('deconstruct'), names[i] + ' uses the banned deconstruct verb');
  }

});
