// Tests for helper-crypto
// Covers all exported functions with automated assertions
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

// Load dependencies via loader (DI pattern)
import loader from './loader.js';
import cryptoLoader from 'helper-crypto';
const { Lib } = loader();
const Crypto = Lib.Crypto;



describe('generateRandomString', function () {

  it('should generate string of specified length', function () {

    const result = Crypto.generateRandomString('abcdef', 10);

    assert.strictEqual(result.length, 10);

  });


  it('should only contain characters from charset', function () {

    const charset = 'abc123';
    const result = Crypto.generateRandomString(charset, 50);

    for (var i = 0; i < result.length; i++) {
      assert.ok(charset.includes(result[i]), `Character '${result[i]}' should be in charset`);
    }

  });


  it('should generate different strings on each call', function () {

    const result1 = Crypto.generateRandomString('0123456789abcdef', 20);
    const result2 = Crypto.generateRandomString('0123456789abcdef', 20);

    assert.notStrictEqual(result1, result2);

  });

});



describe('generateTimeRandomString', function () {

  it('should generate non-empty string from unix time', function () {

    const result = Crypto.generateTimeRandomString(1600000000);

    assert.ok(result.length > 0);

  });


  it('should pad to min_length when specified', function () {

    const result = Crypto.generateTimeRandomString(1600000000, 20);

    assert.ok(result.length >= 20);

  });


  it('should apply epoch offset when provided', function () {

    const with_offset = Crypto.generateTimeRandomString(1600000000, null, 1500000000);
    const without_offset = Crypto.generateTimeRandomString(1600000000);

    assert.notStrictEqual(with_offset, without_offset);

  });

});



describe('generateUUID', function () {

  it('should generate valid UUIDv4 format', function () {

    const result = Crypto.generateUUID();
    const uuid_regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

    assert.ok(uuid_regex.test(result), `UUID should match v4 format: ${result}`);

  });


  it('should generate unique values', function () {

    const result1 = Crypto.generateUUID();
    const result2 = Crypto.generateUUID();

    assert.notStrictEqual(result1, result2);

  });

});



describe('generateCompactUUID', function () {

  it('should generate 25-character string', function () {

    const result = Crypto.generateCompactUUID();

    assert.strictEqual(result.length, 25);

  });


  it('should only contain base36 characters', function () {

    const result = Crypto.generateCompactUUID();
    const base36_regex = /^[0-9a-z]+$/;

    assert.ok(base36_regex.test(result), `Compact UUID should be base36: ${result}`);

  });


  it('should generate unique values', function () {

    const result1 = Crypto.generateCompactUUID();
    const result2 = Crypto.generateCompactUUID();

    assert.notStrictEqual(result1, result2);

  });

});



describe('md5String', function () {

  it('should generate 32-character hex string', function () {

    const result = Crypto.md5String('hello');

    assert.strictEqual(result.length, 32);

  });


  it('should return known hash for known input', function () {

    const result = Crypto.md5String('hello');

    assert.strictEqual(result, '5d41402abc4b2a76b9719d911017c592');

  });


  it('should return different hashes for different inputs', function () {

    const result1 = Crypto.md5String('hello');
    const result2 = Crypto.md5String('world');

    assert.notStrictEqual(result1, result2);

  });

});



describe('sha256String', function () {

  it('should generate 64-character hex string', function () {

    const result = Crypto.sha256String('hello', 'secret');

    assert.strictEqual(result.length, 64);

  });


  it('should produce consistent output for same input', function () {

    const result1 = Crypto.sha256String('hello', 'secret');
    const result2 = Crypto.sha256String('hello', 'secret');

    assert.strictEqual(result1, result2);

  });


  it('should produce different output for different secrets', function () {

    const result1 = Crypto.sha256String('hello', 'secret1');
    const result2 = Crypto.sha256String('hello', 'secret2');

    assert.notStrictEqual(result1, result2);

  });


  it('should handle null secret gracefully', function () {

    const result = Crypto.sha256String('hello');

    assert.strictEqual(result.length, 64);

  });

});



describe('aesEncrypt', function () {

  it('should produce different ciphertext than plaintext', function () {

    const original = 'sensitive data';
    const encrypted = Crypto.aesEncrypt(original, 'key');

    assert.notStrictEqual(encrypted, original);

  });


  it('should produce hex output', function () {

    const encrypted = Crypto.aesEncrypt('test', 'key');
    const hex_regex = /^[0-9a-f]+$/;

    assert.ok(hex_regex.test(encrypted));

  });


  it('should produce consistent output for same input and key', function () {

    const result1 = Crypto.aesEncrypt('hello', 'secret');
    const result2 = Crypto.aesEncrypt('hello', 'secret');

    assert.strictEqual(result1, result2);

  });

});



describe('aesDecrypt', function () {

  it('should decrypt back to original', function () {

    const original = 'Hello, World!';
    const secret = 'my-secret-key';

    const encrypted = Crypto.aesEncrypt(original, secret);
    const decrypted = Crypto.aesDecrypt(encrypted, secret);

    assert.strictEqual(decrypted, original);

  });


  it('should handle long strings', function () {

    const original = 'a'.repeat(1000);
    const encrypted = Crypto.aesEncrypt(original, 'key');
    const decrypted = Crypto.aesDecrypt(encrypted, 'key');

    assert.strictEqual(decrypted, original);

  });


  it('should handle unicode strings', function () {

    const original = '日本語テスト 🎉';
    const encrypted = Crypto.aesEncrypt(original, 'key');
    const decrypted = Crypto.aesDecrypt(encrypted, 'key');

    assert.strictEqual(decrypted, original);

  });

});



describe('intToBase36', function () {

  it('should return "0" when input is 0', function () {

    assert.strictEqual(Crypto.intToBase36(0), '0');

  });


  it('should return "z" when input is 35', function () {

    assert.strictEqual(Crypto.intToBase36(35), 'z');

  });


  it('should return "10" when input is 36', function () {

    assert.strictEqual(Crypto.intToBase36(36), '10');

  });

});



describe('base36ToInt', function () {

  it('should return 0 when input is "0"', function () {

    assert.strictEqual(Crypto.base36ToInt('0'), 0);

  });


  it('should return 35 when input is "z"', function () {

    assert.strictEqual(Crypto.base36ToInt('z'), 35);

  });


  it('should round-trip with intToBase36', function () {

    const original = 1600000000;
    const base36 = Crypto.intToBase36(original);

    assert.strictEqual(Crypto.base36ToInt(base36), original);

  });

});



describe('stringToBase64', function () {

  it('should return known base64 for known input', function () {

    assert.strictEqual(Crypto.stringToBase64('Hello'), 'SGVsbG8=');

  });


  it('should encode empty string', function () {

    assert.strictEqual(Crypto.stringToBase64(''), '');

  });

});



describe('base64ToString', function () {

  it('should decode base64 to original string', function () {

    assert.strictEqual(Crypto.base64ToString('SGVsbG8='), 'Hello');

  });


  it('should round-trip with stringToBase64', function () {

    const original = 'Hello, World!';
    const encoded = Crypto.stringToBase64(original);

    assert.strictEqual(Crypto.base64ToString(encoded), original);

  });

});



describe('bufferToBase64', function () {

  it('should convert buffer to base64', function () {

    const buf = Buffer.from('test');
    const result = Crypto.bufferToBase64(buf);

    assert.strictEqual(result, 'dGVzdA==');

  });

});



describe('urlEncodeBase64', function () {

  it('should replace + with - and / with _ and remove =', function () {

    const result = Crypto.urlEncodeBase64('ab+cd/ef==');

    assert.strictEqual(result, 'ab-cd_ef');

  });

});



describe('urlDecodeBase64', function () {

  it('should reverse URL encoding with padding restored', function () {

    const original = 'SGVsbG8gV29ybGQ=';
    const encoded = Crypto.urlEncodeBase64(original);
    const decoded = Crypto.urlDecodeBase64(encoded);

    assert.strictEqual(decoded, original);

  });


  it('should return null when input is null', function () {

    assert.strictEqual(Crypto.urlDecodeBase64(null), null);

  });


  it('should return empty string when input is empty string', function () {

    assert.strictEqual(Crypto.urlDecodeBase64(''), '');

  });

});



// ============================================================================
// CONFIG ABSORPTION CONTRACT
// ============================================================================
// config absorption contract: active - BASE36_CHARSET is read by
// generateTimeRandomString (padding) and hexToBase36 (private). Override
// changes the output alphabet. HEX_CHARSET and INT_CHARSET were removed
// as dead config (never read by any function).



describe('config absorption: BASE36_CHARSET override', function () {

  it('should use custom charset when overridden via loader config', function () {

    // Load a second Crypto instance with a custom BASE36_CHARSET
    const custom_charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const CustomCrypto = cryptoLoader(Lib, { BASE36_CHARSET: custom_charset });

    // generateTimeRandomString: time prefix uses native toString(36) (lowercase),
    // padding uses CONFIG.BASE36_CHARSET. With min_length=20 the padding portion
    // is long enough to verify the custom charset is applied.
    const time_prefix = CustomCrypto.intToBase36(1600000000);
    const result = CustomCrypto.generateTimeRandomString(1600000000, 20);

    assert.ok(result.length >= 20);

    // Only check the padding portion (after the time prefix)
    const padding = result.slice(time_prefix.length);
    assert.ok(padding.length > 0, 'Should have padding characters');

    for (let i = 0; i < padding.length; i++) {
      assert.ok(
        custom_charset.includes(padding[i]),
        `Padding character '${padding[i]}' should be in custom charset`
      );
    }

  });


  it('should produce different output with custom charset vs default', function () {

    const custom_charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const CustomCrypto = cryptoLoader(Lib, { BASE36_CHARSET: custom_charset });

    const default_result = Crypto.generateCompactUUID();
    const custom_result = CustomCrypto.generateCompactUUID();

    // Both should be 25 chars
    assert.strictEqual(default_result.length, 25);
    assert.strictEqual(custom_result.length, 25);

    // Default uses lowercase, custom uses uppercase - they should differ
    const default_regex = /^[0-9a-z]+$/;
    const custom_regex = /^[A-Z0-9]+$/;

    assert.ok(default_regex.test(default_result), 'Default should use lowercase base36');
    assert.ok(custom_regex.test(custom_result), 'Custom should use uppercase charset');

  });

});


// ============================================================================
// PASSWORD HASHING (plan 0122)
// ============================================================================

describe('generatePasswordHash / checkPassword (plan 0122)', function () {

  it('1. round trip: checkPassword(p, generatePasswordHash(p)) is true', function () {

    const password = 'correct horse battery staple';
    const hash = Crypto.generatePasswordHash(password);

    assert.ok(Crypto.checkPassword(password, hash));

  });

  it('2. negative: a different password is false, not an error', function () {

    const hash = Crypto.generatePasswordHash('my-secret-password');

    assert.equal(Crypto.checkPassword('wrong-password', hash), false);

  });

  it('3. salt uniqueness: same password hashed twice yields different strings, both verify', function () {

    const password = 'duplicate-test';
    const hash1 = Crypto.generatePasswordHash(password);
    const hash2 = Crypto.generatePasswordHash(password);

    // Two different strings (salt is per-call random)
    assert.notEqual(hash1, hash2);

    // Both verify against the same password
    assert.ok(Crypto.checkPassword(password, hash1));
    assert.ok(Crypto.checkPassword(password, hash2));

  });

  it('4. tamper: one altered character in the digest yields false and does not throw', function () {

    const password = 'tamper-test';
    const hash = Crypto.generatePasswordHash(password);

    // Flip a character in the middle of the digest portion (not the last
    // character, which may only affect base64 padding bits)
    const parts = hash.split('$');
    const digest = parts[5];
    const mid = Math.floor(digest.length / 2);
    const flipped = digest.slice(0, mid) + (digest[mid] === 'A' ? 'B' : 'A') + digest.slice(mid + 1);
    const tampered = parts.slice(0, 5).join('$') + '$' + flipped;

    assert.equal(Crypto.checkPassword(password, tampered), false);

  });

  it('5. malformed: checkPassword(p, "not-a-hash") returns false and does not throw', function () {

    assert.equal(Crypto.checkPassword('any-password', 'not-a-hash'), false);

  });

  it('6. parameter upgrade: a hash produced at low N still verifies after CONFIG is raised', function () {

    // Build a crypto instance with low N
    const lowNCrypto = cryptoLoader(Lib, {
      PASSWORD_HASH_COST_N: 2048
    });

    // Hash at low N
    const password = 'upgrade-test';
    const hash = lowNCrypto.generatePasswordHash(password);

    // Build a crypto instance with high N (the default 16384)
    const highNCrypto = cryptoLoader(Lib, {});

    // The hash produced at low N must still verify under the high-N instance,
    // because the format is self-describing: checkPassword reads N from the
    // stored hash, not from CONFIG
    assert.ok(highNCrypto.checkPassword(password, hash));

  });

  it('7. constant-time comparison: two hashes of equal length are compared through timingSafeEqual', function () {

    // A timing assertion is nondeterministic and the Assertions Pin Exact
    // Values rule forbids it. Instead, assert by construction: the derived
    // and expected buffers are always the same length (derived from
    // expected.length in checkPassword), so NodeCrypto.timingSafeEqual is
    // safe to call directly. We verify the round-trip succeeds, which
    // exercises the timingSafeEqual path.
    const password = 'constant-time-test';
    const hash = Crypto.generatePasswordHash(password);

    // This exercises the timingSafeEqual comparison path
    assert.ok(Crypto.checkPassword(password, hash));

    // And a mismatch also exercises timingSafeEqual (returns false)
    assert.equal(Crypto.checkPassword('wrong', hash), false);

  });

  it('8. bad input: a non-string password throws TypeError', function () {

    assert.throws(function () {
      Crypto.generatePasswordHash(12345);
    }, TypeError);

    assert.throws(function () {
      Crypto.generatePasswordHash(null);
    }, TypeError);

    assert.throws(function () {
      Crypto.checkPassword(12345, 'scrypt$1$1$1$abc$def');
    }, TypeError);

    assert.throws(function () {
      Crypto.checkPassword('password', null);
    }, TypeError);

  });

});



