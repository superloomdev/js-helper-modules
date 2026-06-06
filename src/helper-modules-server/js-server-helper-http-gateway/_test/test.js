// Info: Tests for js-server-helper-http-gateway. Uses the in-process stub adapter
// (stub-adapter.js) - not a simulation of any real runtime, just a contract stub
// that lets the gateway exercise its own logic without Lambda or Express. Covers:
//   - Loader validation (throws on misconfiguration)
//   - initHttpRequestData / isHttpInstance
//   - setArgsFromRequest (all methods, types, validators, edge cases)
//   - returnHttpResponse / returnHttpStatus / returnHttpRedirect / returnHttpRedirect404
//   - buildCookie (fresh, accumulate, override, clear ttl=0, SameSite=None omission)
//   - returnHttpResponse with cookies 5th param (Set-Cookie serialized at gateway)
//   - getRequestIPAddress / getRequestUserAgent / getRequestOrigin
//   - getRequestCountryCode (adapter-delegated)
//   - getHttpTime
//   - getUrlParts
//   - parts/cookies.js - isSameSiteNoneIncompatible directly
//   - parts/params.js - setArgsFromRequest directly
//
// Phase 1 additions (plan 0017):
//   - Auth header extraction (Bearer / Basic / API-key patterns)
//   - Mixed-source param extraction (GET + POST + HEADER + PATH + FIXED in one call)
//   - buildCookie behavioral edge cases (accumulate, override, reserved chars)
//   - parts/cookies.serialize with all RFC 6265 attributes
//
// NOTE: Body parsing edge cases (malformed JSON, wrong content-type, etc.) are
// the adapter's responsibility (parts/params reads pre-parsed instance.http_request.body).
// Those tests live in each adapter's _test/test.js, not here.
'use strict';

const assert = require('node:assert/strict');
const { describe, it } = require('node:test');

const { Lib } = require('./loader')();

const HttpGateway              = require('helper-http-gateway');
const HttpGatewayAdapterStub   = require('./stub-adapter.js');
const CookiesFactory   = require('../parts/cookies.js');
const ParamsFactory    = require('../parts/params.js');
const UrlPartsFactory  = require('../parts/url-parts.js');


// ============================================================================
// HELPERS
// ============================================================================

function buildInstance () {
  return Lib.Instance.initialize();
}

function buildGateway (adapter) {
  return HttpGateway(Lib, { Adapter: adapter });
}

function validBaseConfig () {
  const { adapter } = HttpGatewayAdapterStub();
  return { Adapter: adapter };
}

function buildGatewayWithMemory () {
  const { adapter, sent } = HttpGatewayAdapterStub();
  const gateway = buildGateway(adapter);
  return { gateway, adapter, sent };
}

function initInstance (gateway, raw_request) {
  const instance = buildInstance();
  let captured = null;
  gateway.initHttpRequestData(instance, raw_request, null, function (_err, response) {
    captured = response;
  });
  return { instance, getCaptured: function () { return captured; } };
}


// ============================================================================
// LOADER VALIDATION
// ============================================================================

describe('loader validation', function () {

  it('throws when Adapter is missing', function () {
    assert.throws(function () {
      HttpGateway(Lib, {});
    }, /CONFIG\.Adapter must be a ready-to-use adapter object/);
  });

  it('throws when Adapter is a string', function () {
    assert.throws(function () {
      HttpGateway(Lib, { Adapter: 'aws-apigateway' });
    }, /CONFIG\.Adapter must be a ready-to-use adapter object/);
  });

  it('throws when Adapter is null', function () {
    assert.throws(function () {
      HttpGateway(Lib, { Adapter: null });
    }, /CONFIG\.Adapter must be a ready-to-use adapter object/);
  });

  it('succeeds with a valid adapter object', function () {
    const { adapter } = HttpGatewayAdapterStub();
    assert.doesNotThrow(function () {
      buildGateway(adapter);
    });
  });

  it('throws when adapter is missing extractRequest', function () {
    const bad_adapter = {
      buildResponseEnvelope: function () { return {}; },
      getCountryCode: function () { return null; }
    };

    assert.throws(function () {
      buildGateway(bad_adapter);
    }, /Invalid adapter contract: missing method `extractRequest`/);
  });

  it('throws when adapter is missing buildResponseEnvelope', function () {
    const bad_adapter = {
      extractRequest: function () { return {}; },
      getCountryCode: function () { return null; }
    };

    assert.throws(function () {
      buildGateway(bad_adapter);
    }, /Invalid adapter contract: missing method `buildResponseEnvelope`/);
  });

  it('throws when adapter is missing getCountryCode', function () {
    const bad_adapter = {
      extractRequest: function () { return {}; },
      buildResponseEnvelope: function () { return {}; }
    };

    assert.throws(function () {
      buildGateway(bad_adapter);
    }, /Invalid adapter contract: missing method `getCountryCode`/);
  });

  it('adapter contract: two gateways with different adapters are independent', function () {
    // Build two independent stub adapters with different getCountryCode behavior
    const { adapter: adapterA, sent: sentA } = HttpGatewayAdapterStub();
    const { adapter: adapterB, sent: sentB } = HttpGatewayAdapterStub();

    // Build two gateways, each with its own adapter
    const gatewayA = buildGateway(adapterA);
    const gatewayB = buildGateway(adapterB);

    // Prove they are independent objects
    assert.notStrictEqual(gatewayA, gatewayB);

    // Prove each adapter captures to its own sent array
    const { instance: instanceA } = initInstance(gatewayA, {});
    gatewayA.returnHttpResponse(instanceA, 200, {}, {}, { message: 'A' });

    const { instance: instanceB } = initInstance(gatewayB, {});
    gatewayB.returnHttpResponse(instanceB, 200, {}, {}, { message: 'B' });

    // Each sent array received exactly one response
    assert.strictEqual(sentA.length, 1);
    assert.strictEqual(sentB.length, 1);

    // And they contain the correct distinct responses
    assert.strictEqual(sentA[0].body, '{"message":"A"}');
    assert.strictEqual(sentB[0].body, '{"message":"B"}');
  });

});


// ============================================================================
// initHttpRequestData + isHttpInstance
// ============================================================================

describe('initHttpRequestData', function () {

  it('populates instance.http_request from raw_request', function () {
    const { gateway } = buildGatewayWithMemory();
    const { instance } = initInstance(gateway, {
      headers: { 'content-type': 'application/json' },
      query: { page: '2' },
      body: { name: 'Alice' },
      params: { id: '42' },
      method: 'POST'
    });

    assert.equal(instance.http_request.headers['content-type'], 'application/json');
    assert.equal(instance.http_request.query.page, '2');
    assert.equal(instance.http_request.body.name, 'Alice');
    assert.equal(instance.http_request.params.id, '42');
    assert.equal(instance.http_request.method, 'POST');
  });

  it('sets empty collections when raw_request is null', function () {
    const { gateway } = buildGatewayWithMemory();
    const { instance } = initInstance(gateway, null);

    assert.deepEqual(instance.http_request.headers, {});
    assert.deepEqual(instance.http_request.query, {});
    assert.deepEqual(instance.http_request.body, {});
    assert.deepEqual(instance.http_request.params, {});
    assert.equal(instance.http_request.method, null);
  });

  it('stores namespaced response_handler on instance', function () {
    const { gateway } = buildGatewayWithMemory();
    const { instance } = initInstance(gateway, {});
    assert.equal(typeof instance._http_gateway.response_handler, 'function');
  });

  it('does not create legacy instance.http_response field', function () {
    const { gateway } = buildGatewayWithMemory();
    const { instance } = initInstance(gateway, {});
    assert.equal(Object.prototype.hasOwnProperty.call(instance, 'http_response'), false);
  });

});

describe('isHttpInstance', function () {

  it('returns false on a fresh un-initialized instance', function () {
    const { gateway } = buildGatewayWithMemory();
    const instance = buildInstance();
    assert.equal(gateway.isHttpInstance(instance), false);
  });

  it('returns true after initHttpRequestData', function () {
    const { gateway } = buildGatewayWithMemory();
    const { instance } = initInstance(gateway, {});
    assert.equal(gateway.isHttpInstance(instance), true);
  });

});


// ============================================================================
// returnHttpResponse
// ============================================================================

describe('returnHttpResponse', function () {

  it('sends the correct status code', function () {
    const { gateway, sent } = buildGatewayWithMemory();
    const { instance } = initInstance(gateway, {});
    gateway.returnHttpResponse(instance, 200, null, null, { ok: true }); // (status, headers, cookies, body)
    assert.equal(sent[0].status, 200);
  });

  it('includes default Cache-Control and Content-Type headers', function () {
    const { gateway, sent } = buildGatewayWithMemory();
    const { instance } = initInstance(gateway, {});
    gateway.returnHttpResponse(instance, 200);
    assert.equal(sent[0].headers['Cache-Control'], 'max-age=0');
    assert.equal(sent[0].headers['Content-Type'], 'application/json');
  });

  it('merges caller-supplied headers over defaults', function () {
    const { gateway, sent } = buildGatewayWithMemory();
    const { instance } = initInstance(gateway, {});
    gateway.returnHttpResponse(instance, 200, { 'X-Custom': 'yes', 'Content-Type': 'text/plain' });
    assert.equal(sent[0].headers['X-Custom'], 'yes');
    assert.equal(sent[0].headers['Content-Type'], 'text/plain');
  });

  it('serializes cookies passed as 4th param into Set-Cookie header', function () {
    const { gateway, sent } = buildGatewayWithMemory();
    const { instance } = initInstance(gateway, {
      headers: { 'user-agent': 'Mozilla/5.0 Chrome/100.0' }
    });
    const cookies = gateway.buildCookie(null, 'session', 'abc', 3600);
    gateway.returnHttpResponse(instance, 200, null, cookies);
    assert.ok('Set-Cookie' in sent[0].headers);
    assert.ok(sent[0].headers['Set-Cookie'].includes('session=abc'));
  });

  it('sends no Set-Cookie header when cookies param is omitted', function () {
    const { gateway, sent } = buildGatewayWithMemory();
    const { instance } = initInstance(gateway, {});
    gateway.returnHttpResponse(instance, 200);
    assert.ok(!('Set-Cookie' in sent[0].headers));
  });

  it('returns true', function () {
    const { gateway } = buildGatewayWithMemory();
    const { instance } = initInstance(gateway, {});
    assert.equal(gateway.returnHttpResponse(instance, 200), true);
  });

});


// ============================================================================
// returnHttpStatus
// ============================================================================

describe('returnHttpStatus', function () {

  const cases = [
    ['not_modified', 304],
    ['bad_request', 400],
    ['unauthorized', 401],
    ['not_found', 404],
    ['invalid_token', 498]
  ];

  cases.forEach(function ([name, code]) {

    it('sends ' + code + ' for status_name=' + name, function () {
      const { gateway, sent } = buildGatewayWithMemory();
      const { instance } = initInstance(gateway, {});
      gateway.returnHttpStatus(instance, name);
      assert.equal(sent[0].status, code);
    });

  });

});


// ============================================================================
// returnHttpRedirect / returnHttpRedirect404
// ============================================================================

describe('returnHttpRedirect', function () {

  it('sends status 301', function () {
    const { gateway, sent } = buildGatewayWithMemory();
    const { instance } = initInstance(gateway, {});
    gateway.returnHttpRedirect(instance, '/new-path');
    assert.equal(sent[0].status, 301);
  });

  it('sets Location header', function () {
    const { gateway, sent } = buildGatewayWithMemory();
    const { instance } = initInstance(gateway, {});
    gateway.returnHttpRedirect(instance, '/new-path');
    assert.equal(sent[0].headers['Location'], '/new-path');
  });

});

describe('returnHttpRedirect404', function () {

  it('redirects to /404', function () {
    const { gateway, sent } = buildGatewayWithMemory();
    const { instance } = initInstance(gateway, {});
    gateway.returnHttpRedirect404(instance);
    assert.equal(sent[0].headers['Location'], '/404');
    assert.equal(sent[0].status, 301);
  });

});


// ============================================================================
// getRequestIPAddress / getRequestUserAgent / getRequestOrigin
// ============================================================================

describe('getRequestIPAddress', function () {

  it('returns first IP from x-forwarded-for chain', function () {
    const { gateway } = buildGatewayWithMemory();
    const { instance } = initInstance(gateway, {
      headers: { 'x-forwarded-for': '27.56.130.92, 54.182.231.9' }
    });
    assert.equal(gateway.getRequestIPAddress(instance), '27.56.130.92');
  });

  it('returns empty string when header is absent', function () {
    const { gateway } = buildGatewayWithMemory();
    const { instance } = initInstance(gateway, {});
    assert.equal(gateway.getRequestIPAddress(instance), '');
  });

});

describe('getRequestUserAgent', function () {

  it('returns user-agent from headers', function () {
    const { gateway } = buildGatewayWithMemory();
    const { instance } = initInstance(gateway, {
      headers: { 'user-agent': 'Mozilla/5.0' }
    });
    assert.equal(gateway.getRequestUserAgent(instance), 'Mozilla/5.0');
  });

  it('returns empty string when absent', function () {
    const { gateway } = buildGatewayWithMemory();
    const { instance } = initInstance(gateway, {});
    assert.equal(gateway.getRequestUserAgent(instance), '');
  });

});

describe('getRequestOrigin', function () {

  it('returns origin header', function () {
    const { gateway } = buildGatewayWithMemory();
    const { instance } = initInstance(gateway, {
      headers: { 'origin': 'https://app.example.com' }
    });
    assert.equal(gateway.getRequestOrigin(instance), 'https://app.example.com');
  });

  it('returns empty string when absent', function () {
    const { gateway } = buildGatewayWithMemory();
    const { instance } = initInstance(gateway, {});
    assert.equal(gateway.getRequestOrigin(instance), '');
  });

});


// ============================================================================
// getRequestCountryCode (adapter-delegated)
// ============================================================================

describe('getRequestCountryCode', function () {

  it('returns null from stub adapter (no CDN)', function () {
    const { gateway } = buildGatewayWithMemory();
    const { instance } = initInstance(gateway, {});
    assert.equal(gateway.getRequestCountryCode(instance), null);
  });

});


// ============================================================================
// buildCookie
// ============================================================================

describe('buildCookie', function () {

  it('returns a descriptor keyed by cookie name', function () {
    const { gateway } = buildGatewayWithMemory();
    const cookies = gateway.buildCookie(null, 'sid', 'abc', 3600);
    assert.ok('sid' in cookies);
    assert.equal(cookies.sid.value, 'abc');
    assert.equal(cookies.sid.ttl, 3600);
  });

  it('starts a fresh object when existing is null', function () {
    const { gateway } = buildGatewayWithMemory();
    const cookies = gateway.buildCookie(null, 'sid', 'abc', 3600);
    assert.equal(Object.keys(cookies).length, 1);
  });

  it('starts a fresh object when existing is undefined', function () {
    const { gateway } = buildGatewayWithMemory();
    const cookies = gateway.buildCookie(undefined, 'sid', 'abc', 3600);
    assert.equal(Object.keys(cookies).length, 1);
  });

  it('accumulates multiple cookies by chaining calls', function () {
    const { gateway } = buildGatewayWithMemory();
    let cookies = gateway.buildCookie(null, 'sid', 'abc', 3600);
    cookies = gateway.buildCookie(cookies, 'pref', 'dark', 86400);
    assert.ok('sid' in cookies);
    assert.ok('pref' in cookies);
    assert.equal(Object.keys(cookies).length, 2);
  });

  it('overrides a cookie when same name is used twice', function () {
    const { gateway } = buildGatewayWithMemory();
    let cookies = gateway.buildCookie(null, 'sid', 'first', 3600);
    cookies = gateway.buildCookie(cookies, 'sid', 'second', 7200);
    assert.equal(Object.keys(cookies).length, 1);
    assert.equal(cookies.sid.value, 'second');
    assert.equal(cookies.sid.ttl, 7200);
  });

  it('does not mutate the existing object passed in', function () {
    const { gateway } = buildGatewayWithMemory();
    const first = gateway.buildCookie(null, 'sid', 'abc', 3600);
    const second = gateway.buildCookie(first, 'pref', 'dark', 86400);
    assert.equal(Object.keys(first).length, 1);
    assert.equal(Object.keys(second).length, 2);
  });

  it('stores empty string value and ttl=0 for a clear cookie', function () {
    const { gateway } = buildGatewayWithMemory();
    const cookies = gateway.buildCookie(null, 'sid', '', 0);
    assert.equal(cookies.sid.value, '');
    assert.equal(cookies.sid.ttl, 0);
  });

  it('stores supplied options on the descriptor', function () {
    const { gateway } = buildGatewayWithMemory();
    const cookies = gateway.buildCookie(null, 'sid', 'abc', 3600, { httpOnly: false });
    assert.equal(cookies.sid.options.httpOnly, false);
  });

  it('stores empty options object when options param is omitted', function () {
    const { gateway } = buildGatewayWithMemory();
    const cookies = gateway.buildCookie(null, 'sid', 'abc', 3600);
    assert.deepEqual(cookies.sid.options, {});
  });

});


// ============================================================================
// returnHttpResponse with cookies (buildCookie + serialization)
// ============================================================================

describe('returnHttpResponse with cookies', function () {

  const CHROME_100_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36';
  const IOS_12_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 12_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko)';

  it('serializes a cookie descriptor into Set-Cookie response header', function () {
    const { gateway, sent } = buildGatewayWithMemory();
    const { instance } = initInstance(gateway, { headers: { 'user-agent': CHROME_100_UA } });
    const cookies = gateway.buildCookie(null, 'sid', 'abc', 3600);
    gateway.returnHttpResponse(instance, 200, null, cookies);
    assert.ok('Set-Cookie' in sent[0].headers);
    assert.ok(sent[0].headers['Set-Cookie'].includes('sid=abc'));
  });

  it('applies default httpOnly=true', function () {
    const { gateway, sent } = buildGatewayWithMemory();
    const { instance } = initInstance(gateway, { headers: { 'user-agent': CHROME_100_UA } });
    const cookies = gateway.buildCookie(null, 'sid', 'abc', 3600);
    gateway.returnHttpResponse(instance, 200, null, cookies);
    assert.ok(sent[0].headers['Set-Cookie'].toLowerCase().includes('httponly'));
  });

  it('applies default secure=true', function () {
    const { gateway, sent } = buildGatewayWithMemory();
    const { instance } = initInstance(gateway, { headers: { 'user-agent': CHROME_100_UA } });
    const cookies = gateway.buildCookie(null, 'sid', 'abc', 3600);
    gateway.returnHttpResponse(instance, 200, null, cookies);
    assert.ok(sent[0].headers['Set-Cookie'].toLowerCase().includes('secure'));
  });

  it('applies default path=/', function () {
    const { gateway, sent } = buildGatewayWithMemory();
    const { instance } = initInstance(gateway, { headers: { 'user-agent': CHROME_100_UA } });
    const cookies = gateway.buildCookie(null, 'sid', 'abc', 3600);
    gateway.returnHttpResponse(instance, 200, null, cookies);
    assert.ok(sent[0].headers['Set-Cookie'].toLowerCase().includes('path=/'));
  });

  it('applies default sameSite=lax', function () {
    const { gateway, sent } = buildGatewayWithMemory();
    const { instance } = initInstance(gateway, { headers: { 'user-agent': CHROME_100_UA } });
    const cookies = gateway.buildCookie(null, 'sid', 'abc', 3600);
    gateway.returnHttpResponse(instance, 200, null, cookies);
    assert.ok(sent[0].headers['Set-Cookie'].toLowerCase().includes('samesite=lax'));
  });

  it('option override httpOnly=false is respected', function () {
    const { gateway, sent } = buildGatewayWithMemory();
    const { instance } = initInstance(gateway, { headers: { 'user-agent': CHROME_100_UA } });
    const cookies = gateway.buildCookie(null, 'sid', 'abc', 3600, { httpOnly: false });
    gateway.returnHttpResponse(instance, 200, null, cookies);
    assert.ok(!sent[0].headers['Set-Cookie'].toLowerCase().includes('httponly'));
  });

  it('option override sameSite=none is applied for compatible browser', function () {
    const { gateway, sent } = buildGatewayWithMemory();
    const { instance } = initInstance(gateway, { headers: { 'user-agent': CHROME_100_UA } });
    const cookies = gateway.buildCookie(null, 'sid', 'abc', 3600, { sameSite: 'none' });
    gateway.returnHttpResponse(instance, 200, null, cookies);
    assert.ok(sent[0].headers['Set-Cookie'].toLowerCase().includes('samesite=none'));
  });

  it('omits SameSite entirely for iOS 12 UA when sameSite=none requested', function () {
    const { gateway, sent } = buildGatewayWithMemory();
    const { instance } = initInstance(gateway, { headers: { 'user-agent': IOS_12_UA } });
    const cookies = gateway.buildCookie(null, 'sid', 'abc', 3600, { sameSite: 'none' });
    gateway.returnHttpResponse(instance, 200, null, cookies);
    assert.ok(!sent[0].headers['Set-Cookie'].toLowerCase().includes('samesite'));
  });

  it('serializes a clear cookie (ttl=0, empty value) with Max-Age=0', function () {
    const { gateway, sent } = buildGatewayWithMemory();
    const { instance } = initInstance(gateway, { headers: { 'user-agent': CHROME_100_UA } });
    const cookies = gateway.buildCookie(null, 'sid', '', 0);
    gateway.returnHttpResponse(instance, 200, null, cookies);
    const sc = sent[0].headers['Set-Cookie'];
    assert.ok(sc.startsWith('sid=;') || sc.startsWith('sid='));
    assert.ok(sc.toLowerCase().includes('max-age=0'));
  });

  it('last cookie wins when descriptor has multiple entries (single Set-Cookie key)', function () {
    const { gateway, sent } = buildGatewayWithMemory();
    const { instance } = initInstance(gateway, { headers: { 'user-agent': CHROME_100_UA } });
    let cookies = gateway.buildCookie(null, 'a', 'val-a', 3600);
    cookies = gateway.buildCookie(cookies, 'b', 'val-b', 3600);
    gateway.returnHttpResponse(instance, 200, null, cookies);
    // Only one Set-Cookie key in headers; last iteration wins
    assert.ok('Set-Cookie' in sent[0].headers);
  });

});


// ============================================================================
// getHttpTime
// ============================================================================

describe('getHttpTime', function () {

  it('returns a string in HTTP-date format for a given timestamp', function () {
    const { gateway } = buildGatewayWithMemory();
    const result = gateway.getHttpTime(0);
    assert.equal(result, 'Thu, 01 Jan 1970 00:00:00 GMT');
  });

  it('returns current time string when no argument given', function () {
    const { gateway } = buildGatewayWithMemory();
    const result = gateway.getHttpTime();
    assert.ok(typeof result === 'string');
    assert.ok(result.endsWith('GMT'));
  });

});


// ============================================================================
// getUrlParts
// ============================================================================

describe('getUrlParts', function () {

  it('correctly parses a standard URL', function () {
    const { gateway } = buildGatewayWithMemory();
    const parts = gateway.getUrlParts('https://www.api.example.co.uk/path');
    assert.equal(parts.domain_without_tld, 'example');
    assert.equal(parts.tld, 'co.uk');
    assert.ok(parts.hostname.includes('example'));
    assert.equal(parts.is_ip, false);
  });

});


// ============================================================================
// parts/cookies.js - isSameSiteNoneIncompatible (direct)
// ============================================================================

describe('parts/cookies - isSameSiteNoneIncompatible', function () {

  const Cookies = CookiesFactory(Lib);

  it('returns false for modern Chrome', function () {
    const ua = 'Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/100.0.4896.127 Safari/537.36';
    assert.equal(Cookies.isSameSiteNoneIncompatible(ua), false);
  });

  it('returns true for iOS 12', function () {
    const ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 12_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko)';
    assert.equal(Cookies.isSameSiteNoneIncompatible(ua), true);
  });

  it('returns true for Chromium 65 (drops unrecognized SameSite)', function () {
    const ua = 'Mozilla/5.0 Chrome/65.0.3325.181';
    assert.equal(Cookies.isSameSiteNoneIncompatible(ua), true);
  });

  it('returns false for Chromium 67 (first compatible version)', function () {
    const ua = 'Mozilla/5.0 Chrome/67.0.3396.62';
    assert.equal(Cookies.isSameSiteNoneIncompatible(ua), false);
  });

  it('returns false for an empty string', function () {
    assert.equal(Cookies.isSameSiteNoneIncompatible(''), false);
  });

});


// ============================================================================
// parts/cookies.js - serialize (direct)
// ============================================================================

describe('parts/cookies - serialize', function () {

  const Cookies = CookiesFactory(Lib);

  it('URL-encodes a value containing reserved cookie-octet characters', function () {
    const out = Cookies.serialize('sid', 'a=b; c,d "e"', {});
    assert.ok(!out.includes('"'));
    assert.ok(!out.match(/=.*;.*=.*;.*Max-Age/));
    assert.ok(out.startsWith('sid=' + encodeURIComponent('a=b; c,d "e"')));
  });

  it('emits an empty value when the input is an empty string', function () {
    const out = Cookies.serialize('sid', '', { maxAge: 0 });
    assert.equal(out, 'sid=; Max-Age=0');
  });

  it('throws on a cookie name containing a space', function () {
    assert.throws(function () {
      Cookies.serialize('bad name', 'value', {});
    }, /name is invalid/);
  });

  it('throws on a cookie name containing a semicolon', function () {
    assert.throws(function () {
      Cookies.serialize('bad;name', 'value', {});
    }, /name is invalid/);
  });

});


// ============================================================================
// parts/cookies.js - parse (direct)
// ============================================================================

describe('parts/cookies - parse', function () {

  const Cookies = CookiesFactory(Lib);

  it('URL-decodes percent-encoded values', function () {
    const out = Cookies.parse('greeting=' + encodeURIComponent('hello world'));
    assert.equal(out.greeting, 'hello world');
  });

  it('preserves the raw value when percent-encoding is malformed', function () {
    const out = Cookies.parse('broken=%E0%A4');
    assert.equal(out.broken, '%E0%A4');
  });

  it('returns a prototype-less object (prototype pollution defense)', function () {
    const out = Cookies.parse('foo=bar');
    // Result map does not inherit from Object.prototype, so accidental
    // lookups of 'hasOwnProperty' / 'toString' on cookie names cannot
    // resolve to real Object methods.
    assert.equal(out.hasOwnProperty, undefined);
    assert.equal(out.toString, undefined);
  });

  it('does not pollute Object.prototype when header contains __proto__', function () {
    Cookies.parse('__proto__=' + encodeURIComponent('{"polluted":true}'));
    assert.equal({}.polluted, undefined);
  });

  it('returns an empty prototype-less object for an empty header', function () {
    const out = Cookies.parse('');
    assert.equal(Object.keys(out).length, 0);
    assert.equal(out.hasOwnProperty, undefined);
  });

  it('parses multiple cookies separated by semicolons', function () {
    const out = Cookies.parse('a=1; b=2; c=3');
    assert.equal(out.a, '1');
    assert.equal(out.b, '2');
    assert.equal(out.c, '3');
  });

});


// ============================================================================
// parts/params.js - setArgsFromRequest (direct)
// ============================================================================

describe('parts/params - setArgsFromRequest', function () {

  const Params = ParamsFactory(Lib);

  function makeInstance (overrides) {
    return {
      http_request: Object.assign(
        { headers: {}, query: {}, body: {}, params: {}, cookies: {}, method: 'GET' },
        overrides
      )
    };
  }

  it('returns [null, {}] for empty params array', function () {
    const [err, args] = Params.setArgsFromRequest(makeInstance({}), []);
    assert.equal(err, null);
    assert.deepEqual(args, {});
  });

  it('extracts a query param using in key', function () {
    const instance = makeInstance({ query: { page: '3' } });
    const [err, args] = Params.setArgsFromRequest(instance, [
      { method: 'GET', in: 'query', name: 'page', rename: 'page', required: true }
    ]);
    assert.equal(err, null);
    assert.equal(args.page, '3');
  });

  it('extracts a body param using in key', function () {
    const instance = makeInstance({ body: { email: 'a@b.com' } });
    const [err, args] = Params.setArgsFromRequest(instance, [
      { method: 'POST', in: 'body', name: 'email', rename: 'email', required: true }
    ]);
    assert.equal(err, null);
    assert.equal(args.email, 'a@b.com');
  });

  it('extracts a header param using in key', function () {
    const instance = makeInstance({ headers: { 'x-app-token': 'tok123' } });
    const [err, args] = Params.setArgsFromRequest(instance, [
      { method: 'GET', in: 'header', name: 'x-app-token', rename: 'app_token', required: true }
    ]);
    assert.equal(err, null);
    assert.equal(args.app_token, 'tok123');
  });

  it('extracts a params (path) param using in key', function () {
    const instance = makeInstance({ params: { id: '99' } });
    const [err, args] = Params.setArgsFromRequest(instance, [
      { method: 'GET', in: 'params', name: 'id', rename: 'record_id', required: true }
    ]);
    assert.equal(err, null);
    assert.equal(args.record_id, '99');
  });

  it('extracts a fixed param using in key', function () {
    const instance = makeInstance({});
    const [err, args] = Params.setArgsFromRequest(instance, [
      { method: 'POST', in: 'fixed', name: 'type', rename: 'type', value: 'user', required: true }
    ]);
    assert.equal(err, null);
    assert.equal(args.type, 'user');
  });

  it('falls back to legacy method key when in is not provided', function () {
    const instance = makeInstance({ query: { page: '3' } });
    const [err, args] = Params.setArgsFromRequest(instance, [
      { method: 'GET', name: 'page', rename: 'page', required: true }
    ]);
    assert.equal(err, null);
    assert.equal(args.page, '3');
  });

  it('applies default value when optional param is absent', function () {
    const instance = makeInstance({});
    const [err, args] = Params.setArgsFromRequest(instance, [
      { method: 'GET', in: 'query', name: 'limit', rename: 'limit', required: false, default: 10 }
    ]);
    assert.equal(err, null);
    assert.equal(args.limit, 10);
  });

  it('returns [null, false] when required param is missing', function () {
    const instance = makeInstance({});
    const [err, args] = Params.setArgsFromRequest(instance, [
      { method: 'GET', in: 'query', name: 'id', rename: 'id', required: true }
    ]);
    assert.equal(err, null);
    assert.equal(args, false);
  });

  it('typecasts string to number when is_number=true', function () {
    const instance = makeInstance({ query: { count: '5' } });
    const [err, args] = Params.setArgsFromRequest(instance, [
      { method: 'GET', in: 'query', name: 'count', rename: 'count', required: true, is_number: true }
    ]);
    assert.equal(err, null);
    assert.equal(typeof args.count, 'number');
    assert.equal(args.count, 5);
  });

  it('typecasts to boolean when is_boolean=true', function () {
    const instance = makeInstance({ query: { active: '1' } });
    const [err, args] = Params.setArgsFromRequest(instance, [
      { method: 'GET', in: 'query', name: 'active', rename: 'active', required: true, is_boolean: true }
    ]);
    assert.equal(err, null);
    assert.equal(args.active, true);
  });

  it('parses JSON string when is_json=true', function () {
    const instance = makeInstance({ body: { meta: '{"key":"val"}' } });
    const [err, args] = Params.setArgsFromRequest(instance, [
      { method: 'POST', in: 'body', name: 'meta', rename: 'meta', required: true, is_json: true }
    ]);
    assert.equal(err, null);
    assert.deepEqual(args.meta, { key: 'val' });
  });

  it('returns [null, false] when is_json=true and value is invalid JSON and required', function () {
    const instance = makeInstance({ body: { meta: 'not-json' } });
    const [err, args] = Params.setArgsFromRequest(instance, [
      { method: 'POST', in: 'body', name: 'meta', rename: 'meta', required: true, is_json: true }
    ]);
    assert.equal(err, null);
    assert.equal(args, false);
  });

  it('trims whitespace and converts empty string to null', function () {
    const instance = makeInstance({ query: { q: '   ' } });
    const [err, args] = Params.setArgsFromRequest(instance, [
      { method: 'GET', in: 'query', name: 'q', rename: 'q', required: false, trim: true, default: null }
    ]);
    assert.equal(err, null);
    assert.equal(args.q, null);
  });

  it('returns [null, false] when validate_func fails', function () {
    const instance = makeInstance({ query: { age: '-5' } });
    const [err, args] = Params.setArgsFromRequest(instance, [
      {
        method: 'GET', in: 'query', name: 'age', rename: 'age', required: true, is_number: true,
        validate_func: function (v) { return v > 0; }
      }
    ]);
    assert.equal(err, null);
    assert.equal(args, false);
  });

  it('returns [err, false] when invalidate_func returns an error object', function () {
    const MY_ERR = { type: 'BAD_VALUE', message: 'too long' };
    const instance = makeInstance({ query: { name: 'toolongname' } });
    const [err, args] = Params.setArgsFromRequest(instance, [
      {
        method: 'GET', in: 'query', name: 'name', rename: 'name', required: true,
        invalidate_func: function (v) { return v.length > 8 ? MY_ERR : null; }
      }
    ]);
    assert.equal(args, false);
    assert.deepEqual(err, MY_ERR);
  });

  it('handles multiple params in sequence', function () {
    const instance = makeInstance({ query: { a: '1', b: '2' } });
    const [err, args] = Params.setArgsFromRequest(instance, [
      { method: 'GET', in: 'query', name: 'a', rename: 'a', required: true, is_number: true },
      { method: 'GET', in: 'query', name: 'b', rename: 'b', required: true, is_number: true }
    ]);
    assert.equal(err, null);
    assert.equal(args.a, 1);
    assert.equal(args.b, 2);
  });

});


// ============================================================================
// parts/url-parts.js - getUrlParts (direct)
// ============================================================================

describe('parts/url-parts - getUrlParts', function () {

  const UrlParts = UrlPartsFactory(Lib);

  it('parses subdomain, domain, tld correctly', function () {
    const parts = UrlParts.getUrlParts('https://www.api.example.com/path?q=1');
    assert.equal(parts.domain_without_tld, 'example');
    assert.equal(parts.tld, 'com');
    assert.ok(parts.sub_domain.includes('api'));
  });

  it('marks IP addresses as is_ip=true', function () {
    const parts = UrlParts.getUrlParts('http://192.168.1.1/path');
    assert.equal(parts.is_ip, true);
  });

  it('returns object with all expected keys', function () {
    const parts = UrlParts.getUrlParts('https://example.com');
    const expected_keys = ['sub_domain', 'domain', 'domain_without_tld', 'tld', 'hostname', 'is_ip'];
    expected_keys.forEach(function (key) {
      assert.ok(key in parts, 'missing key: ' + key);
    });
  });

});


// ============================================================================
// PHASE 1 ADDITIONS (plan 0017)
// ============================================================================


// ============================================================================
// parts/params - auth header extraction patterns
// ============================================================================

describe('parts/params - auth header extraction', function () {

  const Params = ParamsFactory(Lib);

  function makeInstance (overrides) {
    return {
      http_request: Object.assign(
        { headers: {}, query: {}, body: {}, params: {}, cookies: {}, method: 'GET' },
        overrides
      )
    };
  }

  it('extracts a Bearer token from Authorization header', function () {
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload.signature';
    const instance = makeInstance({
      headers: { 'authorization': 'Bearer ' + token }
    });
    const [err, args] = Params.setArgsFromRequest(instance, [
      { method: 'HEADER', name: 'authorization', rename: 'auth', required: true }
    ]);
    assert.equal(err, null);
    assert.equal(args.auth, 'Bearer ' + token);
  });

  it('extracts a Basic credential from Authorization header', function () {
    const cred = Buffer.from('user:pass').toString('base64');
    const instance = makeInstance({
      headers: { 'authorization': 'Basic ' + cred }
    });
    const [err, args] = Params.setArgsFromRequest(instance, [
      { method: 'HEADER', name: 'authorization', rename: 'auth', required: true }
    ]);
    assert.equal(err, null);
    assert.equal(args.auth, 'Basic ' + cred);
  });

  it('extracts an API key from a custom header (X-API-Key)', function () {
    const instance = makeInstance({
      headers: { 'x-api-key': 'sk_live_abc123' }
    });
    const [err, args] = Params.setArgsFromRequest(instance, [
      { method: 'HEADER', name: 'x-api-key', rename: 'api_key', required: true }
    ]);
    assert.equal(err, null);
    assert.equal(args.api_key, 'sk_live_abc123');
  });

  it('extracts a correlation id (X-Correlation-Id)', function () {
    const instance = makeInstance({
      headers: { 'x-correlation-id': '7f4e9a2b-1234-5678-9abc-def012345678' }
    });
    const [err, args] = Params.setArgsFromRequest(instance, [
      { method: 'HEADER', name: 'x-correlation-id', rename: 'corr_id', required: false }
    ]);
    assert.equal(err, null);
    assert.equal(args.corr_id, '7f4e9a2b-1234-5678-9abc-def012345678');
  });

  it('returns [null, false] when required Authorization header is missing', function () {
    const instance = makeInstance({ headers: {} });
    const [err, args] = Params.setArgsFromRequest(instance, [
      { method: 'HEADER', name: 'authorization', rename: 'auth', required: true }
    ]);
    assert.equal(err, null);
    assert.equal(args, false);
  });

  it('returns default value when optional auth header is missing', function () {
    const instance = makeInstance({ headers: {} });
    const [err, args] = Params.setArgsFromRequest(instance, [
      { method: 'HEADER', name: 'authorization', rename: 'auth', required: false, default: null }
    ]);
    assert.equal(err, null);
    assert.equal(args.auth, null);
  });

  it('preserves empty-value Bearer prefix (trim disabled)', function () {
    // Documents current behavior: 'Bearer ' with trailing space is forwarded as-is
    const instance = makeInstance({
      headers: { 'authorization': 'Bearer ' }
    });
    const [err, args] = Params.setArgsFromRequest(instance, [
      { method: 'HEADER', name: 'authorization', rename: 'auth', required: true }
    ]);
    assert.equal(err, null);
    assert.equal(args.auth, 'Bearer ');
  });

  it('trims Authorization header value when trim=true', function () {
    const instance = makeInstance({
      headers: { 'authorization': '  Bearer token123  ' }
    });
    const [err, args] = Params.setArgsFromRequest(instance, [
      { method: 'HEADER', name: 'authorization', rename: 'auth', required: true, trim: true }
    ]);
    assert.equal(err, null);
    assert.equal(args.auth, 'Bearer token123');
  });

  it('lookup is case-sensitive against normalized lowercase header keys', function () {
    // Adapters normalize all incoming header keys to lowercase. Param lookup
    // uses the lowercase key. Document this contract explicitly.
    const instance = makeInstance({
      headers: { 'authorization': 'Bearer xyz' }
    });
    const [err1, args1] = Params.setArgsFromRequest(instance, [
      { method: 'HEADER', name: 'authorization', rename: 'auth', required: true }
    ]);
    assert.equal(err1, null);
    assert.equal(args1.auth, 'Bearer xyz');

    const [err2, args2] = Params.setArgsFromRequest(instance, [
      { method: 'HEADER', name: 'Authorization', rename: 'auth', required: true }
    ]);
    assert.equal(err2, null);
    // Mixed-case lookup fails because keys were lowercased by the adapter
    assert.equal(args2, false);
  });

});


// ============================================================================
// parts/params - mixed-source extraction
// ============================================================================

describe('parts/params - mixed source extraction', function () {

  const Params = ParamsFactory(Lib);

  function makeFullInstance () {
    return {
      http_request: {
        headers: { 'authorization': 'Bearer abc123', 'x-api-key': 'k1' },
        query  : { page: '2', sort: 'name' },
        body   : { email: 'a@b.com', age: '30' },
        params : { user_id: '42' },
        cookies: { session: 'sess123' },
        method : 'POST'
      }
    };
  }

  it('extracts from GET + POST + HEADER + PATH + FIXED in a single call', function () {
    const instance = makeFullInstance();
    const [err, args] = Params.setArgsFromRequest(instance, [
      { method: 'GET',  in: 'params', name: 'user_id',       rename: 'user_id', required: true, is_number: true },
      { method: 'GET',  in: 'header', name: 'authorization', rename: 'auth',    required: true },
      { method: 'GET',  in: 'header', name: 'x-api-key',     rename: 'api_key', required: true },
      { method: 'GET',  in: 'query',  name: 'page',          rename: 'page',    required: true, is_number: true },
      { method: 'GET',  in: 'query',  name: 'sort',          rename: 'sort',    required: false, default: 'created_at' },
      { method: 'POST', in: 'body',   name: 'email',         rename: 'email',   required: true },
      { method: 'POST', in: 'body',   name: 'age',           rename: 'age',     required: true, is_number: true },
      { method: 'POST', in: 'fixed',  name: 'source',        rename: 'source',  required: true, value: 'api' }
    ]);
    assert.equal(err, null);
    assert.equal(args.user_id, 42);
    assert.equal(args.auth, 'Bearer abc123');
    assert.equal(args.api_key, 'k1');
    assert.equal(args.page, 2);
    assert.equal(args.sort, 'name');
    assert.equal(args.email, 'a@b.com');
    assert.equal(args.age, 30);
    assert.equal(args.source, 'api');
  });

  it('aborts at the first missing required param across mixed sources', function () {
    const instance = makeFullInstance();
    delete instance.http_request.body.email;

    const [err, args] = Params.setArgsFromRequest(instance, [
      { method: 'GET',  in: 'params', name: 'user_id',       rename: 'user_id', required: true, is_number: true },
      { method: 'GET',  in: 'header', name: 'authorization', rename: 'auth',    required: true },
      { method: 'POST', in: 'body',   name: 'email',         rename: 'email',   required: true },
      { method: 'GET',  in: 'query',  name: 'page',          rename: 'page',    required: true, is_number: true }
    ]);
    assert.equal(err, null);
    assert.equal(args, false);
  });

  it('each param descriptor has exactly one source - no precedence concept', function () {
    // Same NAME in different sources is allowed; each descriptor names its own source.
    // The two values land under different `rename` keys; one source does not
    // shadow the other.
    const instance = {
      http_request: {
        headers: { 'id': 'header-id' },
        query  : { id: 'get-id' },
        body   : {},
        params : { id: 'path-id' },
        cookies: {},
        method : 'GET'
      }
    };
    const [err, args] = Params.setArgsFromRequest(instance, [
      { method: 'GET',  in: 'query',  name: 'id', rename: 'id_from_get',    required: true },
      { method: 'GET',  in: 'header', name: 'id', rename: 'id_from_header', required: true },
      { method: 'GET',  in: 'params', name: 'id', rename: 'id_from_path',   required: true }
    ]);
    assert.equal(err, null);
    assert.equal(args.id_from_get,    'get-id');
    assert.equal(args.id_from_header, 'header-id');
    assert.equal(args.id_from_path,   'path-id');
  });

  it('mixed sources with validators and invalidators short-circuit correctly', function () {
    const MY_ERR = { type: 'AGE_TOO_LOW', message: 'must be 18+' };
    const instance = makeFullInstance();
    instance.http_request.body.age = '15';

    const [err, args] = Params.setArgsFromRequest(instance, [
      { method: 'GET', in: 'params', name: 'user_id', rename: 'user_id', required: true, is_number: true },
      {
        method: 'POST', in: 'body', name: 'age', rename: 'age', required: true, is_number: true,
        invalidate_func: function (v) { return v < 18 ? MY_ERR : null; }
      },
      { method: 'GET', in: 'query', name: 'page', rename: 'page', required: true, is_number: true }
    ]);
    assert.deepEqual(err, MY_ERR);
    assert.equal(args, false);
  });

});


// ============================================================================
// buildCookie - serialization behavioral edge cases (via returnHttpResponse)
// ============================================================================

describe('buildCookie - serialization edge cases', function () {

  const CHROME_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36';

  it('URL-encodes a value that contains a comma', function () {
    const { gateway, sent } = buildGatewayWithMemory();
    const { instance } = initInstance(gateway, { headers: { 'user-agent': CHROME_UA } });
    const cookies = gateway.buildCookie(null, 'tags', 'red,green,blue', 3600);
    gateway.returnHttpResponse(instance, 200, null, cookies);
    assert.ok(sent[0].headers['Set-Cookie'].startsWith('tags=' + encodeURIComponent('red,green,blue')));
  });

  it('URL-encodes a value that contains a semicolon', function () {
    const { gateway, sent } = buildGatewayWithMemory();
    const { instance } = initInstance(gateway, { headers: { 'user-agent': CHROME_UA } });
    const cookies = gateway.buildCookie(null, 'note', 'a;b', 3600);
    gateway.returnHttpResponse(instance, 200, null, cookies);
    assert.ok(sent[0].headers['Set-Cookie'].startsWith('note=' + encodeURIComponent('a;b')));
  });

  it('accepts an empty string value (clear cookie)', function () {
    const { gateway, sent } = buildGatewayWithMemory();
    const { instance } = initInstance(gateway, { headers: { 'user-agent': CHROME_UA } });
    const cookies = gateway.buildCookie(null, 'sid', '', 0);
    gateway.returnHttpResponse(instance, 200, null, cookies);
    const sc = sent[0].headers['Set-Cookie'];
    assert.ok(sc.startsWith('sid=;') || sc.startsWith('sid='));
    assert.ok(sc.toLowerCase().includes('max-age=0'));
  });

});


// ============================================================================
// parts/cookies - serialize with all RFC 6265 attributes
// ============================================================================

describe('parts/cookies - serialize with all RFC 6265 attributes', function () {

  const Cookies = CookiesFactory(Lib);

  it('serializes all standard attributes together', function () {
    const out = Cookies.serialize('sid', 'abc', {
      maxAge  : 3600,
      path    : '/api',
      domain  : 'example.com',
      secure  : true,
      httpOnly: true,
      sameSite: 'lax'
    });
    assert.ok(out.startsWith('sid=abc'));
    assert.ok(out.toLowerCase().includes('max-age=3600'));
    assert.ok(out.includes('Path=/api') || out.includes('path=/api'));
    assert.ok(out.toLowerCase().includes('domain=example.com'));
    assert.ok(out.toLowerCase().includes('secure'));
    assert.ok(out.toLowerCase().includes('httponly'));
    assert.ok(out.toLowerCase().includes('samesite=lax'));
  });

  it('serializes a clearing cookie (maxAge=0, empty value)', function () {
    const out = Cookies.serialize('sid', '', { maxAge: 0, path: '/' });
    assert.equal(out, 'sid=; Max-Age=0; Path=/');
  });

  it('serializes SameSite=strict correctly', function () {
    const out = Cookies.serialize('sid', 'abc', { maxAge: 3600, sameSite: 'strict' });
    assert.ok(out.toLowerCase().includes('samesite=strict'));
  });

  it('serializes SameSite=none correctly', function () {
    const out = Cookies.serialize('sid', 'abc', { maxAge: 3600, sameSite: 'none' });
    assert.ok(out.toLowerCase().includes('samesite=none'));
  });

  it('omits Secure when secure=false', function () {
    const out = Cookies.serialize('sid', 'abc', { maxAge: 3600, secure: false });
    assert.ok(!out.toLowerCase().includes('secure'));
  });

  it('omits HttpOnly when httpOnly=false', function () {
    const out = Cookies.serialize('sid', 'abc', { maxAge: 3600, httpOnly: false });
    assert.ok(!out.toLowerCase().includes('httponly'));
  });

  it('omits Max-Age when not provided', function () {
    const out = Cookies.serialize('sid', 'abc', { path: '/' });
    assert.ok(!out.toLowerCase().includes('max-age'));
  });

});


// ============================================================================
// parts/cookies - parse edge cases
// ============================================================================

describe('parts/cookies - parse edge cases', function () {

  const Cookies = CookiesFactory(Lib);

  it('parses a quoted cookie value with spaces', function () {
    // Per RFC 6265 a quoted-string value is valid; the cookie lib preserves
    // the surrounding quotes in the parsed value.
    const out = Cookies.parse('greeting="hello world"');
    assert.equal(out.greeting, '"hello world"');
  });

  it('handles an empty cookie value', function () {
    const out = Cookies.parse('session=');
    assert.equal(out.session, '');
  });

  it('returns first value when same name appears twice (first-wins)', function () {
    // Document first-wins precedence so adapters and callers can rely on it.
    // This is the jshttp `cookie` library default; subsequent declarations of
    // the same name are ignored.
    const out = Cookies.parse('id=first; id=second');
    assert.equal(out.id, 'first');
  });

  it('parses a Bearer-style token stored in a cookie', function () {
    const token = 'eyJhbGciOiJIUzI1NiJ9';
    const out = Cookies.parse('auth=' + encodeURIComponent('Bearer ' + token));
    assert.equal(out.auth, 'Bearer ' + token);
  });

  it('parses cookies with leading and trailing whitespace around separators', function () {
    const out = Cookies.parse('  a=1 ;  b=2  ;  c=3  ');
    assert.equal(out.a, '1');
    assert.equal(out.b, '2');
    assert.equal(out.c, '3');
  });

  it('returns empty object for null header', function () {
    const out = Cookies.parse(null);
    assert.equal(Object.keys(out).length, 0);
  });

  it('returns empty object for non-string header', function () {
    const out = Cookies.parse(123);
    assert.equal(Object.keys(out).length, 0);
  });

});


// ============================================================================
// instance.http_request.url
// ============================================================================

describe('instance.http_request.url', function () {

  it('populates url from raw_request', function () {
    const { gateway } = buildGatewayWithMemory();
    const { instance } = initInstance(gateway, {
      url: '/users/42?sort=name'
    });
    assert.equal(instance.http_request.url, '/users/42?sort=name');
  });

  it('defaults to empty string when url is absent', function () {
    const { gateway } = buildGatewayWithMemory();
    const { instance } = initInstance(gateway, {});
    assert.equal(instance.http_request.url, '');
  });

});


// ============================================================================
// getBearerToken
// ============================================================================

describe('getBearerToken', function () {

  it('extracts the token from a valid Bearer header', function () {
    const { gateway } = buildGatewayWithMemory();
    const { instance } = initInstance(gateway, {
      headers: { 'authorization': 'Bearer eyJhbGciOiJIUzI1NiJ9.payload.sig' }
    });
    assert.equal(gateway.getBearerToken(instance), 'eyJhbGciOiJIUzI1NiJ9.payload.sig');
  });

  it('returns null when Authorization header is absent', function () {
    const { gateway } = buildGatewayWithMemory();
    const { instance } = initInstance(gateway, { headers: {} });
    assert.equal(gateway.getBearerToken(instance), null);
  });

  it('returns null when Authorization header uses Basic scheme', function () {
    const { gateway } = buildGatewayWithMemory();
    const cred = Buffer.from('user:pass').toString('base64');
    const { instance } = initInstance(gateway, {
      headers: { 'authorization': 'Basic ' + cred }
    });
    assert.equal(gateway.getBearerToken(instance), null);
  });

  it('handles case-insensitive Bearer prefix', function () {
    const { gateway } = buildGatewayWithMemory();
    const { instance } = initInstance(gateway, {
      headers: { 'authorization': 'BEARER mytoken123' }
    });
    assert.equal(gateway.getBearerToken(instance), 'mytoken123');
  });

  it('returns null when Bearer prefix is present but token is empty', function () {
    const { gateway } = buildGatewayWithMemory();
    const { instance } = initInstance(gateway, {
      headers: { 'authorization': 'Bearer ' }
    });
    assert.equal(gateway.getBearerToken(instance), null);
  });

  it('returns null when header value is too short to contain a token', function () {
    const { gateway } = buildGatewayWithMemory();
    const { instance } = initInstance(gateway, {
      headers: { 'authorization': 'Bear' }
    });
    assert.equal(gateway.getBearerToken(instance), null);
  });

});


// ============================================================================
// CONFIG ABSORPTION CONTRACT
// ============================================================================

describe('config absorption contract', function () {

  // Sanity anchor: valid baseline must construct cleanly.
  it('constructs with a valid baseline config', function () {
    assert.doesNotThrow(function () { HttpGateway(Lib, validBaseConfig()); });
  });

  // OVERRIDE WINS (Strategy 1): override Adapter with null — the null replaces
  // the valid object and validation must throw, proving the override reached
  // CONFIG (if the default were kept, it would not throw here).
  it('absorbs an Adapter override — null override triggers the required-Adapter validation', function () {
    assert.throws(function () {
      HttpGateway(Lib, Object.assign(validBaseConfig(), { Adapter: null }));
    }, /CONFIG\.Adapter must be a ready-to-use adapter object/);
  });

  // NULL HONORED: not applicable at unit tier — CONFIG default (Adapter)
  // is null. There is no key with a non-null default whose null-override
  // would produce a distinct observable outcome at this tier.

});



// ============================================================================
// isPreflightRequest
// ============================================================================

describe('isPreflightRequest', function () {

  it('returns true for OPTIONS + Origin', function () {
    const { gateway } = buildGatewayWithMemory();
    const { instance } = initInstance(gateway, {
      method: 'OPTIONS',
      headers: { 'origin': 'https://app.example.com' }
    });
    assert.equal(gateway.isPreflightRequest(instance), true);
  });

  it('returns false for GET + Origin', function () {
    const { gateway } = buildGatewayWithMemory();
    const { instance } = initInstance(gateway, {
      method: 'GET',
      headers: { 'origin': 'https://app.example.com' }
    });
    assert.equal(gateway.isPreflightRequest(instance), false);
  });

  it('returns false for OPTIONS without Origin', function () {
    const { gateway } = buildGatewayWithMemory();
    const { instance } = initInstance(gateway, {
      method: 'OPTIONS',
      headers: {}
    });
    assert.equal(gateway.isPreflightRequest(instance), false);
  });

  it('returns false for POST without Origin', function () {
    const { gateway } = buildGatewayWithMemory();
    const { instance } = initInstance(gateway, {
      method: 'POST',
      headers: {}
    });
    assert.equal(gateway.isPreflightRequest(instance), false);
  });

});
