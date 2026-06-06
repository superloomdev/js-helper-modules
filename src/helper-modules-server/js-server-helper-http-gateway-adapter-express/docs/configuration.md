# Configuration

Configuration reference for `@superloomdev/js-server-helper-http-gateway-adapter-express`.

**Related docs:**
- [`api.md`](api.md) for the 3-method adapter contract
- [`middleware.md`](middleware.md) for required Express middleware setup
- [`../../js-server-helper-http-gateway/docs/configuration.md`](../../js-server-helper-http-gateway/docs/configuration.md) for the gateway loader and `CONFIG.Adapter` slot

---

## Loader Pattern

Instantiate the adapter by calling it, then pass the ready-to-use object as `CONFIG.Adapter` to the gateway loader:

```javascript
const ExpressAdapter = require('@superloomdev/js-server-helper-http-gateway-adapter-express')({});

const Gateway = require('@superloomdev/js-server-helper-http-gateway')(Lib, {
  Adapter: ExpressAdapter
});
```

Call the adapter loader first (it builds its own Lib and ERRORS internally). Pass the resulting ready-to-use adapter object — not the `require()` result directly — to the gateway.

---

## Configuration Keys

The Express adapter accepts **no configuration**. Pass an empty object `{}` or `null`/`undefined`:

```javascript
const ExpressAdapter = require('@superloomdev/js-server-helper-http-gateway-adapter-express')({});
```

| Config key | Required | Description |
|---|---|---|
| *(none)* | — | This adapter requires no configuration |

---

## Runtime Dependencies

The adapter installs **zero npm packages**. It uses only Node.js built-ins and reads from objects the application provides.

The application is expected to install and wire:

| Package | Purpose | Required? |
|---|---|---|
| `express@>=5` | The HTTP server | Yes |
| `express.json()` middleware | Parses JSON bodies into `req.body` | Yes if you accept JSON |
| `express.urlencoded({ extended: true })` | Parses urlencoded bodies | Yes if you accept form data |
| `cookie-parser@>=1` | Populates `req.cookies` | Optional — adapter falls back to raw `Cookie` header |

See [`middleware.md`](middleware.md) for the full setup pattern.

---

## Country Code Customization

To enable country detection when fronting Express with a CDN (e.g. CloudFront), instantiate the base adapter and extend it:

```javascript
const base = require('@superloomdev/js-server-helper-http-gateway-adapter-express')({});

const CustomAdapter = Object.assign({}, base, {
  getCountryCode: function (headers) {
    return (headers && headers['cloudfront-viewer-country']) || null;
  }
});

const Gateway = require('@superloomdev/js-server-helper-http-gateway')(Lib, { Adapter: CustomAdapter });
```

The other two contract methods inherit from the base adapter unchanged.
