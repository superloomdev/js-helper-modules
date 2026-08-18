# Configuration - helper-contact-email

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

None. The core owns no email data and has no runtime third-party dependencies.

## Config Keys

| Key | Type | Default | Description |
|---|---|---|---|
| `EMAIL_SANITIZE_REGEX` | `RegExp` | `/[^a-zA-Z0-9@.+_-]/g` | Characters stripped from sanitized input |
| `EMAIL_MAX_LENGTH` | `Number` | `254` | Max email length (RFC 5321) |
| `LOCAL_MAX_LENGTH` | `Number` | `64` | Max local part length (RFC 5321) |
| `DOMAIN_MAX_LENGTH` | `Number` | `255` | Max domain part length (RFC 5321) |

## Adapter Contract

| Method | Signature | Returns |
|---|---|---|
| `validateSyntax` | `validateSyntax(email)` | `{ valid, reason }` |
| `isDisposableDomain` | `isDisposableDomain(domain)` | `Boolean` |
| `canonicalize` | `canonicalize(email)` | `String\|null` |

## Available Adapters

| Adapter | Package | Validation Depth |
|---|---|---|
| Basic | `helper-contact-email-adapter-basic` | Own regex. No disposable data. Gmail-only canonicalize. |
| Extended | `helper-contact-email-adapter-extended` | `validator.isEmail()`. Disposable domain list (~5K). All-provider canonicalize. |

## Testing Tiers

| Tier | Runtime | Status |
|---|---|---|
| Unit | Node.js `node --test` | CI on every push |
