// Info: Test suite for helper-contact-phone. Tests the 10 public functions
// against a stub adapter with a known country set. Covers 5+ countries with
// different length rules, null input, empty string, wrong charset, and both
// length boundaries. Also tests the B2 fix (E.164 parse anchored to start).
'use strict';


const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { contactPhone } = require('./loader')();


// ~~~~~~~~~~~~~~~~~~~~ sanitizeNumber ~~~~~~~~~~~~~~~~~~~~


describe('sanitizeNumber', function () {

  it('should strip non-digit characters from a national number', function () {

    assert.strictEqual(contactPhone.sanitizeNumber('98765 43210'), '9876543210');

  });


  it('should return empty string for null input', function () {

    assert.strictEqual(contactPhone.sanitizeNumber(null), '');

  });


  it('should return empty string for undefined input', function () {

    assert.strictEqual(contactPhone.sanitizeNumber(undefined), '');

  });


  it('should handle already-clean input', function () {

    assert.strictEqual(contactPhone.sanitizeNumber('9876543210'), '9876543210');

  });


  it('should strip letters and special characters', function () {

    assert.strictEqual(contactPhone.sanitizeNumber('call 987-654-3210 now'), '9876543210');

  });

});


// ~~~~~~~~~~~~~~~~~~~~ sanitizeFullNumber ~~~~~~~~~~~~~~~~~~~~


describe('sanitizeFullNumber', function () {

  it('should keep digits and plus sign, strip everything else', function () {

    assert.strictEqual(contactPhone.sanitizeFullNumber('+91 98765 43210'), '+919876543210');

  });


  it('should return empty string for null input', function () {

    assert.strictEqual(contactPhone.sanitizeFullNumber(null), '');

  });


  it('should handle input without plus sign', function () {

    assert.strictEqual(contactPhone.sanitizeFullNumber('919876543210'), '919876543210');

  });

});


// ~~~~~~~~~~~~~~~~~~~~ isKnownCountry ~~~~~~~~~~~~~~~~~~~~


describe('isKnownCountry', function () {

  it('should return true for a known country code', function () {

    assert.strictEqual(contactPhone.isKnownCountry('us'), true);

  });


  it('should return true for a known country code in uppercase', function () {

    assert.strictEqual(contactPhone.isKnownCountry('US'), true);

  });


  it('should return false for an unknown country code', function () {

    assert.strictEqual(contactPhone.isKnownCountry('zz'), false);

  });


  it('should return false for non-string input', function () {

    assert.strictEqual(contactPhone.isKnownCountry(123), false);

  });


  it('should return false for null input', function () {

    assert.strictEqual(contactPhone.isKnownCountry(null), false);

  });

});


// ~~~~~~~~~~~~~~~~~~~~ listCountries ~~~~~~~~~~~~~~~~~~~~


describe('listCountries', function () {

  it('should return a success envelope with the country list', function () {

    const result = contactPhone.listCountries();

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.error, null);
    assert.ok(Array.isArray(result.countries));
    assert.ok(result.countries.indexOf('us') !== -1);

  });

});


// ~~~~~~~~~~~~~~~~~~~~ getCountryMetadata ~~~~~~~~~~~~~~~~~~~~


describe('getCountryMetadata', function () {

  it('should return metadata for a known country', function () {

    const result = contactPhone.getCountryMetadata('in');

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.error, null);
    assert.strictEqual(result.metadata.calling_code, '91');
    assert.strictEqual(result.metadata.min_length, 10);
    assert.strictEqual(result.metadata.max_length, 10);

  });


  it('should return an error envelope for an unknown country', function () {

    const result = contactPhone.getCountryMetadata('zz');

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.metadata, null);
    assert.strictEqual(result.error.type, 'CONTACT_PHONE_UNKNOWN_COUNTRY');

  });


  it('should return an error envelope for non-string input', function () {

    const result = contactPhone.getCountryMetadata(123);

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error.type, 'CONTACT_PHONE_UNKNOWN_COUNTRY');

  });

});


// ~~~~~~~~~~~~~~~~~~~~ validateNumber ~~~~~~~~~~~~~~~~~~~~


describe('validateNumber', function () {

  it('should validate a correct US number', function () {

    const result = contactPhone.validateNumber('us', '4155551234');

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.error, null);

  });


  it('should validate a correct IN number', function () {

    const result = contactPhone.validateNumber('in', '9876543210');

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.error, null);

  });


  it('should validate a correct AE number (8 digits, lower bound)', function () {

    const result = contactPhone.validateNumber('ae', '12345678');

    assert.strictEqual(result.success, true);

  });


  it('should validate a correct AE number (9 digits, upper bound)', function () {

    const result = contactPhone.validateNumber('ae', '123456789');

    assert.strictEqual(result.success, true);

  });


  it('should validate a correct JP number (9 digits exact)', function () {

    const result = contactPhone.validateNumber('jp', '123456789');

    assert.strictEqual(result.success, true);

  });


  it('should reject an unknown country', function () {

    const result = contactPhone.validateNumber('zz', '1234567890');

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error.type, 'CONTACT_PHONE_INVALID_NUMBER');
    assert.strictEqual(result.error.message, 'UNKNOWN_COUNTRY');

  });


  it('should reject non-digit characters (charset)', function () {

    const result = contactPhone.validateNumber('us', '415555abcd');

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error.message, 'CHARSET');

  });


  it('should reject a too-short number', function () {

    const result = contactPhone.validateNumber('us', '123456789');

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error.message, 'TOO_SHORT');

  });


  it('should reject a too-long number', function () {

    const result = contactPhone.validateNumber('us', '12345678901');

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error.message, 'TOO_LONG');

  });


  it('should reject null national number', function () {

    const result = contactPhone.validateNumber('us', null);

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error.type, 'CONTACT_PHONE_INVALID_NUMBER');

  });


  it('should reject empty string national number', function () {

    const result = contactPhone.validateNumber('us', '');

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error.message, 'CHARSET');

  });

});


// ~~~~~~~~~~~~~~~~~~~~ formatE164 ~~~~~~~~~~~~~~~~~~~~


describe('formatE164', function () {

  it('should format a US number as E.164', function () {

    assert.strictEqual(contactPhone.formatE164('us', '4155551234'), '+14155551234');

  });


  it('should format an IN number as E.164', function () {

    assert.strictEqual(contactPhone.formatE164('in', '9876543210'), '+919876543210');

  });


  it('should format an AE number as E.164', function () {

    assert.strictEqual(contactPhone.formatE164('ae', '12345678'), '+97112345678');

  });


  it('should return null for an unknown country', function () {

    assert.strictEqual(contactPhone.formatE164('zz', '1234567890'), null);

  });


  it('should return null for null national number', function () {

    assert.strictEqual(contactPhone.formatE164('us', null), null);

  });

});


// ~~~~~~~~~~~~~~~~~~~~ parseE164 (includes B2 fix) ~~~~~~~~~~~~~~~~~~~~


describe('parseE164', function () {

  it('should parse a US E.164 number', function () {

    const result = contactPhone.parseE164('+14155551234');

    assert.deepStrictEqual(result, {
      country_code: 'us',
      national_number: '4155551234'
    });

  });


  it('should parse an IN E.164 number', function () {

    const result = contactPhone.parseE164('+919876543210');

    assert.deepStrictEqual(result, {
      country_code: 'in',
      national_number: '9876543210'
    });

  });


  it('should parse an AE E.164 number (3-digit calling code)', function () {

    const result = contactPhone.parseE164('+97112345678');

    assert.deepStrictEqual(result, {
      country_code: 'ae',
      national_number: '12345678'
    });

  });


  it('should return null for a string without +', function () {

    assert.strictEqual(contactPhone.parseE164('14155551234'), null);

  });


  it('should return null for null input', function () {

    assert.strictEqual(contactPhone.parseE164(null), null);

  });


  it('should return null for non-string input', function () {

    assert.strictEqual(contactPhone.parseE164(123), null);

  });


  it('should fix B2: correctly parse when calling code digits recur in the number', function () {

    // +1 9198765432 - the calling code 1 appears again inside the number
    // The legacy code split on the literal "+1" and got the wrong remainder.
    // The anchored match correctly identifies US (calling code 1) and
    // extracts "9198765432" as the national number.
    // Note: +91 is also a calling code (IN), so the longest-match-first
    // sort ensures +91 matches before +1 if the number starts with +91.
    // Here +1 matches US because the number starts with +191... not +91.
    const result = contactPhone.parseE164('+19198765432');

    assert.strictEqual(result.country_code, 'us');
    assert.strictEqual(result.national_number, '9198765432');

  });


  it('should prefer longer calling code match: +91 over +9', function () {

    // +91 should match IN (calling code 91), not some hypothetical country
    // with calling code 9. The longest-match-first sort ensures this.
    const result = contactPhone.parseE164('+919876543210');

    assert.strictEqual(result.country_code, 'in');

  });

});


// ~~~~~~~~~~~~~~~~~~~~ createPhoneId ~~~~~~~~~~~~~~~~~~~~


describe('createPhoneId', function () {

  it('should create a phone ID with reversed number and country code', function () {

    // 9876543210 reversed = 0123456789, country code = in
    assert.strictEqual(contactPhone.createPhoneId('in', '9876543210'), '0123456789.in');

  });


  it('should create a phone ID for US', function () {

    assert.strictEqual(contactPhone.createPhoneId('us', '4155551234'), '4321555514.us');

  });


  it('should return null for null national number', function () {

    assert.strictEqual(contactPhone.createPhoneId('us', null), null);

  });


  it('should return null for empty national number', function () {

    assert.strictEqual(contactPhone.createPhoneId('us', ''), null);

  });


  it('should return null for non-string country code', function () {

    assert.strictEqual(contactPhone.createPhoneId(123, '4155551234'), null);

  });

});


// ~~~~~~~~~~~~~~~~~~~~ parsePhoneId ~~~~~~~~~~~~~~~~~~~~


describe('parsePhoneId', function () {

  it('should parse a phone ID back to country code and national number', function () {

    const result = contactPhone.parsePhoneId('0123456789.in');

    assert.deepStrictEqual(result, {
      country_code: 'in',
      national_number: '9876543210'
    });

  });


  it('should parse a US phone ID', function () {

    const result = contactPhone.parsePhoneId('4321555514.us');

    assert.deepStrictEqual(result, {
      country_code: 'us',
      national_number: '4155551234'
    });

  });


  it('should return null for null input', function () {

    assert.strictEqual(contactPhone.parsePhoneId(null), null);

  });


  it('should return null for empty string input', function () {

    assert.strictEqual(contactPhone.parsePhoneId(''), null);

  });


  it('should return null for a string without a dot', function () {

    assert.strictEqual(contactPhone.parsePhoneId('0123456789'), null);

  });


  it('should return null for a string with empty parts', function () {

    assert.strictEqual(contactPhone.parsePhoneId('.in'), null);
    assert.strictEqual(contactPhone.parsePhoneId('0123456789.'), null);

  });

});
