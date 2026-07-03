# API Reference

Complete function reference for `helper-http-gateway`. All functions are methods on the HttpGateway interface returned by the loader.

**Related docs:**
- [`configuration.md`](configuration.md) for loader pattern and config keys
- [`schemas.md`](schemas.md) for the validated contracts and return conventions

---

## Conventions

**Error handling:** This module uses the Superloom standard return envelope. Functions return `[err, result]` where `err` is `null` on success. Parameter extraction uses `[null, false]` to signal validation failure without an error object.

**Instance pattern:** All request-scoped functions operate on a per-request `instance` object. Initialize it with `initHttpRequestData` before calling other functions.

---

## Request Lifecycle

### initHttpRequestData(instance, raw_request, raw_context, response_callback)

Initialize HTTP request data in the instance from raw runtime data. Delegates to the configured adapter which returns normalized request fields. Gateway writes those fields into `instance.http_request` and stores an internal response handler under `instance._http_gateway.response_handler`.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `instance` | `Object` | Yes | Per-request instance to populate |
| `raw_request` | `Object` | Yes | Raw request from runtime (event or req) |
| `raw_context` | `Object` | No | Runtime execution context (ctx or null) |
| `response_callback` | `Function` | Yes | Runtime response callback (cb or res) |

**Returns:** `void`

**Example:**
```javascript
const instance = Lib.Instance.initialize();
Gateway.initHttpRequestData(instance, event, context, callback);
```

---

### isHttpInstance(instance)

Returns `true` if the instance was initialized with HTTP request data.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `instance` | `Object` | Yes | Per-request instance |

**Returns:** `Boolean`

---

## Parameter Extraction

### setArgsFromRequest(instance, params)

Build a typed, validated args object from the normalized HTTP request data in `instance.http_request`.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `instance` | `Object` | Yes | Per-request instance with http_request populated |
| `params` | `Object[]` | Yes | Array of parameter descriptor objects |

**Param descriptor shape:**

| Field | Type | Description |
|-------|------|-------------|
| `in` | `String` | Source location (preferred): `'query'` \| `'body'` \| `'header'` \| `'params'` \| `'fixed'` |
| `method` | `String` | HTTP verb context. Used as source fallback when `in` is absent: `'GET'`->query, `'POST'`->body, `'PATH'`->params, `'HEADER'`->header, `'FIXED'`->fixed |
| `name` | `String` | Key name in the source location |
| `rename` | `String` | Output key name in returned args object |
| `value` | `*` | Literal value (only for `in: 'fixed'`) |
| `required` | `Boolean` | `true` aborts and returns `[null, false]` if missing |
| `default` | `*` | Value used when param is absent and not required |
| `is_number` | `Boolean` | Typecast string to Number |
| `is_boolean` | `Boolean` | Typecast via `Boolean(Number(value))` |
| `is_json` | `Boolean` | Parse value with `JSON.parse` |
| `trim` | `Boolean` | Trim whitespace; converts empty string to null |
| `json_func` | `Function` | Transform applied after `JSON.parse` |
| `sanitize_func` | `Function` | Sanitization function applied to the value |
| `validate_func` | `Function` | Must return truthy; failure returns `[null, false]` |
| `invalidate_func` | `Function` | Must return falsy; truthy return is forwarded as `[err, false]` |

**Returns:**
- `[null, {Object}]` on success
- `[null, false]` on required-param or validation failure
- `[{Object}, false]` on `invalidate_func` failure

**Example:**
```javascript
const [err, args] = Gateway.setArgsFromRequest(instance, [
  { method: 'GET', in: 'query',  name: 'page',  rename: 'page',  required: false, default: 1, is_number: true },
  { method: 'POST', in: 'body',  name: 'email', rename: 'email', required: true, trim: true },
  { method: 'GET', in: 'header', name: 'authorization', rename: 'token', required: true }
]);

if (!args) {
  return Gateway.returnHttpStatus(instance, 'bad_request');
}
```

---

## Response Functions

### returnHttpResponse(instance, status, headers, cookies, body)

Send an HTTP response back through the runtime callback. Param order mirrors the HTTP response sequence: status -> headers -> cookies -> body. Merges default headers with caller-supplied headers, then serializes the `cookies` descriptor into `Set-Cookie` header strings before firing the response.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `instance` | `Object` | Yes | Per-request instance |
| `status` | `Integer` | Yes | HTTP status code |
| `headers` | `Object` | No | Additional response headers |
| `cookies` | `Object` | No | Cookie descriptor built by `buildCookie()` |
| `body` | `Object` | No | Response body (serialized as JSON) |

**Returns:** `Boolean` (always `true`)

**Example: plain response (no cookies)**
```javascript
return Gateway.returnHttpResponse(instance, 200, null, null, { ok: true, data: result });
```

**Example: response with a cookie**
```javascript
const cookies = Gateway.buildCookie(null, 'session', token, 86400);
return Gateway.returnHttpResponse(instance, 200, null, cookies, { ok: true });
```

---

### returnHttpStatus(instance, status_name)

Send a body-less HTTP status response.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `instance` | `Object` | Yes | Per-request instance |
| `status_name` | `String` | Yes | One of: `'not_modified'` \| `'bad_request'` \| `'unauthorized'` \| `'not_found'` \| `'invalid_token'` |

**Returns:** `Boolean` (always `true`)

**Status code mapping:**

| status_name | HTTP Code |
|-------------|-----------|
| `not_modified` | 304 |
| `bad_request` | 400 |
| `unauthorized` | 401 |
| `not_found` | 404 |
| `invalid_token` | 498 |

---

### returnHttpRedirect(instance, location)

Send a 301 permanent redirect response.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `instance` | `Object` | Yes | Per-request instance |
| `location` | `String` | Yes | Redirect target URI |

**Returns:** `Boolean` (always `true`)

---

### returnHttpRedirect404(instance)

Send a 301 redirect to `/404`.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `instance` | `Object` | Yes | Per-request instance |

**Returns:** `Boolean` (always `true`)

---

## Request Accessors

### getRequestIPAddress(instance)

Get the client IP address from the request headers. Uses the `x-forwarded-for` header and returns the first IP in the chain (the originating client address).

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `instance` | `Object` | Yes | Per-request instance |

**Returns:** `String` - IP address or empty string if not available

---

### getRequestUserAgent(instance)

Get the User-Agent string from the request headers.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `instance` | `Object` | Yes | Per-request instance |

**Returns:** `String` - User-Agent or empty string if not present

---

### getRequestOrigin(instance)

Get the Origin header from the request. Returns the scheme plus host (for example, `https://api.example.com`).

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `instance` | `Object` | Yes | Per-request instance |

**Returns:** `String` - Origin string or empty string if not present

---

### getRequestCountryCode(instance)

Get the viewer country code from the request. Availability depends on the adapter. Adapters that cannot supply this (for example, Express without a CDN) return `null`.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `instance` | `Object` | Yes | Per-request instance |

**Returns:** `String` \| `null` - ISO 3166-1 alpha-2 country code or null

---

### getBearerToken(instance)

Extract the Bearer token from the `Authorization` header. Returns `null` if the header is missing, does not use the Bearer scheme, or the token portion is empty.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `instance` | `Object` | Yes | Per-request instance |

**Returns:** `String` \| `null` - The token string, or null

**Example:**
```javascript
const token = Gateway.getBearerToken(instance);
if (!token) {
  return Gateway.returnHttpStatus(instance, 'unauthorized');
}
```

---

### isPreflightRequest(instance)

Returns `true` if the request is a CORS preflight. The HTTP method is `OPTIONS` and the `Origin` header is present.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `instance` | `Object` | Yes | Per-request instance |

**Returns:** `Boolean`

---

## Utilities

### buildCookie(existing, name, value, ttl, options)

Build a cookie descriptor object, or add a new entry to an existing one. The descriptor is a plain object keyed by cookie name. Pass it as the `cookies` argument to `returnHttpResponse` for serialization into `Set-Cookie` headers.

Cookie name is used as the object key, so a second call with the same name overwrites the first, giving natural dedup and override. Serialization (including default attributes and SameSite=None UA detection) happens inside `returnHttpResponse`, not here.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `existing` | `Object\|null` | Yes | Previous `buildCookie` result to append to, or `null` to start fresh |
| `name` | `String` | Yes | Cookie name |
| `value` | `String` | Yes | Cookie value. Use `''` to clear |
| `ttl` | `Number` | Yes | Lifetime in seconds. `0` = expire/clear immediately |
| `options` | `Object` | No | Attribute overrides applied at serialization |

**`options` keys** (all optional, these override the gateway defaults):

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `httpOnly` | `Boolean` | `true` | Restrict cookie to HTTP only (no JS access) |
| `secure` | `Boolean` | `true` | HTTPS-only |
| `sameSite` | `String` | `'lax'` | `'lax'` \| `'strict'` \| `'none'` |
| `path` | `String` | `'/'` | Cookie path scope |
| `domain` | `String` | unset | Cookie domain scope |

**Returns:** `Object` (cookie descriptor)

**Example: set one cookie**
```javascript
const cookies = Gateway.buildCookie(null, 'session', token, 86400);
Gateway.returnHttpResponse(instance, 200, null, cookies, body);
```

**Example: accumulate two cookies**
```javascript
let cookies = Gateway.buildCookie(null, 'session', token, 86400);
cookies = Gateway.buildCookie(cookies, 'pref', 'dark', 2592000);
Gateway.returnHttpResponse(instance, 200, null, cookies, body);
```

**Example: clear a cookie (ttl = 0)**
```javascript
const cookies = Gateway.buildCookie(null, 'session', '', 0);
Gateway.returnHttpResponse(instance, 200, null, cookies, null);
```

**Example: override httpOnly to allow JS access**
```javascript
const cookies = Gateway.buildCookie(null, 'csrf', token, 3600, { httpOnly: false });
```

---

### getHttpTime(timestamp_seconds)

Format a Unix timestamp (seconds) as an HTTP-date string. If no timestamp is provided, the current time is used.

**Format:** `"Day, DD Mon YYYY HH:MM:SS GMT"`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `timestamp_seconds` | `Number` | No | Unix timestamp in seconds |

**Returns:** `String` - HTTP-date formatted string

**Example:**
```javascript
const expires = Gateway.getHttpTime(Date.now() / 1000 + 86400);
// "Wed, 21 Oct 2015 07:28:00 GMT"
```

---

### getUrlParts(url)

Extract the component parts of a URL.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `url` | `String` | Yes | Full URL string to parse |

**Returns:** `Object` with keys:

| Key | Type | Description |
|-----|------|-------------|
| `sub_domain` | `String` | Subdomain portion (for example, `www.abc`) |
| `domain` | `String` | Full domain with TLD (for example, `example.co.uk`) |
| `domain_without_tld` | `String` | Domain name without TLD (for example, `example`) |
| `tld` | `String` | Public suffix or TLD (for example, `co.uk`) |
| `hostname` | `String` | Full hostname (for example, `www.abc.example.co.uk`) |
| `is_ip` | `Boolean` | `true` when URL is an IP address |

**Example:**
```javascript
const parts = Gateway.getUrlParts('http://www.abc.example.co.uk:8080/path');
// {
//   sub_domain: 'www.abc',
//   domain: 'example.co.uk',
//   domain_without_tld: 'example',
//   tld: 'co.uk',
//   hostname: 'www.abc.example.co.uk',
//   is_ip: false
// }
```

---

## Adapter Contract

Every runtime adapter implements three methods. The gateway calls these; application code does not.

### extractRequest(raw_request, raw_context, response_callback)

Return normalized request data from the raw runtime input. The adapter extracts headers, query params, path params, and body from the runtime-specific format and returns them with a runtime response handler.

### buildResponseEnvelope(status, headers, body)

Build the runtime-specific response envelope. Returns an object suitable for the runtime (for example, API Gateway response format or Express res object).

### getCountryCode(headers)

Return the viewer country code if the runtime can supply it (for example, CloudFront). Input is the normalized request headers map. Returns `null` when unavailable.

---

## SameSite=None Compatibility

`returnHttpResponse` automatically manages the `SameSite=None` attribute when serializing the `cookies` descriptor. If a cookie's `options.sameSite` is `'none'`, it checks the request `User-Agent` header. The following browser families have known bugs that cause them to reject or mishandle cookies set with `SameSite=None`:

| Affected client | Bug |
|-----------------|-----|
| iOS 12 (all browsers) | Treats `SameSite=None` as `SameSite=Strict`. Cookie is blocked on cross-site requests |
| macOS 10.14 Safari and embedded browser | Same WebKit bug as iOS 12 |
| UC Browser below 12.13.2 | Drops the cookie entirely when `SameSite=None` is present |
| Chromium 51-66 | Drops any cookie with an unrecognized `SameSite` value |

For these clients, `returnHttpResponse` serializes the cookie without any `SameSite` attribute. Modern browsers (Chromium 67+, Safari 13+, Firefox 79+) receive `SameSite=None; Secure` as intended by RFC 6265bis.

The default `sameSite` applied by the gateway is `'lax'`, which is safe for all browsers. Set `sameSite: 'none'` in `buildCookie` options only when cross-site cookie access is required.

This detection is based on the [Chromium SameSite incompatible clients list](https://www.chromium.org/updates/same-site/incompatible-clients).

---

## Multipart Limitation

This module does **not** support `multipart/form-data` request bodies. Sending a multipart request results in an empty `instance.http_request.body`. The body is not parsed and no error is raised.

POST data uses `application/json` or `application/x-www-form-urlencoded`. Multipart support will be added in a future version via a dedicated adapter-level option.
