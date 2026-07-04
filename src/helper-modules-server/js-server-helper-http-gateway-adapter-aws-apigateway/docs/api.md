# API Reference

Complete reference for `@superloomdev/js-server-helper-http-gateway-adapter-aws-apigateway`. Application code rarely calls these methods directly - they are invoked by the gateway. This document describes what each method does so adapter behavior is fully transparent.

**Related docs:**
- [`payload-format.md`](payload-format.md) for the v2.0 event schema and unsupported v1.0 boundary
- [`../ROBOTS.md`](../ROBOTS.md) for compact signature reference
- [`../../js-server-helper-http-gateway/docs/api.md`](../../js-server-helper-http-gateway/docs/api.md) for the gateway methods you call from application code

---

## Conventions

**Stateless singleton.** The adapter is a single module-level object with no per-request state. It returns normalized request data for the gateway to write into `instance`.

**Loader contract.** Pass the adapter as `CONFIG.ADAPTER` to the gateway singleton loader. The gateway calls it once at construction time and reuses the returned adapter object for every request.

---

## Adapter Contract

### extractRequest(event, context, lambda_callback)

Normalize an API Gateway v2.0 event into a plain request object and return a `response_handler` closure for the gateway. Called by `Gateway.initHttpRequestData`.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `event` | `Object` | Yes | API Gateway v2.0 event |
| `context` | `*` | No | Lambda execution context (currently unused; accepted for adapter contract) |
| `lambda_callback` | `Function` | Yes | Lambda `callback(err, response)` |

**Returns object fields:**

| Field | Source | Type |
|-------|--------|------|
| `method` | `event.requestContext.http.method` (uppercased) | `String` or `null` |
| `headers` | `event.headers` (all keys lowercased) | `Object` |
| `query` | `event.queryStringParameters` | `Object` |
| `body` | Parsed body - see [`payload-format.md`](payload-format.md#body-parsing) | `Object` |
| `params` | `event.pathParameters` (or `{}`) | `Object` |
| `cookies` | Parsed from `event.cookies` array (or `{}`) | `Object` |
| `response_handler` | Wraps `lambda_callback(err, envelope)` | `Function` |

Gateway writes these returned fields into `instance.http_request` and stores the handler at `instance._http_gateway.response_handler`.

**Defensive behavior:**

- `event === null`: returned object still contains empty defaults; `method` is `null`
- `event.requestContext` missing or has no `http` block: `method` is `null`
- `event.headers` missing: `headers` is `{}`
- `event.body` missing or empty: `body` is `{}`
- `event.cookies` not an array: `cookies` is `{}`

---

### buildResponseEnvelope(status, headers, body)

Build the Lambda response envelope. The gateway uses this to assemble the final payload before invoking `instance._http_gateway.response_handler`.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `status` | `Integer` | Yes | HTTP status code |
| `headers` | `Object` | No | Response headers (defaults to `{}`) |
| `body` | `*` | No | Body - string, object, Buffer, or null |

**Body normalization:**

| Body type | `envelope.body` | `envelope.isBase64Encoded` |
|-----------|------------------|----------------------------|
| `null` / `undefined` | `''` | `false` |
| `Buffer` | base64 string | `true` |
| `Object` | `JSON.stringify(body)` | `false` |
| Any other | `String(body)` | `false` |

**Returns:** `Object` - `{ statusCode, headers, body, isBase64Encoded }`

This is the exact shape API Gateway expects from a Lambda proxy integration with v2.0 payload format.

---

### getCountryCode(headers)

Returns the viewer country code from the `CloudFront-Viewer-Country` header in the normalized headers map (forwarded through API Gateway when a CloudFront distribution sits in front).

**Returns:** `String` (ISO 3166-1 alpha-2) or `null` if the header is absent.

**Example:**
```javascript
// instance.http_request.headers['cloudfront-viewer-country'] === 'US'
Gateway.getRequestCountryCode(instance);  // -> 'US'
```

The lookup is case-insensitive because the adapter lowercases all header keys during request normalization.

---

## Response Sending Flow

When `Gateway.returnHttpResponse(instance, status, headers, body)` is called inside a Lambda handler:

1. Gateway merges caller-supplied headers over its defaults (`Cache-Control: max-age=0`, `Content-Type: application/json`)
2. Gateway calls `adapter.buildResponseEnvelope(status, merged_headers, body)`
3. Gateway calls `instance._http_gateway.response_handler(null, envelope)`
4. Adapter's callback invokes the Lambda `callback(null, envelope)` - Lambda returns the envelope to API Gateway

For `async`/Promise-based Lambda handlers, the `callback` argument is still accepted by AWS Lambda. The gateway invokes it identically.

---

## Cookie Handling

**Reading:** API Gateway v2.0 delivers cookies as a JSON array of name=value strings under `event.cookies`. The adapter parses each entry into `instance.http_request.cookies`. URL-encoded values are decoded.

**Writing:** `Gateway.buildCookie(...)` returns a cookie descriptor object. `Gateway.returnHttpResponse(...)` serializes each cookie and collects them into a `Set-Cookie` header array. See [`../../js-server-helper-http-gateway/docs/api.md`](../../js-server-helper-http-gateway/docs/api.md) for the full cookie API.

---

## Authorizer Context

API Gateway v2.0 places authorizer output (JWT claims, IAM identity, Lambda authorizer payload) on the raw event at `event.requestContext.authorizer`. The adapter does **not** promote this data into `instance.http_request`. Application code that needs it should read the raw event directly:

```javascript
exports.handler = function (event, context, callback) {
  const instance = Lib.Instance.initialize();
  Gateway.initHttpRequestData(instance, event, context, callback);

  // Authorizer context lives on the raw event, not on instance:
  const claims = event.requestContext &&
                 event.requestContext.authorizer &&
                 event.requestContext.authorizer.jwt &&
                 event.requestContext.authorizer.jwt.claims;

  // ... application logic ...
};
```

This is intentional - the adapter does not impose a single authorizer schema across HTTP API, REST API, and custom authorizer payloads. Each application reads what it needs.
