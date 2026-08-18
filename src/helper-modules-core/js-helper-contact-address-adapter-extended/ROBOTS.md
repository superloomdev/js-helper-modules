# helper-contact-address-adapter-extended

Extended address adapter. Postal regex patterns. ISO 3166-2 subdivision lists.

## Type

Core module. Adapter (Class F). Factory pattern.

## Peer Dependencies

| Peer | Why |
|---|---|
| `helper-utils` | Type-checking primitives |

## Direct Dependencies

None. Data is generated at build time.

## Loader Pattern

```javascript
const Adapter = require('helper-contact-address-adapter-extended')(Lib, {});
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

## Documentation

- [`docs/api.md`](docs/api.md)
- [`docs/configuration.md`](docs/configuration.md)
