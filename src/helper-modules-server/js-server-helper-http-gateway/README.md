# @superloomdev/js-server-helper-http-gateway

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![Node.js 24+](https://img.shields.io/badge/Node.js-24%2B-brightgreen.svg)](https://nodejs.org)

An incoming HTTP gateway for Node.js servers. Normalizes raw runtime request data into a per-request instance and writes responses back through runtime-specific adapters. Part of [Superloom](https://superloom.dev).

## What This Is

A runtime-abstraction layer that sits between application logic and the HTTP transport. One loader call initializes the singleton HttpGateway bound to one runtime adapter and returns the same shared object on every subsequent `require`. The calling shape is identical regardless of whether the request arrived from AWS API Gateway or Express.

Application code reads `instance.http_request` and calls `returnHttpResponse`. The adapter wires it to the real runtime underneath.

## Why Use This Module

- **One codebase, two runtimes.** The same application handler runs unchanged on Docker (Express) and on AWS Lambda (API Gateway). Swap the adapter in configuration. No application rewrite.

- **Typed parameter extraction.** `setArgsFromRequest` reads from query, body, header, params, or fixed sources (specified via the `in` key on each param descriptor). It typecasts (string to Number, Boolean, JSON), trims, validates, and sanitizes in one declarative pass. It returns `[null, args]` on success or `[null, false]` on validation failure. No conditional chains scattered across handler code.

- **Request accessors.** `getBearerToken` extracts the token from an `Authorization: Bearer <token>` header. `isPreflightRequest` detects CORS preflight (OPTIONS + Origin). `getRequestIPAddress`, `getRequestUserAgent`, `getRequestOrigin`, and `getRequestCountryCode` read transport metadata.

- **Cookie management with browser-compatibility handling.** `buildCookie` returns a plain descriptor object (no serialization). `returnHttpResponse` serializes it into `Set-Cookie` headers at the gateway boundary, automatically omitting the `SameSite=None` attribute for browsers that mishandle it (iOS 12, macOS 10.14 Safari, UC Browser, Chromium 51-66). Applications build cookie descriptors without managing browser quirks or header strings.

- **Runtime adapters are separate packages.** A project installs only the adapter for its runtime. The module has no AWS SDK or Express dependency. A future adapter for a new runtime does not change any application code.

- **Designed for human review.** The code is laid out as clearly marked visual sections (section banners, short functions, scoped comments) so a reviewer can read it top to bottom in order. The structure is visible in the module's source.

## Behavior

HttpGateway is a **singleton module**. One `require()(Lib, config)` call injects dependencies, initializes the adapter and internal parts, and returns the module-scope `HttpGateway` object. Node.js `require` cache guarantees the same object is returned on every subsequent call.

```
HttpGateway (singleton)
 ├─ CONFIG.Adapter        (ready-to-use adapter object - set once by loader)
 ├─ parts/cookies.js      (serialize, parse, SameSite compatibility)
 ├─ parts/url-parts.js    (tldts wrapper for URL parsing)
 └─ parts/params.js       (typed request parameter extraction)
```

`CONFIG.Adapter` is the ready-to-use adapter object. Create it by calling the adapter package with its config, then pass the result to the gateway.

The loader validates configuration at construction time and throws on misconfiguration. Setup errors surface at startup, not on first request.

### Request lifecycle

1. Initialize the per-request instance: `Lib.Instance.initialize()`
2. Populate HTTP data: `Gateway.initHttpRequestData(instance, raw_request, raw_context, callback)`
3. Extract typed parameters: `Gateway.setArgsFromRequest(instance, params)`
4. Send response: `Gateway.returnHttpResponse(instance, status, headers, cookies, body)`

### Runtime adapters

Two runtime adapters are available, each a separate package.

| Adapter | Runtime |
|---------|---------|
| [`@superloomdev/js-server-helper-http-gateway-adapter-aws-apigateway`](../js-server-helper-http-gateway-adapter-aws-apigateway) | AWS Lambda + API Gateway HTTP API (payload v2.0) / Lambda Function URLs |
| [`@superloomdev/js-server-helper-http-gateway-adapter-express`](../js-server-helper-http-gateway-adapter-express) | Docker or Express |

A project installs only the adapter for its runtime.

### SameSite=None cookie compatibility

`returnHttpResponse` automatically manages the `SameSite=None` attribute when serializing the `cookies` descriptor. If a cookie's `options.sameSite` is `'none'`, it checks the request `User-Agent` header. Several browser families have known bugs that cause them to reject or mishandle cookies set with `SameSite=None`:

| Affected client | Bug |
|-----------------|-----|
| iOS 12 (all browsers) | Treats `SameSite=None` as `SameSite=Strict`. Cookie is blocked on cross-site requests |
| macOS 10.14 Safari and embedded browser | Same WebKit bug as iOS 12 |
| UC Browser below 12.13.2 | Drops the cookie entirely when `SameSite=None` is present |
| Chromium 51-66 | Drops any cookie with an unrecognized `SameSite` value |

For these clients, `returnHttpResponse` serializes the cookie without any `SameSite` attribute. Modern browsers (Chromium 67+, Safari 13+, Firefox 79+) receive `SameSite=None; Secure` as intended by RFC 6265bis.

Code that sets cookies directly via raw `Set-Cookie` headers, rather than `buildCookie` + `returnHttpResponse`, is responsible for this UA check itself.

### Multipart or form-data not supported

This module does **not** support `multipart/form-data` request bodies. Sending a multipart request results in an empty `instance.http_request.body`. The body is not parsed and no error is raised.

POST data uses `application/json` or `application/x-www-form-urlencoded`. Multipart support will be added in a future version via a dedicated adapter-level option. The current contract is intentionally scoped to text payloads.

## Aligned with Superloom Philosophy

This module follows Superloom conventions: the singleton loader pattern, `Lib` container injection, and the `[err, result]` return tuple for parameter extraction. A project built on Superloom conventions adopts this module without learning anything new.

## Extended Documentation

- [`docs/api.md`](docs/api.md). Full function reference with signatures and examples
- [`docs/configuration.md`](docs/configuration.md). Loader pattern, config keys, dependencies
- [`docs/schemas.md`](docs/schemas.md). The validated contracts: CONFIG, the adapter contract, and the return conventions
- [Superloom](https://superloom.dev). The framework

## Adding to Your Project

This module and the one runtime adapter it needs are declared as dependencies in the project's `package.json` and loaded through the standard Superloom loader. The published packages are the supported integration path; vendoring the source or using a local file dependency is not.

The adapter is configured and instantiated independently, then passed to the gateway loader as a ready-to-use `CONFIG.Adapter` object. The adapter list is in the [Runtime adapters](#runtime-adapters) section above, and the wiring is in [Configuration](docs/configuration.md). The loader pattern, including the full `Lib` container shape, is documented in [Server Loader Architecture](https://github.com/superloomdev/superloom/blob/main/docs/server/server-loader.md). One-time GitHub Packages registry setup is in the [npmrc setup guide](https://github.com/superloomdev/superloom/blob/main/docs/dev/npmrc-setup.md).

## Dependencies

This module bundles two runtime npm packages:

- **`cookie`** (jshttp). RFC 6265 cookie serialization and parsing. Used because cookie handling contains non-obvious security pitfalls (attribute injection, prototype pollution via hostile headers, malformed percent-encoding) that a purpose-built library handles reliably

- **`tldts`**. URL parsing via the Mozilla Public Suffix List. Used because the Public Suffix List has thousands of entries, changes monthly, and cannot be approximated by any programmatic rule

It expects three peer modules in the `Lib` container (Utils, Debug, Instance) and one optional peer adapter package for the runtime. For the full dependency breakdown, see [`docs/configuration.md`](docs/configuration.md).

## Testing Status

| Tier | Runtime | Status |
|------|---------|--------|
| Emulated | Node.js built-in test runner against in-process stub adapter | [![Test](https://github.com/superloomdev/superloom/actions/workflows/ci-helper-modules.yml/badge.svg?branch=main)](https://github.com/superloomdev/superloom/actions/workflows/ci-helper-modules.yml) |

The gateway's own tests use the in-process stub adapter which satisfies the three-method adapter contract with minimal fixed-output behavior. It is not a simulation of API Gateway or Express internals. It exists only to let the gateway module exercise its own logic without any real runtime.

**Integration tests for each runtime adapter live in the corresponding adapter package** and run as part of the same CI workflow:

| Adapter | Test approach | Test count |
|---|---|---|
| [`adapter-express`](../js-server-helper-http-gateway-adapter-express) | Real Express 5 server on a random free port, hit with native `fetch`. Real `express.json`, `express.urlencoded`, `cookie-parser` middleware exercised | 80 |
| [`adapter-aws-apigateway`](../js-server-helper-http-gateway-adapter-aws-apigateway) | 23 real API Gateway v2.0 event fixtures (6 copied verbatim from `aws/aws-lambda-go events/testdata`, 17 hand-written) piped through the full adapter->gateway pipeline | 93 |

## License

MIT
