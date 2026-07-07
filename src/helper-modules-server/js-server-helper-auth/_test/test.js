// Info: Pure-helper tests for helper-auth. Exercises every
// stateless part (auth-id, record-shape, cookie, token-source, policy)
// directly via its factory + a small set of loader-validation cases
// using the in-process memory store (no DB driver required).
'use strict';

const assert = require('node:assert/strict');
const { describe, it } = require('node:test');

const { Lib } = require('./loader')();

const AuthFactory   = require('helper-auth');
const MemoryStore   = require('./memory-store');
const ERRORS        = require('../auth.errors');
const CONFIG_STUB   = {};

const PolicyFactory      = require('../parts/policy.js');
const RecordShapeFactory = require('../parts/record-shape.js');
const AuthIdFactory      = require('../parts/auth-id.js');
const TokenSourceFactory = require('../parts/token-source.js');


const buildInstance = function (time_seconds) {

  const instance = Lib.Instance.initialize();
  if (typeof time_seconds === 'number') {
    instance.time = time_seconds;
    instance.time_ms = time_seconds * 1000;
  }
  return instance;

};


const validBaseConfig = function () {
  return {
    Store:        MemoryStore,
    ACTOR_TYPE:   'user',
    TTL_SECONDS:  3600,
    LIMITS:       { total_max: 5, evict_oldest_on_limit: true }
  };
};


// ============================================================================
// LOADER VALIDATION (uses in-process memory store - no DB driver needed)
// ============================================================================

describe('loader validation', function () {

  it('throws when Store is missing', function () {

    assert.throws(function () {
      AuthFactory(Lib, { ACTOR_TYPE: 'user' });
    }, /CONFIG\.Store must be a ready-to-use store object/);

  });

  it('throws when Store is not an object', function () {

    assert.throws(function () {
      AuthFactory(Lib, { Store: 'sqlite', ACTOR_TYPE: 'user' });
    }, /CONFIG\.Store must be a ready-to-use store object/);

  });

  it('throws when ACTOR_TYPE is missing', function () {

    assert.throws(function () {
      AuthFactory(Lib, { Store: MemoryStore });
    }, /CONFIG\.ACTOR_TYPE is required/);

  });

  it('throws when ENABLE_JWT is true without a valid JWT.signing_key', function () {

    // Missing JWT block entirely
    assert.throws(function () {
      AuthFactory(Lib, {
        Store: MemoryStore,
        ACTOR_TYPE: 'user',
        ENABLE_JWT: true,
        JWT: null,
        TTL_SECONDS: 3600,
        LIMITS: { total_max: 5, evict_oldest_on_limit: true }
      });
    }, /CONFIG\.JWT must be a plain object/);

    // Signing key too short
    assert.throws(function () {
      AuthFactory(Lib, {
        Store: MemoryStore,
        ACTOR_TYPE: 'user',
        ENABLE_JWT: true,
        JWT: { signing_key: 'short', issuer: 'test', audience: 'test' },
        TTL_SECONDS: 3600,
        LIMITS: { total_max: 5, evict_oldest_on_limit: true }
      });
    }, /CONFIG\.JWT\.signing_key must be a string of at least 32 chars/);

  });

  it('throws when store is missing a required method', function () {

    // Create a store missing 'deleteSessions'
    const partialStore = {
      getSession: async function () {},
      setSession: async function () {},
      listSessionsByActor: async function () {},
      deleteSession: async function () {},
      updateSessionActivity: async function () {}
      // missing deleteSessions
    };

    assert.throws(function () {
      AuthFactory(Lib, {
        Store: partialStore,
        ACTOR_TYPE: 'user'
      });
    }, /Invalid store contract: missing method `deleteSessions`/);

  });

  it('throws when store method is not a function', function () {

    // Create a store with non-function 'setSession'
    const badStore = {
      getSession: async function () {},
      setSession: 'not-a-function',
      listSessionsByActor: async function () {},
      deleteSession: async function () {},
      deleteSessions: async function () {},
      updateSessionActivity: async function () {}
    };

    assert.throws(function () {
      AuthFactory(Lib, {
        Store: badStore,
        ACTOR_TYPE: 'user'
      });
    }, /Invalid store contract: missing method `setSession`/);

  });

  it('accepts a store with all required methods', function () {

    // Create a valid store with all 6 required methods
    const validStore = {
      getSession: async function () {},
      setSession: async function () {},
      listSessionsByActor: async function () {},
      deleteSession: async function () {},
      deleteSessions: async function () {},
      updateSessionActivity: async function () {}
    };

    // Should not throw
    const auth = AuthFactory(Lib, {
      Store: validStore,
      ACTOR_TYPE: 'user'
    });

    assert.ok(auth);
    assert.equal(typeof auth.createSession, 'function');

  });

});



// ============================================================================
// CONFIG ABSORPTION CONTRACT
// ============================================================================

describe('config absorption contract', function () {

  // Sanity anchor: valid baseline must construct cleanly.
  it('constructs with a valid baseline config', function () {
    assert.doesNotThrow(function () { AuthFactory(Lib, validBaseConfig()); });
  });

  // OVERRIDE WINS: a negative TTL overrides the default 2592000 and fails
  // validation - proves the override reached the effective CONFIG.
  it('absorbs an override that changes the validation outcome', function () {
    assert.throws(function () {
      AuthFactory(Lib, Object.assign(validBaseConfig(), { TTL_SECONDS: -1 }));
    }, /TTL_SECONDS/);
  });

  // NULL HONORED (0032 canary): JWT default is a plain object; explicit null
  // must be seen as null. With Object.assign this throws; with the buggy
  // overrideObject it silently keeps the default and does NOT throw here.
  it('honors an explicit null override of JWT (a key with a non-null default)', function () {
    assert.throws(function () {
      AuthFactory(Lib, Object.assign(validBaseConfig(), { ENABLE_JWT: true, JWT: null }));
    }, /CONFIG\.JWT must be a plain object/);
  });

  // SHALLOW MERGE (intentional): a partial JWT object replaces the whole
  // default JWT object, so access_token_ttl_seconds is missing -> throws.
  it('replaces nested objects wholesale (shallow merge is intentional)', function () {
    assert.throws(function () {
      AuthFactory(Lib, Object.assign(validBaseConfig(), {
        ENABLE_JWT: true,
        JWT: { signing_key: 'x'.repeat(32), issuer: 'i', audience: 'a' }
      }));
    }, /access_token_ttl_seconds/);
  });

  // OMISSION KEEPS DEFAULT: LAST_ACTIVE_UPDATE_INTERVAL_SECONDS defaults to
  // 600; omitting it from the override must not throw.
  it('retains the default when an optional key is omitted from the override', function () {
    const cfg = validBaseConfig();
    delete cfg.LAST_ACTIVE_UPDATE_INTERVAL_SECONDS;
    assert.doesNotThrow(function () { AuthFactory(Lib, cfg); });
  });

});



// ============================================================================
// AUTH-ID HELPERS (pure)
// ============================================================================

describe('parts/auth-id', function () {

  const AuthId = AuthIdFactory(Lib, CONFIG_STUB, ERRORS);

  it('createAuthId joins parts with "-"', function () {

    const auth_id = AuthId.createAuthId({
      actor_id: 'a1', token_key: 'k1', token_secret: 's1'
    });
    assert.equal(auth_id, 'a1-k1-s1');

  });

  it('parseAuthId returns three parts on a well-formed string', function () {

    const parts = AuthId.parseAuthId('a1-k1-s1');
    assert.deepEqual(parts, { actor_id: 'a1', token_key: 'k1', token_secret: 's1' });

  });

  it('parseAuthId returns null on malformed input', function () {

    assert.equal(AuthId.parseAuthId(''), null);
    assert.equal(AuthId.parseAuthId(null), null);
    assert.equal(AuthId.parseAuthId('a1-k1'), null);
    assert.equal(AuthId.parseAuthId('a1-k1-s1-extra'), null);
    assert.equal(AuthId.parseAuthId('a1--s1'), null);

  });

  it('createAuthId rejects "-" or "#" inside actor_id', function () {

    assert.throws(function () {
      AuthId.createAuthId({ actor_id: 'bad-id', token_key: 'k', token_secret: 's' });
    }, /must not contain "-"/);
    assert.throws(function () {
      AuthId.createAuthId({ actor_id: 'bad#id', token_key: 'k', token_secret: 's' });
    }, /must not contain "#"/);

  });

  it('hashTokenSecret produces a deterministic 64-char hex string', function () {

    const h = AuthId.hashTokenSecret('secret', '');
    assert.equal(typeof h, 'string');
    assert.equal(h.length, 64);
    assert.match(h, /^[0-9a-f]{64}$/);
    assert.equal(h, AuthId.hashTokenSecret('secret', '')); // deterministic

  });

  it('composeSessionKey joins with "#"', function () {

    assert.equal(
      AuthId.composeSessionKey('a1', 'k1', 'h1'),
      'a1#k1#h1'
    );

  });

  it('composeMongoId prepends tenant_id with "#"', function () {

    assert.equal(
      AuthId.composeMongoId('t1', 'a1', 'k1', 'h1'),
      't1#a1#k1#h1'
    );

  });

});



// ============================================================================
// RECORD SHAPE
// ============================================================================

describe('parts/record-shape', function () {

  const RecordShape = RecordShapeFactory(Lib, CONFIG_STUB, ERRORS);

  it('buildRecord requires the identity + lifecycle fields', function () {

    assert.throws(function () { RecordShape.buildRecord({}); }, /tenant_id/);

  });

  it('buildRecord produces a fully populated canonical record', function () {

    const r = RecordShape.buildRecord({
      tenant_id: 't1',
      actor_id: 'a1',
      actor_type: 'user',
      token_key: 'k1',
      token_secret_hash: 'h1',
      created_at: 100,
      expires_at: 200,
      last_active_at: 100,
      install_platform: 'web',
      install_form_factor: 'desktop'
    });

    assert.equal(r.tenant_id, 't1');
    assert.equal(r.install_id, null);
    assert.equal(r.client_is_browser, false);
    assert.equal(r.client_screen_w, null);
    assert.equal(r.refresh_token_hash, null);
    assert.equal(r.push_provider, null);
    assert.equal(r.custom_data, null);

  });

});



// ============================================================================
// TOKEN SOURCE (priority chain)
// ============================================================================

describe('parts/token-source', function () {

  const TokenSource = TokenSourceFactory(Lib, CONFIG_STUB, ERRORS);

  it('prefers Authorization: Bearer over cookie', function () {

    const instance = buildInstance(0);
    instance.http_request = {
      headers: { authorization: 'Bearer bearer-value' },
      cookies: { sl_user_T: 'cookie-value' }
    };

    const auth_id = TokenSource.readAuthId(instance, {
      cookie_prefix: 'sl_user_', tenant_id: 'T'
    });
    assert.equal(auth_id, 'bearer-value');

  });

  it('falls back to cookie when no Authorization header', function () {

    const instance = buildInstance(0);
    instance.http_request = {
      headers: {},
      cookies: { sl_user_T: 'cookie-value' }
    };

    const auth_id = TokenSource.readAuthId(instance, {
      cookie_prefix: 'sl_user_', tenant_id: 'T'
    });
    assert.equal(auth_id, 'cookie-value');

  });

  it('returns null when neither source is present', function () {

    const instance = buildInstance(0);
    instance.http_request = { headers: {}, cookies: {} };
    const auth_id = TokenSource.readAuthId(instance, {
      cookie_prefix: 'sl_user_', tenant_id: 'T'
    });
    assert.equal(auth_id, null);

  });

  it('rejects non-Bearer Authorization schemes', function () {

    const instance = buildInstance(0);
    instance.http_request = {
      headers: { authorization: 'Basic ' + Buffer.from('user:pass').toString('base64') },
      cookies: {}
    };
    const auth_id = TokenSource.readAuthId(instance, {});
    assert.equal(auth_id, null);

  });

  it('returns null when http_request.cookies is absent', function () {

    const instance = buildInstance(0);
    instance.http_request = { headers: {} };
    const auth_id = TokenSource.readAuthId(instance, {
      cookie_prefix: 'sl_user_', tenant_id: 'T'
    });
    assert.equal(auth_id, null);

  });

});



// ============================================================================
// SESSION LIFECYCLE - cookie descriptor (uses in-process memory store)
// ============================================================================

describe('createSession / removeSession cookie descriptor', function () {

  const valid_base_config = {
    Store: MemoryStore._createNew(),
    ACTOR_TYPE: 'user',
    TTL_SECONDS: 3600,
    LIMITS: { total_max: 5, evict_oldest_on_limit: true }
  };

  it('createSession returns cookies: null when COOKIE_PREFIX is not set', async function () {

    const auth = AuthFactory(Lib, valid_base_config);
    const instance = buildInstance(1000);
    const result = await auth.createSession(instance, {
      tenant_id: 'T', actor_id: 'A1',
      install_platform: 'web', install_form_factor: 'desktop'
    });

    assert.equal(result.success, true);
    assert.equal(result.cookies, null);

  });

  it('createSession returns a cookie descriptor when COOKIE_PREFIX is set', async function () {

    const auth = AuthFactory(Lib, Object.assign({}, valid_base_config, { COOKIE_PREFIX: 'sl_user_' }));
    const instance = buildInstance(1000);
    const result = await auth.createSession(instance, {
      tenant_id: 'T', actor_id: 'A1',
      install_platform: 'web', install_form_factor: 'desktop'
    });

    assert.equal(result.success, true);
    assert.ok(result.cookies, 'cookies should be present');
    assert.ok(result.cookies['sl_user_T'], 'descriptor keyed by cookie name');
    assert.equal(result.cookies['sl_user_T'].value, result.auth_id);
    assert.equal(result.cookies['sl_user_T'].ttl, 3600);

  });

  it('removeSession returns a clear-cookie descriptor (ttl=0) when COOKIE_PREFIX is set', async function () {

    const auth = AuthFactory(Lib, Object.assign({}, valid_base_config, { COOKIE_PREFIX: 'sl_user_' }));
    const instance = buildInstance(1000);

    // Create a session first so we have a token_key to remove
    const create_result = await auth.createSession(instance, {
      tenant_id: 'T', actor_id: 'A1',
      install_platform: 'web', install_form_factor: 'desktop'
    });
    assert.equal(create_result.success, true);

    const { actor_id, token_key } = require('../parts/auth-id')(Lib, {}, ERRORS).parseAuthId(create_result.auth_id);
    const remove_result = await auth.removeSession(instance, {
      tenant_id: 'T', actor_id: actor_id, token_key: token_key
    });

    assert.equal(remove_result.success, true);
    assert.ok(remove_result.cookies, 'cookies should be present');
    assert.ok(remove_result.cookies['sl_user_T'], 'descriptor keyed by cookie name');
    assert.equal(remove_result.cookies['sl_user_T'].value, '');
    assert.equal(remove_result.cookies['sl_user_T'].ttl, 0);

  });

  it('removeSession returns cookies: null when COOKIE_PREFIX is not set', async function () {

    const auth = AuthFactory(Lib, valid_base_config);
    const instance = buildInstance(1000);

    const create_result = await auth.createSession(instance, {
      tenant_id: 'T', actor_id: 'A1',
      install_platform: 'web', install_form_factor: 'desktop'
    });
    const { actor_id, token_key } = require('../parts/auth-id')(Lib, {}, ERRORS).parseAuthId(create_result.auth_id);
    const remove_result = await auth.removeSession(instance, {
      tenant_id: 'T', actor_id: actor_id, token_key: token_key
    });

    assert.equal(remove_result.success, true);
    assert.equal(remove_result.cookies, null);

  });

});






// ============================================================================
// POLICY (pure list-then-filter)
// ============================================================================

describe('parts/policy', function () {

  const Policy = PolicyFactory(Lib, CONFIG_STUB, ERRORS);

  const session = function (overrides) {
    return Object.assign({
      tenant_id: 'T',
      actor_id: 'A',
      token_key: 'k',
      install_id: null,
      install_platform: 'web',
      install_form_factor: 'desktop',
      created_at: 0,
      expires_at: 1000,
      last_active_at: 0
    }, overrides);
  };

  it('allows insertion when no existing sessions', function () {

    const result = Policy.applyLimits({
      existing: [],
      now: 100,
      install_id: null,
      install_form_factor: 'desktop',
      install_platform: 'web',
      limits: { total_max: 5, by_form_factor_max: null, by_platform_max: null, evict_oldest_on_limit: true }
    });
    assert.equal(result.decision, 'allow');
    assert.equal(result.to_delete.length, 0);

  });

  it('drops expired existing sessions before counting', function () {

    const result = Policy.applyLimits({
      existing: [
        session({ token_key: 'k1', expires_at: 50 }),  // expired
        session({ token_key: 'k2', expires_at: 200 })  // active
      ],
      now: 100,
      install_id: null,
      install_form_factor: 'desktop',
      install_platform: 'web',
      limits: { total_max: 1, by_form_factor_max: null, by_platform_max: null, evict_oldest_on_limit: false }
    });
    // active count = 1 (k2). total_max = 1. k2 already at the cap, so the
    // new session is rejected. The expired k1 is NOT in to_delete - the
    // policy doesn't garbage-collect expired sessions; cleanup is a separate path.
    assert.equal(result.decision, 'reject');
    assert.equal(result.tier, 'total');

  });

  it('same-install replacement runs even when under the cap', function () {

    const result = Policy.applyLimits({
      existing: [
        session({ token_key: 'k1', install_id: 'install-X', expires_at: 200 })
      ],
      now: 100,
      install_id: 'install-X',
      install_form_factor: 'desktop',
      install_platform: 'web',
      limits: { total_max: 5, by_form_factor_max: null, by_platform_max: null, evict_oldest_on_limit: true }
    });
    assert.equal(result.decision, 'allow');
    assert.equal(result.to_delete.length, 1);
    assert.equal(result.to_delete[0].token_key, 'k1');

  });

  it('evicts the LRU session when the total cap is hit and eviction is on', function () {

    const result = Policy.applyLimits({
      existing: [
        session({ token_key: 'k1', last_active_at: 10, expires_at: 200 }),
        session({ token_key: 'k2', last_active_at: 50, expires_at: 200 }),
        session({ token_key: 'k3', last_active_at: 20, expires_at: 200 })
      ],
      now: 100,
      install_id: null,
      install_form_factor: 'desktop',
      install_platform: 'web',
      limits: { total_max: 3, by_form_factor_max: null, by_platform_max: null, evict_oldest_on_limit: true }
    });
    // 3 active sessions, cap = 3, so adding one more requires LRU eviction
    assert.equal(result.decision, 'allow');
    assert.equal(result.to_delete.length, 1);
    assert.equal(result.to_delete[0].token_key, 'k1'); // last_active_at: 10

  });

  it('rejects when cap is hit and eviction is off', function () {

    const result = Policy.applyLimits({
      existing: [
        session({ token_key: 'k1', last_active_at: 10, expires_at: 200 }),
        session({ token_key: 'k2', last_active_at: 50, expires_at: 200 }),
        session({ token_key: 'k3', last_active_at: 20, expires_at: 200 })
      ],
      now: 100,
      install_id: null,
      install_form_factor: 'desktop',
      install_platform: 'web',
      limits: { total_max: 3, by_form_factor_max: null, by_platform_max: null, evict_oldest_on_limit: false }
    });
    assert.equal(result.decision, 'reject');
    assert.equal(result.tier, 'total');

  });

  it('per-form-factor cap evicts the LRU session within that form factor', function () {

    const result = Policy.applyLimits({
      existing: [
        session({ token_key: 'm1', install_form_factor: 'mobile',  last_active_at: 100, expires_at: 1000 }),
        session({ token_key: 'm2', install_form_factor: 'mobile',  last_active_at: 200, expires_at: 1000 }),
        session({ token_key: 'd1', install_form_factor: 'desktop', last_active_at:  50, expires_at: 1000 })
      ],
      now: 500,
      install_id: null,
      install_form_factor: 'mobile',
      install_platform: 'web',
      limits: {
        total_max: 10,
        by_form_factor_max: { mobile: 2 },
        by_platform_max: null,
        evict_oldest_on_limit: true
      }
    });
    assert.equal(result.decision, 'allow');
    // m1 is the LRU mobile session
    assert.equal(result.to_delete.length, 1);
    assert.equal(result.to_delete[0].token_key, 'm1');

  });

  it('per-platform cap rejects when configured to do so', function () {

    const result = Policy.applyLimits({
      existing: [
        session({ token_key: 'i1', install_platform: 'ios', last_active_at: 100, expires_at: 1000 }),
        session({ token_key: 'i2', install_platform: 'ios', last_active_at: 200, expires_at: 1000 })
      ],
      now: 500,
      install_id: null,
      install_form_factor: 'mobile',
      install_platform: 'ios',
      limits: {
        total_max: 10,
        by_form_factor_max: null,
        by_platform_max: { ios: 2 },
        evict_oldest_on_limit: false
      }
    });
    assert.equal(result.decision, 'reject');
    assert.equal(result.tier, 'platform');

  });

  it('same-install replacement counts before tier checks', function () {

    // One mobile session with the same install_id as the new one - it
    // should be queued for replacement BEFORE the tier check sees it,
    // so the tier check passes.
    const result = Policy.applyLimits({
      existing: [
        session({ token_key: 'm1', install_id: 'install-X', install_form_factor: 'mobile', last_active_at: 100, expires_at: 1000 }),
        session({ token_key: 'm2', install_id: 'install-Y', install_form_factor: 'mobile', last_active_at: 200, expires_at: 1000 })
      ],
      now: 500,
      install_id: 'install-X',
      install_form_factor: 'mobile',
      install_platform: 'web',
      limits: {
        total_max: 10,
        by_form_factor_max: { mobile: 2 },
        by_platform_max: null,
        evict_oldest_on_limit: false       // would otherwise reject
      }
    });
    assert.equal(result.decision, 'allow');
    assert.equal(result.to_delete.length, 1);
    assert.equal(result.to_delete[0].token_key, 'm1');

  });

});



// ============================================================================
// WIRE-FORMAT VALIDATION - actor_id / tenant_id separator constraints (plan 0042)
// ============================================================================

describe('createSession wire-format validation (plan 0042)', function () {

  const valid_base_config = {
    Store: MemoryStore._createNew(),
    ACTOR_TYPE: 'user',
    TTL_SECONDS: 3600,
    LIMITS: { total_max: 5, evict_oldest_on_limit: true }
  };

  it('rejects actor_id containing "-" with TypeError before store I/O', async function () {

    const auth = AuthFactory(Lib, valid_base_config);
    const instance = buildInstance(1000);

    await assert.rejects(
      auth.createSession(instance, {
        tenant_id: 'T', actor_id: 'bad-id',
        install_platform: 'web', install_form_factor: 'desktop'
      }),
      function (err) {
        return err instanceof TypeError &&
          /options\.actor_id/.test(err.message) &&
          /must not contain "-" or "#"/.test(err.message);
      }
    );

  });

  it('rejects actor_id containing "#" with TypeError before store I/O', async function () {

    const auth = AuthFactory(Lib, valid_base_config);
    const instance = buildInstance(1000);

    await assert.rejects(
      auth.createSession(instance, {
        tenant_id: 'T', actor_id: 'bad#id',
        install_platform: 'web', install_form_factor: 'desktop'
      }),
      function (err) {
        return err instanceof TypeError &&
          /options\.actor_id/.test(err.message) &&
          /must not contain "-" or "#"/.test(err.message);
      }
    );

  });

  it('rejects tenant_id containing "#" with TypeError before store I/O', async function () {

    const auth = AuthFactory(Lib, valid_base_config);
    const instance = buildInstance(1000);

    await assert.rejects(
      auth.createSession(instance, {
        tenant_id: 'bad#tenant', actor_id: 'A1',
        install_platform: 'web', install_form_factor: 'desktop'
      }),
      function (err) {
        return err instanceof TypeError &&
          /options\.tenant_id/.test(err.message) &&
          /must not contain "#"/.test(err.message);
      }
    );

  });

  it('allows tenant_id containing "-" (not a composite-key separator)', async function () {

    const auth = AuthFactory(Lib, valid_base_config);
    const instance = buildInstance(1000);

    const result = await auth.createSession(instance, {
      tenant_id: 'my-tenant', actor_id: 'A1',
      install_platform: 'web', install_form_factor: 'desktop'
    });

    assert.equal(result.success, true);
    assert.ok(result.auth_id);

  });

  it('no orphaned session row after actor_id rejection (regression)', async function () {

    const auth = AuthFactory(Lib, valid_base_config);
    const instance = buildInstance(1000);

    // Attempt createSession with a bad actor_id - must throw
    await assert.rejects(
      auth.createSession(instance, {
        tenant_id: 'T', actor_id: 'orphan-test',
        install_platform: 'web', install_form_factor: 'desktop'
      }),
      TypeError
    );

    // Verify no session was persisted for this actor
    const list_result = await auth.listSessions(instance, {
      tenant_id: 'T', actor_id: 'orphan-test'
    });

    assert.equal(list_result.success, true);
    assert.equal(list_result.sessions.length, 0);

  });

});
