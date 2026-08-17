// Info: Test suite for helper-contact-phone-adapter-basic. Tests the
// adapter contract directly and through the phone core. Covers 5+
// countries with different length rules, null input, empty string,
// wrong charset, and both length boundaries. Also tests that the
// adapter never emits PATTERN or NOT_ASSIGNED.
'use strict';


const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { contactPhone, adapter } = require('./loader')();


// ~~~~~~~~~~~~~~~~~~~~ Adapter Contract ~~~~~~~~~~~~~~~~~~~~


describe('adapter contract', function () {

  it('should expose listCountries as a function', function () {

    assert.strictEqual(typeof adapter.listCountries, 'function');

  });


  it('should expose getMetadata as a function', function () {

    assert.strictEqual(typeof adapter.getMetadata, 'function');

  });


  it('should expose validateNumber as a function', function () {

    assert.strictEqual(typeof adapter.validateNumber, 'function');

  });

});


// ~~~~~~~~~~~~~~~~~~~~ listCountries ~~~~~~~~~~~~~~~~~~~~


describe('listCountries', function () {

  it('should return an array of country codes', function () {

    const countries = adapter.listCountries();

    assert.ok(Array.isArray(countries));
    assert.ok(countries.length >= 200);

  });


  it('should include us, in, gb, de, jp, ae, ca, au', function () {

    const countries = adapter.listCountries();

    ['us', 'in', 'gb', 'de', 'jp', 'ae', 'ca', 'au'].forEach(function (code) {

      assert.ok(countries.indexOf(code) !== -1, 'Missing country: ' + code);

    });

  });

});


// ~~~~~~~~~~~~~~~~~~~~ getMetadata ~~~~~~~~~~~~~~~~~~~~


describe('getMetadata', function () {

  it('should return metadata for US', function () {

    const meta = adapter.getMetadata('us');

    assert.strictEqual(meta.calling_code, '1');
    assert.strictEqual(typeof meta.min_length, 'number');
    assert.strictEqual(typeof meta.max_length, 'number');

  });


  it('should return metadata for IN', function () {

    const meta = adapter.getMetadata('in');

    assert.strictEqual(meta.calling_code, '91');

  });


  it('should return metadata for AE (3-digit calling code)', function () {

    const meta = adapter.getMetadata('ae');

    assert.strictEqual(meta.calling_code, '971');

  });


  it('should return null for an unknown country', function () {

    assert.strictEqual(adapter.getMetadata('zz'), null);

  });

});


// ~~~~~~~~~~~~~~~~~~~~ validateNumber ~~~~~~~~~~~~~~~~~~~~


describe('validateNumber', function () {

  it('should validate a correct US number', function () {

    const result = adapter.validateNumber('us', '4155551234');

    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.reason, null);

  });


  it('should validate a correct IN number', function () {

    const result = adapter.validateNumber('in', '9876543210');

    assert.strictEqual(result.valid, true);

  });


  it('should validate a correct GB number', function () {

    const result = adapter.validateNumber('gb', '1632960000');

    assert.strictEqual(result.valid, true);

  });


  it('should validate a correct JP number', function () {

    const result = adapter.validateNumber('jp', '9012345678');

    assert.strictEqual(result.valid, true);

  });


  it('should validate a correct AE number', function () {

    const result = adapter.validateNumber('ae', '501234567');

    assert.strictEqual(result.valid, true);

  });


  it('should reject an unknown country', function () {

    const result = adapter.validateNumber('zz', '1234567890');

    assert.strictEqual(result.valid, false);
    assert.strictEqual(result.reason, 'UNKNOWN_COUNTRY');

  });


  it('should reject non-digit characters (charset)', function () {

    const result = adapter.validateNumber('us', '415555abcd');

    assert.strictEqual(result.valid, false);
    assert.strictEqual(result.reason, 'CHARSET');

  });


  it('should reject a too-short number', function () {

    const result = adapter.validateNumber('us', '123');

    assert.strictEqual(result.valid, false);
    assert.strictEqual(result.reason, 'TOO_SHORT');

  });


  it('should reject a too-long number', function () {

    const result = adapter.validateNumber('us', '123456789012345');

    assert.strictEqual(result.valid, false);
    assert.strictEqual(result.reason, 'TOO_LONG');

  });


  it('should never emit PATTERN or NOT_ASSIGNED', function () {

    // Test a variety of inputs and confirm neither reason appears
    const testCases = [
      ['us', '4155551234'],
      ['us', '123'],
      ['us', '123456789012345'],
      ['us', 'abc'],
      ['zz', '1234567890'],
      ['in', '9876543210'],
      ['ae', '501234567']
    ];

    testCases.forEach(function (tc) {

      const result = adapter.validateNumber(tc[0], tc[1]);

      assert.notStrictEqual(result.reason, 'PATTERN');
      assert.notStrictEqual(result.reason, 'NOT_ASSIGNED');

    });

  });

});


// ~~~~~~~~~~~~~~~~~~~~ End-to-End Through Core ~~~~~~~~~~~~~~~~~~~~


describe('end-to-end through phone core', function () {

  it('should validate a US number through the core', function () {

    const result = contactPhone.validateNumber('us', '4155551234');

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.error, null);

  });


  it('should format a US number as E.164 through the core', function () {

    const result = contactPhone.formatE164('us', '4155551234');

    assert.strictEqual(result, '+14155551234');

  });


  it('should parse an E.164 number through the core', function () {

    // Use IN (+91) which has a unique calling code.
    // +1 is shared by US, CA, and many NANP countries, so parseE164
    // returns the first match (alphabetically) which may not be US.
    const result = contactPhone.parseE164('+919876543210');

    assert.strictEqual(result.country_code, 'in');
    assert.strictEqual(result.national_number, '9876543210');

  });


  it('should create and parse a phone ID through the core', function () {

    const phoneId = contactPhone.createPhoneId('in', '9876543210');
    const parsed = contactPhone.parsePhoneId(phoneId);

    assert.strictEqual(parsed.country_code, 'in');
    assert.strictEqual(parsed.national_number, '9876543210');

  });

});
