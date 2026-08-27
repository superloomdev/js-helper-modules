# helper-contact-email

Email address validation, sanitization, canonicalization, and disposable domain checking. Port module requiring a swappable adapter.

## Type

Core module. Port with required adapter. Factory pattern.

## Peer Dependencies

| Peer | Why |
|---|---|
| `helper-utils` | Type-checking primitives |

## Direct Dependencies

None.

## Loader Pattern (Factory)

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
| `isDisposableDomain` | `isDisposableDomain(domain)` | `Boolean` |
| `canonicalize` | `canonicalize(email)` | `String\|null` |

## Exported Functions (7 total)

| Function | Signature | Returns |
|---|---|---|
| `sanitizeEmail` | `sanitizeEmail(email)` | `String` |
| `getDomainPart` | `getDomainPart(email)` | `String\|null` |
| `getLocalPart` | `getLocalPart(email)` | `String\|null` |
| `validateSyntax` | `validateSyntax(email)` | `{ success, error }` |
| `validateDisposable` | `validateDisposable(email)` | `{ success, error }` |
| `isDisposableDomain` | `isDisposableDomain(domain)` | `Boolean` |
| `canonicalize` | `canonicalize(email)` | `String\|null` |

## Adapters

| Adapter | Package | Depth |
|---|---|---|
| Basic | `helper-contact-email-adapter-basic` | Own regex. No disposable. Gmail canonicalize. |
| Extended | `helper-contact-email-adapter-extended` | validator.isEmail(). ~5K disposable domains. All-provider canonicalize. |

## Documentation

- [`docs/api.md`](docs/api.md) - complete function reference
- [`docs/configuration.md`](docs/configuration.md) - loader, dependencies, adapter contract
- [`docs/schemas.md`](docs/schemas.md) - return conventions, adapter contract schema
- [`docs/data-model.md`](docs/data-model.md) - email structure, canonicalization, disposable domains
