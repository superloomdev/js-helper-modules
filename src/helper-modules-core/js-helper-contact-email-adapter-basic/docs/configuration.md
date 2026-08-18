# Configuration - helper-contact-email-adapter-basic

## Loader Pattern

```javascript
const Adapter = require('helper-contact-email-adapter-basic')(Lib, {});
Lib.ContactEmail = require('helper-contact-email')(Lib, { Adapter });
```

## Peer Dependencies

| Peer | Why |
|---|---|
| `helper-utils` | Type-checking primitives |

## Direct Dependencies

None.

## Config Keys

| Key | Type | Default | Description |
|---|---|---|---|
| `EMAIL_REGEX` | `RegExp` | `/^[a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/` | Email syntax validation regex |

## Testing Tiers

| Tier | Runtime | Status |
|---|---|---|
| Unit | Node.js `node --test` | CI on every push |
