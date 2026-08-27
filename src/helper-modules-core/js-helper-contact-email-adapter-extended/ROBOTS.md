# helper-contact-email-adapter-extended

Extended email adapter. validator.isEmail(), disposable domain list, all-provider canonicalize.

## Type

Core module. Adapter (Class F). Factory pattern.

## Peer Dependencies

| Peer | Why |
|---|---|
| `helper-utils` | Type-checking primitives |

## Direct Dependencies

| Dependency | Why |
|---|---|
| `validator` | isEmail(), normalizeEmail() |

## Loader Pattern

```javascript
import contactEmailAdapterExtended from 'helper-contact-email-adapter-extended';
import contactEmail from 'helper-contact-email';

const Adapter = contactEmailAdapterExtended(Lib, {});
Lib.ContactEmail = contactEmail(Lib, { Adapter });
```

## Adapter Contract (3 methods)

| Method | Signature | Returns |
|---|---|---|
| `validateSyntax` | `validateSyntax(email)` | `{ valid, reason }` |
| `isDisposableDomain` | `isDisposableDomain(domain)` | `Boolean` |
| `canonicalize` | `canonicalize(email)` | `String\|null` |

## Reason Codes

All basic codes plus: `CONTACT_EMAIL_DISPOSABLE`

## Documentation

- [`docs/api.md`](docs/api.md)
- [`docs/configuration.md`](docs/configuration.md)
