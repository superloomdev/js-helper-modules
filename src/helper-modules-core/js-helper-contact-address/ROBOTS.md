# helper-contact-address

Postal address validation and field policy management. Port module requiring a swappable adapter.

## Type

Core module. Port with required adapter. Factory pattern.

## Peer Dependencies

| Peer | Why |
|---|---|
| `helper-utils` | Type-checking primitives |

## Direct Dependencies

None.

## Loader Pattern

```javascript
const Adapter = require('helper-contact-address-adapter-basic')(Lib, {});
Lib.ContactAddress = require('helper-contact-address')(Lib, { Adapter });
```

## Adapter Contract (5 methods)

| Method | Signature | Returns |
|---|---|---|
| `listCountries` | `listCountries()` | `[String]` |
| `getPostalRule` | `getPostalRule(country_code)` | `{ min_length, max_length, pattern, required }\|null` |
| `listSubdivisions` | `listSubdivisions(country_code)` | `[{ code, name }]\|null` |
| `validatePostalCode` | `validatePostalCode(country_code, postal_code)` | `{ valid, reason }` |
| `validateSubdivision` | `validateSubdivision(country_code, subdivision_code)` | `{ valid, reason }` |

## Exported Functions (6 total)

| Function | Signature | Returns |
|---|---|---|
| `sanitizePostalCode` | `sanitizePostalCode(postal_code)` | `String` |
| `validateSyntax` | `validateSyntax(field_name, value, context)` | `{ success, error }` |
| `validateAddress` | `validateAddress(data)` | `{ success, errors, error }` |
| `createAddress` | `createAddress(data)` | `Object` |
| `listSubdivisions` | `listSubdivisions(country_code)` | `{ success, subdivisions, error }` |
| `getFieldPolicy` | `getFieldPolicy()` | `Object` |

## Adapters

| Adapter | Package | Depth |
|---|---|---|
| Basic | `helper-contact-address-adapter-basic` | Postal length bounds. No subdivisions. |
| Extended | `helper-contact-address-adapter-extended` | Postal regex + subdivision lists. |

## Documentation

- [`docs/api.md`](docs/api.md)
- [`docs/configuration.md`](docs/configuration.md)
- [`docs/schemas.md`](docs/schemas.md)
- [`docs/data-model.md`](docs/data-model.md)
