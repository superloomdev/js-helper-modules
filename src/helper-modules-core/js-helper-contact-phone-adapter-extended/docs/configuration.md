# Configuration - helper-contact-phone-adapter-extended

## Loader Pattern

```javascript
const Adapter = require('helper-contact-phone-adapter-extended')(Lib, {});
Lib.ContactPhone = require('helper-contact-phone')(Lib, { Adapter });
```

## Peer Dependencies

| Peer | Why |
|---|---|
| `helper-utils` | Type-checking primitives |

## Direct Dependencies

| Dependency | Why | Bundle Size |
|---|---|---|
| `libphonenumber-js` | Phone number parsing, pattern validation, number type classification | ~145 KB (max metadata) |

## Config Keys

| Key | Type | Default | Description |
|---|---|---|---|
| `METADATA_VARIANT` | `String` | `'max'` | libphonenumber-js metadata variant. `'max'` includes all patterns and types. |

## Testing Tiers

| Tier | Runtime | Status |
|---|---|---|
| Unit | Node.js `node --test` | CI on every push |

No Docker, no external service required.
