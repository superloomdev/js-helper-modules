# Schemas. `helper-http-gateway`

The validated contracts at the module boundary: what the loader requires, what a runtime adapter must implement, and how results come back. The contracts are enforced in `http-gateway.validators.js`. For the per-function reference, including the `setArgsFromRequest` param-descriptor schema, see [API Reference](api.md). For configuration keys see [Configuration](configuration.md).

## On This Page

- [Throw Versus Return](#throw-versus-return)
- [CONFIG Schema](#config-schema)
- [Adapter Contract](#adapter-contract)
- [Return Conventions](#return-conventions)

---

## Throw Versus Return

The gateway is a transport utility, not a data feature, so it has no operational `{ success, error }` envelope. Failures fall into two kinds, and the kind decides the mechanism.

| Category | Trigger | Mechanism | When |
|---|---|---|---|
| **Setup error** | A missing or non-object `CONFIG.Adapter`, or an adapter missing a contract method | Throws `Error` | At construction (loader time) |
| **Validation outcome** | A required request parameter absent, or a `validate_func` / `invalidate_func` rejection inside `setArgsFromRequest` | Returns `[null, false]`, or `[err, false]` for an `invalidate_func` failure | At the call site, synchronously |

Setup errors fail loudly at boot, so a misconfigured gateway never serves a request. On the request path there is no thrown error: `setArgsFromRequest` signals a bad request through its tuple, and the accessors return an empty string or `null` when the underlying data is absent.

---

## CONFIG Schema

The merged `CONFIG` object passed to the loader. Validated once, at construction, by `validateConfig`. A violation throws an `Error` before the singleton is built.

| Field | Type | Required | Constraint |
|---|---|---|---|
| `Adapter` | `object` | Yes | A ready-to-use adapter object, the result of calling an adapter package with its config. Not a factory and not a string. A missing or non-object value throws. The adapter's method contract is checked separately (see [Adapter Contract](#adapter-contract)) |

`Adapter` is the only configuration key. The gateway holds no other tunables; everything else is per-request behavior driven by the `instance` and the call arguments.

---

## Adapter Contract

The shape `CONFIG.Adapter` must satisfy. Validated at construction by `validateAdapterContract`; a missing method throws an `Error` at boot, so a partially implemented adapter can never reach a live request. The gateway calls these methods; application code never does.

| Method | Purpose |
|---|---|
| `extractRequest(raw_request, raw_context, response_callback)` | Normalize raw runtime input into the gateway request shape and return a runtime response handler |
| `buildResponseEnvelope(status, headers, body)` | Build the runtime-specific response object (an API Gateway response payload, an Express `res` write, ...) |
| `getCountryCode(headers)` | Return the viewer country code when the runtime can supply it (for example, a CDN edge header), or `null` |

All three are hard-checked at construction. The two shipped adapters (`helper-http-gateway-adapter-aws-apigateway`, `helper-http-gateway-adapter-express`) implement all three; the distinction matters only for a custom adapter.

---

## Return Conventions

The gateway does not use a single `{ success, error }` envelope. Returns vary by the role of the function, and there is no thrown error on the request path.

| Function group | Return | Failure signal |
|---|---|---|
| `setArgsFromRequest` | `[err, result]` tuple | `[null, false]` on a missing required param or a `validate_func` failure; `[err, false]` when an `invalidate_func` returns truthy |
| Responders (`returnHttpResponse`, `returnHttpStatus`, `returnHttpRedirect`, `returnHttpRedirect404`) | `Boolean` (always `true`) | None. The response has already been handed to the runtime |
| Accessors (`getBearerToken`, `getRequestIPAddress`, `getRequestUserAgent`, `getRequestOrigin`, `getRequestCountryCode`) | `String`, or `null` / empty string | Absent data returns `null` or `''`, never an error |
| Predicates (`isHttpInstance`, `isPreflightRequest`) | `Boolean` | Not applicable |

The full per-function parameter list and the `setArgsFromRequest` param-descriptor schema (the `in`, `name`, `required`, `is_number`, `validate_func`, and related fields) are in the [API Reference](api.md).
