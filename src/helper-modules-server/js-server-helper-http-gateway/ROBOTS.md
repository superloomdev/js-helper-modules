# helper-http-gateway

**Class:** B (Extended Utility, Node.js runtime only)
**Scope:** Incoming HTTP gateway for Node.js servers. Normalizes raw runtime request data
(AWS API Gateway event, Express req) into a per-request instance and writes responses back
through runtime-specific adapters.

---

## Singleton Loader

```javascript
const Adapter = require('helper-http-gateway-adapter-aws-apigateway')({});
const Gateway = require('helper-http-gateway')(Lib, {
  Adapter: Adapter
});
```

Node.js `require` cache guarantees the same `Gateway` object is returned on every subsequent call. One loader call per process.

**Config validation:** Throws at construction time if `Adapter` is missing or not an object.

**Peer dependencies in Lib:** `Utils`, `Debug`, `Instance`

---

## Public Interface

### Request Lifecycle

```javascript
// Populate instance with normalized request data from raw runtime input
Gateway.initHttpRequestData(instance, raw_request, raw_context, response_callback);
// Returns: void

// Returns true if instance was initialized with HTTP request data
Gateway.isHttpInstance(instance);
// Returns: Boolean
```

### Parameter Extraction

```javascript
// Build typed, validated args object from instance.http_request
Gateway.setArgsFromRequest(instance, params);
// Returns: [null, args] | [null, false] | [err, false]
```

Param descriptor shape:

```javascript
{
  in: 'query' | 'body' | 'header' | 'params' | 'fixed',
                               // source location (preferred)
  method: 'GET' | 'POST' | 'HEADER' | 'PATH' | 'FIXED',
                               // HTTP verb context; source fallback when `in` absent
  name: String,              // key in source location
  rename: String,            // output key name in returned args
  value: *,                  // literal value (fixed only)
  required: Boolean,         // [null, false] if absent
  default: *,                // used when absent and not required
  is_number: Boolean,        // typecast to Number
  is_boolean: Boolean,       // typecast via Boolean(Number(v))
  is_json: Boolean,          // JSON.parse
  trim: Boolean,             // trim whitespace, empty string -> null
  json_func: Function,       // transform applied after JSON.parse
  sanitize_func: Function,   // sanitization function
  validate_func: Function,   // must return truthy; failure -> [null, false]
  invalidate_func: Function  // must return falsy; truthy return -> [err, false]
}
```

### Response Functions

```javascript
// Send HTTP response. Param order mirrors HTTP sequence: status -> headers -> cookies -> body
Gateway.returnHttpResponse(instance, status, headers?, cookies?, body?);
// cookies: descriptor built by buildCookie(), serialized into Set-Cookie at gateway boundary
// Default headers added: Cache-Control: max-age=0, Content-Type: application/json
// Returns: Boolean (always true)

// Send a body-less HTTP status response
Gateway.returnHttpStatus(instance, status_name);
// status_name: 'not_modified'(304) | 'bad_request'(400) | 'unauthorized'(401)
//            | 'not_found'(404) | 'invalid_token'(498)
// Returns: Boolean (always true)

// Send a 301 permanent redirect
Gateway.returnHttpRedirect(instance, location);
// Returns: Boolean (always true)

// Send a 301 redirect to /404
Gateway.returnHttpRedirect404(instance);
// Returns: Boolean (always true)
```

### Cookie Builder

```javascript
// Build (or accumulate) a cookie descriptor. Pass as 4th param to returnHttpResponse
Gateway.buildCookie(existing, name, value, ttl, options?);
// existing : previous buildCookie result to append to, or null to start fresh
// ttl      : seconds. 0 = expire/clear immediately, >0 = persistent
// options  : attribute overrides (all optional, override gateway defaults)
//   { httpOnly: true, secure: true, sameSite: 'lax', path: '/', domain: unset }
// SameSite=None omitted automatically for incompatible browsers:
//   iOS 12, macOS 10.14 Safari, UC Browser < 12.13.2, Chromium 51-66
// Returns: Object (cookie descriptor, plain object keyed by cookie name)

// Set one cookie
const cookies = Gateway.buildCookie(null, 'session', token, 86400);
Gateway.returnHttpResponse(instance, 200, null, cookies, body);

// Accumulate two cookies
let cookies = Gateway.buildCookie(null, 'session', token, 86400);
cookies     = Gateway.buildCookie(cookies, 'pref', 'dark', 2592000);
Gateway.returnHttpResponse(instance, 200, null, cookies, body);

// Clear a cookie (ttl = 0, value = '')
const cookies = Gateway.buildCookie(null, 'session', '', 0);
Gateway.returnHttpResponse(instance, 200, null, cookies, null);

// Override httpOnly to allow JS access
const cookies = Gateway.buildCookie(null, 'csrf', token, 3600, { httpOnly: false });
```

### Request Accessors

```javascript
Gateway.getRequestIPAddress(instance);   // String. First IP from x-forwarded-for, or ''
Gateway.getRequestUserAgent(instance);   // String. User-Agent header, or ''
Gateway.getRequestOrigin(instance);      // String. Origin header, or ''
Gateway.getRequestCountryCode(instance); // String | null. From CDN header if available
Gateway.getBearerToken(instance);        // String | null. Token from Authorization: Bearer <token>
Gateway.isPreflightRequest(instance);    // Boolean. True if OPTIONS + Origin header present
```

### Utilities

```javascript
Gateway.getHttpTime(timestamp_seconds?);
// Returns: String. HTTP-date format, e.g. "Wed, 21 Oct 2015 07:28:00 GMT"
// Uses current time when no argument given

Gateway.getUrlParts(url);
// Returns: { sub_domain, domain, domain_without_tld, tld, hostname, is_ip }
```

---

## Instance Shape (after initHttpRequestData)

```javascript
instance.http_request = {
  headers : { /* lowercase header keys */ },
  query   : { /* query string params */ },
  body    : { /* JSON or form-urlencoded body fields */ },
  params  : { /* URL path params */ },
  method  : 'GET' | 'POST' | ...,
  url     : '/path?query=string',
  cookies : { /* parsed Cookie header, read inbound cookies from here */ }
};

instance._http_gateway = {
  response_handler: Function
};
```

---

## Adapter Contract (for adapter implementers)

```javascript
adapter.extractRequest(raw_request, raw_context, response_callback);
// Returns: { headers, cookies, query, body, params, method, url, response_handler }

adapter.buildResponseEnvelope(status, headers, body);
// Returns: runtime-specific response envelope

adapter.getCountryCode(headers);
// Returns: String | null
```

---

## Error Catalog

```javascript
{
  INVALID_PARAM: {
    type: 'HTTP_GATEWAY_INVALID_PARAM',
    message: 'One or more required request parameters are missing or invalid'
  },
  NOT_IMPLEMENTED: {
    type: 'NOT_IMPLEMENTED',
    message: 'This operation is not yet implemented for this adapter'
  }
}
```

---

## Constraints

- **Multipart not supported.** POST bodies must be `application/json` or `application/x-www-form-urlencoded`. Multipart results in empty `instance.http_request.body`.
- **Cookies are return values, not side effects.** Never write `Set-Cookie` headers manually; always use `buildCookie` + `returnHttpResponse`.
- **No module below the gateway serializes cookies.** Descriptors flow up the call chain; serialization happens only at the gateway boundary.

---

## Dependencies

**Bundled:** `cookie@1.x`, `tldts@5.x`

**Peer (in Lib):** `helper-utils`, `helper-debug`, `helper-instance`

**Optional peer:** runtime adapter (`adapter-aws-apigateway` or `adapter-express`)

---

## Testing

```bash
cd _test && npm install && npm test
```

In-process stub adapter. No external services required. 133 tests covering: loader
validation, all public methods, `buildCookie` (fresh/accumulate/override/clear/immutability),
`returnHttpResponse` with cookies (defaults, overrides, SameSite=None UA guard),
param extraction (all sources via `in` key, legacy `method` fallback, typecasts, validators),
`getBearerToken`, `isPreflightRequest`, `url` field, parts internals.
