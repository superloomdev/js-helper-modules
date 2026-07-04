# Configuration

Configuration reference for `@superloomdev/js-server-helper-http-gateway-adapter-aws-apigateway`.

**Related docs:**
- [`api.md`](api.md) for the 3-method adapter contract
- [`payload-format.md`](payload-format.md) for the v2.0 event schema and v1.0 boundary
- [`../../js-server-helper-http-gateway/docs/configuration.md`](../../js-server-helper-http-gateway/docs/configuration.md) for the gateway loader and `CONFIG.Adapter` slot

---

## Loader Pattern

Instantiate the adapter by calling it with the shared `Lib` container and an optional config object, then pass the ready-to-use object as `CONFIG.Adapter` to the gateway loader:

```javascript
const AwsAdapter = require('@superloomdev/js-server-helper-http-gateway-adapter-aws-apigateway')(Lib, {});

const Gateway = require('@superloomdev/js-server-helper-http-gateway')(Lib, {
  Adapter: AwsAdapter
});
```

The adapter receives `Lib` by reference from the injected container (same shape as every other helper module). It merges config over companion file defaults and returns a ready-to-use adapter object - not the `require()` result directly - to the gateway.

---

## Configuration Keys

The AWS adapter accepts no configuration keys. Pass an empty object `{}` for defaults:

```javascript
const AwsAdapter = require('@superloomdev/js-server-helper-http-gateway-adapter-aws-apigateway')(Lib, {});
```

---

## Runtime Dependencies

The adapter receives `Utils` and `Debug` from the shared `Lib` container (injected by the application). No AWS SDK is required - the adapter reads from the Lambda event object directly and writes through the Lambda callback. No third-party npm packages are installed.

---

## Lambda Handler Pattern

```javascript
const AwsAdapter = require('@superloomdev/js-server-helper-http-gateway-adapter-aws-apigateway')(Lib, {});

// Build the gateway once at module scope so it survives across warm invocations:
const Gateway = require('@superloomdev/js-server-helper-http-gateway')(Lib, { Adapter: AwsAdapter });

exports.handler = function (event, context, callback) {
  const instance = Lib.Instance.initialize();
  Gateway.initHttpRequestData(instance, event, context, callback);

  // ... application logic, including Gateway.setArgsFromRequest, etc. ...

  Gateway.returnHttpResponse(instance, 200, null, { ok: true });
};
```

The gateway is stateless across requests but its construction cost (and the adapter's) is non-trivial. Building it at module scope means each warm Lambda invocation reuses the same gateway instance - the adapter creates no per-request state outside of `instance`.

---

## Supported Runtimes

| Runtime | Supported |
|---|---|
| AWS Lambda with API Gateway **HTTP API** (v2.0 integration) | ✅ Yes |
| AWS Lambda with **Function URL** | ✅ Yes (same v2.0 payload) |
| AWS Lambda with API Gateway **REST API** (v1.0 integration) | No - use a different adapter |
| AWS Lambda with **ALB target group** | No - different event shape (separate adapter needed) |

See [`payload-format.md`](payload-format.md) for the supported v2.0 schema and the graceful-degradation behavior for v1.0 events.

---

## Country Code

`getCountryCode` reads `headers['cloudfront-viewer-country']` from the normalized request headers map. To enable it, configure CloudFront in front of API Gateway and forward the `CloudFront-Viewer-Country` header. No adapter configuration is required.
