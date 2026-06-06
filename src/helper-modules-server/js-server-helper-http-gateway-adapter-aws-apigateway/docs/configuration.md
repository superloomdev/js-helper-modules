# Configuration

Configuration reference for `@superloomdev/js-server-helper-http-gateway-adapter-aws-apigateway`.

**Related docs:**
- [`api.md`](api.md) for the 3-method adapter contract
- [`payload-format.md`](payload-format.md) for the v2.0 event schema and v1.0 boundary
- [`../../js-server-helper-http-gateway/docs/configuration.md`](../../js-server-helper-http-gateway/docs/configuration.md) for the gateway loader and `CONFIG.Adapter` slot

---

## Loader Pattern

Instantiate the adapter by calling it, then pass the ready-to-use object as `CONFIG.Adapter` to the gateway loader:

```javascript
const AwsAdapter = require('@superloomdev/js-server-helper-http-gateway-adapter-aws-apigateway')({});

const Gateway = require('@superloomdev/js-server-helper-http-gateway')(Lib, {
  Adapter: AwsAdapter
});
```

Call the adapter loader first (it builds its own Lib and ERRORS internally). Pass the resulting ready-to-use adapter object — not the `require()` result directly — to the gateway.

---

## Configuration Keys

The AWS adapter accepts **no configuration**. Pass an empty object `{}` or `null`/`undefined`:

```javascript
const AwsAdapter = require('@superloomdev/js-server-helper-http-gateway-adapter-aws-apigateway')({});
```

| Config key | Required | Description |
|---|---|---|
| *(none)* | — | This adapter requires no configuration |

---

## Runtime Dependencies

The adapter installs **zero npm packages**. It uses only Node.js built-ins (`Buffer`, `URLSearchParams`). **No AWS SDK is required** — the adapter reads from the Lambda event object directly and writes through the Lambda callback.

This keeps the deployment artifact small. A typical Lambda function bundle that uses the gateway + this adapter + your application code is well under the 250 MB unzipped Lambda layer limit even without a layer.

---

## Lambda Handler Pattern

```javascript
const AwsAdapter = require('@superloomdev/js-server-helper-http-gateway-adapter-aws-apigateway')({});

// Build the gateway once at module scope so it survives across warm invocations:
const Gateway = require('@superloomdev/js-server-helper-http-gateway')(Lib, { Adapter: AwsAdapter });

exports.handler = function (event, context, callback) {
  const instance = Lib.Instance.initialize();
  Gateway.initHttpRequestData(instance, event, context, callback);

  // ... application logic, including Gateway.setArgsFromRequest, etc. ...

  Gateway.returnHttpResponse(instance, 200, null, { ok: true });
};
```

The gateway is stateless across requests but its construction cost (and the adapter's) is non-trivial. Building it at module scope means each warm Lambda invocation reuses the same gateway instance — the adapter creates no per-request state outside of `instance`.

---

## Supported Runtimes

| Runtime | Supported |
|---|---|
| AWS Lambda with API Gateway **HTTP API** (v2.0 integration) | ✅ Yes |
| AWS Lambda with **Function URL** | ✅ Yes (same v2.0 payload) |
| AWS Lambda with API Gateway **REST API** (v1.0 integration) | ❌ No — use a different adapter |
| AWS Lambda with **ALB target group** | ❌ No — different event shape (separate adapter needed) |

See [`payload-format.md`](payload-format.md) for the supported v2.0 schema and the graceful-degradation behavior for v1.0 events.

---

## Country Code

`getCountryCode` reads `headers['cloudfront-viewer-country']` from the normalized request headers map. To enable it, configure CloudFront in front of API Gateway and forward the `CloudFront-Viewer-Country` header. No adapter configuration is required.
