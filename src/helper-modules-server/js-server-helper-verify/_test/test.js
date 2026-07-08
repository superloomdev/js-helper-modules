// Tests for helper-verify
// Offline module - storage adapter is injected per-test (in-memory implementation).
// process.env is NEVER accessed in test files - only in loader.js
'use strict';

const assert = require('node:assert/strict');
const { describe, it } = require('node:test');

// Load all dependencies via test loader (mirrors main project loader pattern)
const { Lib } = require('./loader')();

// Verify module under test - constructed per-case with its own adapter
const VerifyFactory = require('helper-verify');

// In-process Map-backed store fixture (Tier-2 enabler)
const createMemoryStore = require('./memory-store');


// Helper - shorthand to construct a verify instance backed by an injected
// store fixture. The ready-to-use store object is passed directly.
const buildVerify = function (store) {
  return VerifyFactory(Lib, {
    Store: store
  });
};


const validBaseConfig = function () {
  return {
    Store: createMemoryStore()
  };
};


// Build an adapter that returns failure for every method - used to test
// error propagation paths through the verify module.
const createFailingStore = function () {

  return {

    getRecord: async function () {
      return {
        success: false,
        record: null,
        error: { type: 'STORE_READ_FAILED', message: 'read failed (test fixture)' }
      };
    },

    setRecord: async function () {
      return {
        success: false,
        error: { type: 'STORE_WRITE_FAILED', message: 'write failed (test fixture)' }
      };
    },

    incrementFailCount: async function () {
      return {
        success: false,
        error: { type: 'STORE_INCREMENT_FAILED', message: 'inc failed (test fixture)' }
      };
    },

    deleteRecord: async function () {
      return {
        success: false,
        error: { type: 'STORE_DELETE_FAILED', message: 'delete failed (test fixture)' }
      };
    }

  };

};


// Wait until every background routine on the instance has signalled completion.
// Background deletes are fire-and-forget; this lets a test assert their effect.
const waitForBackgroundQueue = async function (instance) {
  while (Lib.Instance.getBackgroundQueueCount(instance) > 0) {
    await new Promise(function (resolve) { setImmediate(resolve); });
  }
};


// Default options helpers - keep tests focused on the behavior under test.
const defaultCreateOptions = function (overrides) {
  return Object.assign({
    scope: 'user.123',
    key: 'login-phone.+12345',
    length: 6,
    ttl_seconds: 300,
    cooldown_seconds: 60
  }, overrides || {});
};

const defaultVerifyOptions = function (overrides) {
  return Object.assign({
    scope: 'user.123',
    key: 'login-phone.+12345',
    value: '000000',
    max_fail_count: 3
  }, overrides || {});
};



// ============================================================================
// 1. LOADER VALIDATION
// ============================================================================

describe('Loader validation', function () {

  it('throws when CONFIG.Store is missing', function () {
    assert.throws(function () {
      VerifyFactory(Lib, {});
    }, /CONFIG\.Store is required/);
  });


  it('throws when CONFIG.Store is null', function () {
    assert.throws(function () {
      VerifyFactory(Lib, { Store: null });
    }, /CONFIG\.Store is required/);
  });


  it('throws when CONFIG.Store is not an object', function () {
    assert.throws(function () {
      VerifyFactory(Lib, { Store: 'sqlite' });
    }, /CONFIG\.Store is required and must be a ready-to-use store object/);
  });


  it('constructs successfully with a valid ready-to-use store object', function () {
    const verify = buildVerify(createMemoryStore());
    assert.strictEqual(typeof verify.createPin, 'function');
    assert.strictEqual(typeof verify.createCode, 'function');
    assert.strictEqual(typeof verify.createToken, 'function');
    assert.strictEqual(typeof verify.verify, 'function');
    assert.strictEqual(typeof verify.cleanupExpiredRecords, 'function');
    assert.strictEqual(typeof verify.setupNewStore, 'function');
  });

});



// ============================================================================
// 2. STORE CONTRACT VALIDATION
// ============================================================================

describe('Store contract validation', function () {

  it('throws when store is missing getRecord method', function () {
    const store = createMemoryStore();
    delete store.getRecord;

    assert.throws(function () {
      buildVerify(store);
    }, /Invalid store contract: missing method `getRecord`/);
  });


  it('throws when store is missing setRecord method', function () {
    const store = createMemoryStore();
    delete store.setRecord;

    assert.throws(function () {
      buildVerify(store);
    }, /Invalid store contract: missing method `setRecord`/);
  });


  it('throws when store is missing incrementFailCount method', function () {
    const store = createMemoryStore();
    delete store.incrementFailCount;

    assert.throws(function () {
      buildVerify(store);
    }, /Invalid store contract: missing method `incrementFailCount`/);
  });


  it('throws when store is missing deleteRecord method', function () {
    const store = createMemoryStore();
    delete store.deleteRecord;

    assert.throws(function () {
      buildVerify(store);
    }, /Invalid store contract: missing method `deleteRecord`/);
  });


  it('throws when store method is not a function', function () {
    const store = createMemoryStore();
    store.getRecord = 'not a function';

    assert.throws(function () {
      buildVerify(store);
    }, /Invalid store contract: missing method `getRecord`/);
  });


  it('accepts a valid store with all required methods', function () {
    const store = createMemoryStore();

    // Should not throw
    const verify = buildVerify(store);

    assert.strictEqual(typeof verify.createPin, 'function');
    assert.strictEqual(typeof verify.verify, 'function');
  });

});



// ============================================================================
// 4. CHARSETS - createPin / createCode / createToken
// ============================================================================

describe('createPin', function () {

  it('should return a numeric code of requested length', async function () {
    const Verify = buildVerify(createMemoryStore());
    const instance = Lib.Instance.initialize();

    const result = await Verify.createPin(instance, defaultCreateOptions({ length: 6 }));

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.code.length, 6);
    assert.match(result.code, /^[0-9]+$/);
    assert.strictEqual(result.error, null);
  });


  it('should set expires_at to now + ttl_seconds', async function () {
    const Verify = buildVerify(createMemoryStore());
    const instance = Lib.Instance.initialize();

    const result = await Verify.createPin(instance, defaultCreateOptions({ ttl_seconds: 300 }));

    assert.strictEqual(result.expires_at, instance['time'] + 300);
  });

});



describe('createCode', function () {

  it('should return a Crockford Base32 code of requested length', async function () {
    const Verify = buildVerify(createMemoryStore());
    const instance = Lib.Instance.initialize();

    const result = await Verify.createCode(instance, defaultCreateOptions({ length: 8 }));

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.code.length, 8);
    assert.match(result.code, /^[0-9A-HJKMNP-TV-Z]+$/);
  });


  it('should never include lookalike characters I, L, O, U', async function () {
    const Verify = buildVerify(createMemoryStore());

    // Generate many codes to make a missing-char failure very likely if the charset is wrong
    for (let i = 0; i < 50; i++) {
      const instance = Lib.Instance.initialize();
      const result = await Verify.createCode(instance, defaultCreateOptions({
        scope: 'sweep',
        key: 'iter.' + i,
        length: 12
      }));
      assert.strictEqual(result.success, true);
      assert.doesNotMatch(result.code, /[ILOU]/);
    }
  });

});



describe('createToken', function () {

  it('should return a URL-safe alphanumeric token of requested length', async function () {
    const Verify = buildVerify(createMemoryStore());
    const instance = Lib.Instance.initialize();

    const result = await Verify.createToken(instance, defaultCreateOptions({ length: 32 }));

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.code.length, 32);
    assert.match(result.code, /^[a-zA-Z0-9]+$/);
  });

});



// ============================================================================
// 3. COOLDOWN ENFORCEMENT
// ============================================================================

describe('Cooldown enforcement', function () {

  it('should block a second create inside the cooldown window', async function () {
    const Verify = buildVerify(createMemoryStore());
    const instance = Lib.Instance.initialize();
    const options = defaultCreateOptions({ cooldown_seconds: 60 });

    const first = await Verify.createPin(instance, options);
    const second = await Verify.createPin(instance, options);

    assert.strictEqual(first.success, true);
    assert.strictEqual(second.success, false);
    assert.strictEqual(second.error.type, 'VERIFY_COOLDOWN_ACTIVE');
    assert.strictEqual(second.code, null);
  });


  it('should allow a second create after the cooldown window elapses', async function () {
    const Verify = buildVerify(createMemoryStore());
    const instance = Lib.Instance.initialize();
    const options = defaultCreateOptions({ cooldown_seconds: 60 });

    const first = await Verify.createPin(instance, options);

    // Simulate 70 seconds of clock advance
    instance['time'] = instance['time'] + 70;

    const second = await Verify.createPin(instance, options);

    assert.strictEqual(first.success, true);
    assert.strictEqual(second.success, true);
    assert.notStrictEqual(first.code, second.code);
  });


  it('should treat cooldown_seconds=0 as no cooldown', async function () {
    const Verify = buildVerify(createMemoryStore());
    const instance = Lib.Instance.initialize();
    const options = defaultCreateOptions({ cooldown_seconds: 0 });

    const first = await Verify.createPin(instance, options);
    const second = await Verify.createPin(instance, options);

    assert.strictEqual(first.success, true);
    assert.strictEqual(second.success, true);
  });

});



// ============================================================================
// 6. VERIFY - HAPPY PATH
// ============================================================================

describe('verify - happy path', function () {

  it('should return success=true when value matches the stored code', async function () {
    const store = createMemoryStore();
    const Verify = buildVerify(store);
    const instance = Lib.Instance.initialize();

    const created = await Verify.createPin(instance, defaultCreateOptions());
    const result = await Verify.verify(instance, defaultVerifyOptions({ value: created.code }));

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.error, null);
  });


  it('should delete the record after a successful match (one-time use)', async function () {
    const store = createMemoryStore();
    const Verify = buildVerify(store);
    const instance = Lib.Instance.initialize();

    const created = await Verify.createPin(instance, defaultCreateOptions());
    assert.strictEqual(store._records.size, 1);

    await Verify.verify(instance, defaultVerifyOptions({ value: created.code }));
    await waitForBackgroundQueue(instance);

    assert.strictEqual(store._records.size, 0);
  });


  it('should reject the same value on a second verify call (record gone)', async function () {
    const store = createMemoryStore();
    const Verify = buildVerify(store);
    const instance = Lib.Instance.initialize();

    const created = await Verify.createPin(instance, defaultCreateOptions());
    await Verify.verify(instance, defaultVerifyOptions({ value: created.code }));
    await waitForBackgroundQueue(instance);

    const replay = await Verify.verify(instance, defaultVerifyOptions({ value: created.code }));

    assert.strictEqual(replay.success, false);
    assert.strictEqual(replay.error.type, 'VERIFY_NOT_FOUND');
  });

});



// ============================================================================
// 7. VERIFY - REJECTION PATHS
// ============================================================================

describe('verify - rejection paths', function () {

  it('should return NOT_FOUND error when no record exists for scope+key', async function () {
    const Verify = buildVerify(createMemoryStore());
    const instance = Lib.Instance.initialize();

    const result = await Verify.verify(instance, defaultVerifyOptions({ value: '999999' }));

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error.type, 'VERIFY_NOT_FOUND');
  });


  it('should return EXPIRED error when current time is past expiry', async function () {
    const Verify = buildVerify(createMemoryStore());
    const instance = Lib.Instance.initialize();

    const created = await Verify.createPin(instance, defaultCreateOptions({ ttl_seconds: 60 }));

    // Advance the clock past expiry
    instance['time'] = instance['time'] + 120;

    const result = await Verify.verify(instance, defaultVerifyOptions({ value: created.code }));

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error.type, 'VERIFY_EXPIRED');
  });


  it('should return WRONG_VALUE error when value does not match', async function () {
    const Verify = buildVerify(createMemoryStore());
    const instance = Lib.Instance.initialize();

    await Verify.createPin(instance, defaultCreateOptions());
    const result = await Verify.verify(instance, defaultVerifyOptions({ value: 'wrong!' }));

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error.type, 'VERIFY_WRONG_VALUE');
  });


  it('should increment fail count on every wrong value submission', async function () {
    const store = createMemoryStore();
    const Verify = buildVerify(store);
    const instance = Lib.Instance.initialize();

    await Verify.createPin(instance, defaultCreateOptions());

    await Verify.verify(instance, defaultVerifyOptions({ value: 'wrong1' }));
    await Verify.verify(instance, defaultVerifyOptions({ value: 'wrong2' }));

    const stored = store._records.get('user.123::login-phone.+12345');
    assert.strictEqual(stored.fail_count, 2);
  });


  it('should return MAX_FAILS error once fail_count reaches max_fail_count', async function () {
    const Verify = buildVerify(createMemoryStore());
    const instance = Lib.Instance.initialize();

    const created = await Verify.createPin(instance, defaultCreateOptions());

    // Three wrong attempts trip the counter
    await Verify.verify(instance, defaultVerifyOptions({ value: 'wrong1', max_fail_count: 3 }));
    await Verify.verify(instance, defaultVerifyOptions({ value: 'wrong2', max_fail_count: 3 }));
    await Verify.verify(instance, defaultVerifyOptions({ value: 'wrong3', max_fail_count: 3 }));

    // Even the right value is now refused
    const result = await Verify.verify(instance, defaultVerifyOptions({ value: created.code, max_fail_count: 3 }));

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error.type, 'VERIFY_MAX_FAILS');
  });

});



// ============================================================================
// 6. ADAPTER ERROR PROPAGATION
// ============================================================================

describe('Adapter error propagation', function () {

  it('should surface SERVICE_UNAVAILABLE when createPin cooldown lookup fails', async function () {
    const Verify = buildVerify(createFailingStore());
    const instance = Lib.Instance.initialize();

    const result = await Verify.createPin(instance, defaultCreateOptions());

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error.type, 'VERIFY_SERVICE_UNAVAILABLE');
  });


  it('should surface SERVICE_UNAVAILABLE when setRecord fails', async function () {
    // Mix: getRecord works (no existing record), setRecord fails
    const failing_store = createMemoryStore();
    failing_store.setRecord = async function () {
      return {
        success: false,
        error: { type: 'STORE_WRITE_FAILED', message: 'forced write failure' }
      };
    };

    const Verify = buildVerify(failing_store);
    const instance = Lib.Instance.initialize();

    const result = await Verify.createPin(instance, defaultCreateOptions());

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error.type, 'VERIFY_SERVICE_UNAVAILABLE');
  });


  it('should surface SERVICE_UNAVAILABLE when verify lookup fails', async function () {
    const Verify = buildVerify(createFailingStore());
    const instance = Lib.Instance.initialize();

    const result = await Verify.verify(instance, defaultVerifyOptions({ value: 'anything' }));

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error.type, 'VERIFY_SERVICE_UNAVAILABLE');
  });


  it('should not error out when incrementFailCount fails', async function () {
    // Create succeeds (in-memory), but incrementFailCount is broken
    const store = createMemoryStore();
    store.incrementFailCount = async function () {
      return {
        success: false,
        error: { type: 'STORE_INCREMENT_FAILED', message: 'forced inc failure' }
      };
    };

    const Verify = buildVerify(store);
    const instance = Lib.Instance.initialize();

    await Verify.createPin(instance, defaultCreateOptions());
    const result = await Verify.verify(instance, defaultVerifyOptions({ value: 'wrong!' }));

    // Verify still surfaces WRONG_VALUE - increment failure is logged, not surfaced
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error.type, 'VERIFY_WRONG_VALUE');
  });

});



// ============================================================================
// 9. INPUT VALIDATION
// ============================================================================

describe('Input validation (programmer errors throw, never returned as envelope)', function () {

  it('should throw TypeError on createPin when scope is missing', async function () {
    const Verify = buildVerify(createMemoryStore());
    const instance = Lib.Instance.initialize();

    await assert.rejects(
      Verify.createPin(instance, defaultCreateOptions({ scope: '' })),
      { name: 'TypeError', message: /scope is required/ }
    );
  });


  it('should throw TypeError on createPin when length is zero', async function () {
    const Verify = buildVerify(createMemoryStore());
    const instance = Lib.Instance.initialize();

    await assert.rejects(
      Verify.createPin(instance, defaultCreateOptions({ length: 0 })),
      { name: 'TypeError', message: /length must be a positive integer/ }
    );
  });


  it('should throw TypeError on createPin when ttl_seconds is missing', async function () {
    const Verify = buildVerify(createMemoryStore());
    const instance = Lib.Instance.initialize();

    const options = defaultCreateOptions();
    delete options.ttl_seconds;

    await assert.rejects(
      Verify.createPin(instance, options),
      { name: 'TypeError', message: /ttl_seconds must be a positive integer/ }
    );
  });


  it('should throw TypeError on verify when value is missing', async function () {
    const Verify = buildVerify(createMemoryStore());
    const instance = Lib.Instance.initialize();

    const options = defaultVerifyOptions();
    delete options.value;

    await assert.rejects(
      Verify.verify(instance, options),
      { name: 'TypeError', message: /value is required/ }
    );
  });


  it('should throw TypeError on verify when max_fail_count is missing', async function () {
    const Verify = buildVerify(createMemoryStore());
    const instance = Lib.Instance.initialize();

    const options = defaultVerifyOptions();
    delete options.max_fail_count;

    await assert.rejects(
      Verify.verify(instance, options),
      { name: 'TypeError', message: /max_fail_count must be a positive integer/ }
    );
  });

});



// ============================================================================
// 9. CLEANUP EXPIRED RECORDS
// ============================================================================

describe('cleanupExpiredRecords', function () {

  it('should throw when adapter does not implement cleanupExpiredRecords', async function () {
    // Use a stripped store that has no cleanupExpiredRecords method
    const stripped_store = createMemoryStore();
    delete stripped_store.cleanupExpiredRecords;
    const Verify = buildVerify(stripped_store);
    const instance = Lib.Instance.initialize();

    await assert.rejects(
      () => Verify.cleanupExpiredRecords(instance),
      /store does not implement cleanupExpiredRecords/
    );
  });


  it('should delegate to adapter and return its result', async function () {
    const store = createMemoryStore();
    store.cleanupExpiredRecords = async function () {
      return { success: true, deleted_count: 5, error: null };
    };

    const Verify = buildVerify(store);
    const instance = Lib.Instance.initialize();

    const result = await Verify.cleanupExpiredRecords(instance);

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.deleted_count, 5);
    assert.strictEqual(result.error, null);
  });


  it('should pass instance to the adapter', async function () {
    const store = createMemoryStore();
    let received_instance = null;
    store.cleanupExpiredRecords = async function (inst) {
      received_instance = inst;
      return { success: true, deleted_count: 0, error: null };
    };

    const Verify = buildVerify(store);
    const instance = Lib.Instance.initialize();

    await Verify.cleanupExpiredRecords(instance);

    assert.strictEqual(received_instance, instance);
  });


  it('should catch adapter exceptions and return SERVICE_UNAVAILABLE', async function () {
    const store = createMemoryStore();
    store.cleanupExpiredRecords = async function () {
      throw new Error('database connection lost');
    };

    const Verify = buildVerify(store);
    const instance = Lib.Instance.initialize();

    const result = await Verify.cleanupExpiredRecords(instance);

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.deleted_count, 0);
    assert.strictEqual(result.error.type, 'VERIFY_SERVICE_UNAVAILABLE');
  });


  it('should pass through adapter failure envelope when adapter returns success=false', async function () {
    const store = createMemoryStore();
    store.cleanupExpiredRecords = async function () {
      return {
        success: false,
        deleted_count: 0,
        error: { type: 'SERVICE_UNAVAILABLE', message: 'permission denied' }
      };
    };

    const Verify = buildVerify(store);
    const instance = Lib.Instance.initialize();

    const result = await Verify.cleanupExpiredRecords(instance);

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error.type, 'SERVICE_UNAVAILABLE');
  });

});



// ============================================================================
// 11. FACTORY PATTERN
// ============================================================================

describe('Factory pattern', function () {

  it('should produce independent instances with isolated stores', async function () {
    const store_a = createMemoryStore();
    const store_b = createMemoryStore();
    const Verify_A = buildVerify(store_a);
    const Verify_B = buildVerify(store_b);

    const instance = Lib.Instance.initialize();

    await Verify_A.createPin(instance, defaultCreateOptions({ scope: 'tenant.a' }));
    await Verify_B.createPin(instance, defaultCreateOptions({ scope: 'tenant.b' }));

    assert.strictEqual(store_a._records.size, 1);
    assert.strictEqual(store_b._records.size, 1);
    assert.notStrictEqual(Verify_A, Verify_B);
  });

});



// ============================================================================
// 12. CONFIG ABSORPTION CONTRACT
// ============================================================================

describe('config absorption contract', function () {

  // Sanity anchor: valid baseline must construct cleanly.
  it('constructs with a valid baseline config', function () {
    assert.doesNotThrow(function () { VerifyFactory(Lib, validBaseConfig()); });
  });

  // OVERRIDE WINS: override PIN_CHARSET to a single character 'X' - every
  // generated digit must be 'X', proving the override reached CONFIG.
  it('absorbs a PIN_CHARSET override that changes generated output', async function () {
    const verify = VerifyFactory(Lib, Object.assign(validBaseConfig(), { PIN_CHARSET: 'X' }));
    const instance = Lib.Instance.initialize();
    const result = await verify.createPin(instance, defaultCreateOptions({ length: 6 }));
    assert.strictEqual(result.success, true);
    assert.match(result.code, /^X{6}$/);
  });

  // NULL HONORED (0032 canary): PIN_CHARSET default is '0123456789' (non-null);
  // explicit null must be seen as null. With Object.assign, Crypto.generateRandomString
  // receives null and returns '' (empty string). With the buggy overrideObject, the
  // default charset is kept and a 6-digit code is returned.
  it('honors an explicit null override of PIN_CHARSET (a key with a non-null default)', async function () {
    const verify = VerifyFactory(Lib, Object.assign(validBaseConfig(), { PIN_CHARSET: null }));
    const instance = Lib.Instance.initialize();
    const result = await verify.createPin(instance, defaultCreateOptions({ length: 6 }));
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.code, '');
  });

  // OMISSION KEEPS DEFAULT: omitting PIN_CHARSET falls back to '0123456789'.
  it('retains the default PIN_CHARSET when the key is omitted from the override', async function () {
    const cfg = validBaseConfig();
    delete cfg.PIN_CHARSET;
    const verify = VerifyFactory(Lib, cfg);
    const instance = Lib.Instance.initialize();
    const result = await verify.createPin(instance, defaultCreateOptions({ length: 6 }));
    assert.strictEqual(result.success, true);
    assert.match(result.code, /^[0-9]{6}$/);
  });

});
