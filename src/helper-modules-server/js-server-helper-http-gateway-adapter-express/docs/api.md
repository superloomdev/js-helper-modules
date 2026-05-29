# API Reference

Complete reference for `@superloomdev/js-server-helper-http-gateway-adapter-express`. Application code rarely calls these methods directly — they are invoked by the gateway. This document describes what each method does so adapter behavior is fully transparent.

**Related docs:**
- [`middleware.md`](middleware.md) for the Express middleware setup the adapter relies on
- [`../ROBOTS.md`](../ROBOTS.md) for compact signature reference
- [`../../js-server-helper-http-gateway/docs/api.md`](../../js-server-helper-http-gateway/docs/api.md) for the gateway methods you call from application code

---

## Conventions

**Stateless singleton.** The adapter is a single module-level object with no per-request state. It returns normalized request data for the gateway to write into `instance`.

**Loader contract.** Pass the adapter as `CONFIG.ADAPTER` to the gateway singleton loader. The gateway calls it once at construction time and reuses the returned adapter object for every request.

---

## Adapter Contract

### extractRequest(req, context, res)

Normalize an Express `req` object into a plain request object and return a `response_handler` closure. Called by `Gateway.initHttpRequestData`.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `req` | `Object` | Yes | Express request |
| `context` | `*` | No | Unused (accepted for adapter contract) |
| `res` | `Object` | Yes | Express response |

**Returns object fields:**

| Field | Source | Type |
|-------|--------|------|
| `method` | `req.method` (uppercased) | `String` |
| `headers` | `req.headers` (already lowercased by Node http) | `Object` |
| `query` | `req.query` | `Object` |
| `body` | `req.body` (or `{}` if absent) | `Object` |
| `params` | `req.params` | `Object` |
| `cookies` | `req.cookies` if present, else parsed from `Cookie` header | `Object` |
| `response_handler` | Wraps `res.status().set().send()` | `Function` |

Gateway writes these returned fields into `instance.http_request` and stores the handler at `instance._http_gateway.response_handler`.

---

### buildResponseEnvelope(status, headers, body)

Build the response envelope. The gateway uses this to assemble the final payload before invoking `instance._http_gateway.response_handler`.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `status` | `Integer` | Yes | HTTP status code |
| `headers` | `Object` | No | Response headers (defaults to `{}`) |
| `body` | `*` | No | Body — string, object, Buffer, or null |

**Body normalization:**

| Body type | Output |
|-----------|--------|
| `null` / `undefined` | `''` |
| `Buffer` | base64 string (then sent as raw via `res.send`) |
| `Object` | `JSON.stringify(body)` |
| Any other | `String(body)` |

**Returns:** `Object` — `{ statusCode, headers, body }`

---

### getCountryCode(headers)

Returns the viewer country code if a CDN forwards it.

Express has no native CDN layer, so this adapter **always returns `null`**. Projects fronting Express with CloudFront should implement a custom adapter that reads the `CloudFront-Viewer-Country` header.

**Returns:** `null`

---

## Response Sending Flow

When `Gateway.returnHttpResponse(instance, status, headers, body)` is called:

1. Gateway merges caller-supplied headers over its defaults (`Cache-Control: max-age=0`, `Content-Type: application/json`)
2. Gateway calls `adapter.buildResponseEnvelope(status, merged_headers, body)`
3. Gateway calls `instance._http_gateway.response_handler(null, envelope)`
4. Adapter's callback invokes `res.status(envelope.statusCode).set(envelope.headers).send(envelope.body)`

This is fully synchronous from the application's perspective.

---

## Cookie Handling

Reading: prefers `req.cookies` (populated by `cookie-parser` middleware). Falls back to parsing the raw `Cookie` header when `cookie-parser` is not installed.

Writing: `Gateway.buildCookie(...)` returns a descriptor object. `Gateway.returnHttpResponse(...)` serializes it into `Set-Cookie` headers at the gateway boundary. See [`../../js-server-helper-http-gateway/docs/api.md`](../../js-server-helper-http-gateway/docs/api.md) for the full cookie API.

---

## Country Code Customization

To enable country detection behind a CDN, write a thin wrapper adapter:

```javascript
const ExpressAdapter = require('@superloomdev/js-server-helper-http-gateway-adapter-express');

function CustomAdapter (Lib, config, errors) {
  const base = ExpressAdapter(Lib, config, errors);
  return Object.assign({}, base, {
    getCountryCode: function (headers) {
      return (headers && headers['cloudfront-viewer-country']) || null;
    }
  });
}

const Gateway = require('@superloomdev/js-server-helper-http-gateway')(Lib, { ADAPTER: CustomAdapter });
```

The other two contract methods (`extractRequest`, `buildResponseEnvelope`) inherit from the base adapter unchanged.
