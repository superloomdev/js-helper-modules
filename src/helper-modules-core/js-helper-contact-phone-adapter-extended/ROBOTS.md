# helper-contact-phone-adapter-extended

Extended phone adapter for `helper-contact-phone`. Wraps `libphonenumber-js` with max metadata. Pattern validation, number type classification.

## Type

Core module. Adapter (Class F). Factory pattern.

## Peer Dependencies

| Peer | Why |
|---|---|
| `helper-utils` | Type-checking primitives |

## Direct Dependencies

| Dependency | Why |
|---|---|
| `libphonenumber-js` | Phone number parsing, pattern validation, number type classification. Max metadata (~145 KB). |

## Loader Pattern (Factory)

```javascript
const Adapter = require('helper-contact-phone-adapter-extended')(Lib, {});
Lib.ContactPhone = require('helper-contact-phone')(Lib, { Adapter });
```

## Adapter Contract (4 methods)

| Method | Signature | Returns |
|---|---|---|
| `listCountries` | `listCountries()` | `[String]` - 245 country codes |
| `getMetadata` | `getMetadata(country_code)` | `{ calling_code, min_length, max_length }\|null` |
| `validateSyntax` | `validateSyntax(country_code, national_number)` | `{ valid, reason }` |
| `getNumberType` | `getNumberType(country_code, national_number)` | `String\|null` |

## Validation Depth

| Check | Basic | Extended |
|---|---|---|
| Country known | Yes | Yes |
| Digits only | Yes | Yes |
| Min/max length | Yes | Yes |
| Digit pattern | No | Yes |
| Number type | No | Yes |

## Reason Codes Emitted

- `CONTACT_PHONE_UNKNOWN_COUNTRY`
- `CONTACT_PHONE_NOT_A_NUMBER`
- `CONTACT_PHONE_TOO_SHORT`
- `CONTACT_PHONE_TOO_LONG`
- `CONTACT_PHONE_INVALID_PATTERN` (extended only)

## Number Types

`getNumberType` returns one of: `MOBILE`, `FIXED_LINE`, `FIXED_LINE_OR_MOBILE`, `TOLL_FREE`, `PREMIUM_RATE`, `SHARED_COST`, `VOIP`, `PERSONAL_NUMBER`, `PAGER`, `UAN`, `VOICEMAIL`. Returns `null` if the type cannot be determined.

## Documentation

- [`docs/api.md`](docs/api.md) - adapter contract methods
- [`docs/configuration.md`](docs/configuration.md) - loader pattern, dependencies, testing
