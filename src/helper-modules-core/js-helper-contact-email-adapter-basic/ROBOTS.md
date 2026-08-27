# helper-contact-email-adapter-basic

Basic email adapter for `helper-contact-email`. Own regex. No disposable data. Gmail-only canonicalize.

## Type

Core module. Adapter (Class F). Factory pattern.

## Peer Dependencies

| Peer | Why |
|---|---|
| `helper-utils` | Type-checking primitives |

## Direct Dependencies

None.

## Loader Pattern

```javascript
import contactEmailAdapterBasic from 'helper-contact-email-adapter-basic';
import contactEmail from 'helper-contact-email';

const Adapter = contactEmailAdapterBasic(Lib, {});
Lib.ContactEmail = contactEmail(Lib, { Adapter });
```

## Adapter Contract (3 methods)

| Method | Signature | Returns |
|---|---|---|
| `validateSyntax` | `validateSyntax(email)` | `{ valid, reason }` |
| `isDisposableDomain` | `isDisposableDomain(domain)` | `Boolean` (always false) |
| `canonicalize` | `canonicalize(email)` | `String\|null` |

## Reason Codes Emitted

- `CONTACT_EMAIL_EMPTY`
- `CONTACT_EMAIL_NO_AT`
- `CONTACT_EMAIL_MULTIPLE_AT`
- `CONTACT_EMAIL_EMPTY_LOCAL`
- `CONTACT_EMAIL_EMPTY_DOMAIN`
- `CONTACT_EMAIL_INVALID_SYNTAX`

Never emits: `CONTACT_EMAIL_DISPOSABLE`

## Documentation

- [`docs/api.md`](docs/api.md) - adapter contract methods
- [`docs/configuration.md`](docs/configuration.md) - loader, dependencies
