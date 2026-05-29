# @superloomdev/js-server-helper-http-gateway-adapter-aws-apigateway

**Class:** B (Extended Utility - Node.js runtime only)
**Scope:** AWS Lambda + API Gateway HTTP API runtime adapter for `js-server-helper-http-gateway`. Supports payload format **v2.0 only** (HTTP API and Lambda Function URLs). Stateless singleton.

---

## Singleton Loader

```javascript
const AwsAdapter = require('@superloomdev/js-server-helper-http-gateway-adapter-aws-apigateway');

// Pass the adapter (not the result of calling it) as CONFIG.ADAPTER:
const Gateway = require('@superloomdev/js-server-helper-http-gateway')(Lib, {
  ADAPTER: AwsAdapter
});
```

**Peer dependencies in Lib:** `Utils` (type checks via `Lib.Utils.isString`, `Lib.Utils.isObject`, `Lib.Utils.isFunction`, `Lib.Utils.isNullOrUndefined`)

**Runtime peers:** none — no AWS SDK required, no Docker required, no external services

---

## Public Interface

The adapter exposes the 3-method contract consumed by the gateway. Application code does **not** call the adapter directly — it calls `Gateway.*` methods which delegate.

```javascript
// Extract normalized request data for the gateway to write into instance
adapter.extractRequest(event, context, lambda_callback);
// Returns: { headers, cookies, query, body, params, method, url, response_handler }

// Build the Lambda response envelope
adapter.buildResponseEnvelope(status, headers, body);
// Returns: Object - { statusCode, headers, body, isBase64Encoded }

// Country code from CloudFront-Viewer-Country header (forwarded through API GW)
adapter.getCountryCode(headers);
// Returns: String | null
```

---

## Request Normalization (v2.0 payload)

| `instance.http_request` field | Source on API Gateway v2.0 event |
|---|---|
| `method` | `event.requestContext.http.method` (uppercased); `null` if missing |
| `headers` | `event.headers` with all keys lowercased |
| `query` | `event.queryStringParameters` (multi-value keys are comma-combined per AWS spec) |
| `body` | Parsed body (JSON or urlencoded); see below |
| `params` | `event.pathParameters` (or `{}` if absent) |
| `cookies` | Parsed from `event.cookies` array (or `{}` if absent / not array) |
| `url` | `event.rawPath` + `?` + `event.rawQueryString` (or just `rawPath` if no query) |

`response_handler` is wired to call the Lambda `callback(err, envelope)`.

---

## Body Parsing

| `event.headers['content-type']` | Behavior |
|---|---|
| `application/json` | `JSON.parse(body)` then accept only **plain objects** (not arrays, not primitives). Falls back to `{}` on parse error |
| `application/x-www-form-urlencoded` | `URLSearchParams` parse → object |
| Any other (including `multipart/form-data`, `text/plain`, `application/xml`) | `{}` (not parsed) |
| Missing or empty body | `{}` |

If `event.isBase64Encoded === true`, the body is base64-decoded **before** content-type parsing.

---

## Supported Payload Formats

| Format | Used by | Supported |
|---|---|---|
| v2.0 | API Gateway **HTTP API**, **Lambda Function URLs** | ✅ Yes |
| v1.0 | API Gateway **REST API** | ❌ No — `instance.http_request.method` will be `null` |

The adapter does not throw on v1.0 events; it degrades gracefully so a downstream handler can return a clean 400 response. See [`docs/payload-format.md`](docs/payload-format.md) for the full v2.0 schema reference.

---

## Important Constraints

**Multipart/form-data not supported.** API Gateway v2.0 does support multipart payloads, but the adapter does not parse them. `body` will be `{}` for multipart requests.

**JSON root must be a plain object.** `body` is always a key/value map. JSON arrays and primitive root values (`["a","b"]`, `42`, `"hello"`) are rejected; `body` becomes `{}`. This is a root-level rule — array and primitive values **inside** a JSON object are preserved normally.

**Authorizer context is not promoted.** JWT claims, IAM identity, and Lambda authorizer payloads remain on the raw event at `event.requestContext.authorizer`. The adapter does not surface them as standard `instance.http_request` fields. Read them from the raw event if needed.

**Response is sent through the Lambda callback.** `buildResponseEnvelope` returns `{ statusCode, headers, body, isBase64Encoded }` which the gateway then delivers via `instance._http_gateway.response_handler(null, envelope)`.

---

## Testing

Tests run against **23 real API Gateway v2.0 event fixtures** (6 copied verbatim from `aws/aws-lambda-go/events/testdata`, 17 hand-written for scenarios AWS does not publish). No mocked event objects.

```bash
cd _test && npm install && npm test
```

**Coverage:** 66 tests across 10 groups — official AWS fixture compatibility (including the documented v1.0 unsupported boundary), method/path/query, headers, cookies, body parsing (JSON, urlencoded, base64, malformed, multipart, empty, unicode), response envelope, full gateway integration, country code, IP/UA/origin, and defensive edge cases.

See [`docs/api.md`](docs/api.md) and [`docs/payload-format.md`](docs/payload-format.md) for extended documentation.
