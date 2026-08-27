# helper-contact-phone-adapter-basic

Lean phone adapter for `helper-contact-phone`. Country calling codes and length bounds. No pattern validation, no number type.

## Type

Core module. Adapter (Class F). Factory pattern.

## Peer Dependencies

| Peer | Why |
|---|---|
| `helper-utils` | Type-checking primitives |

## Direct Dependencies

None. Country data is generated at build time and committed. No runtime third-party dependencies.

## Loader Pattern (Factory)

```javascript
import contactPhoneAdapterBasic from 'helper-contact-phone-adapter-basic';
import contactPhone from 'helper-contact-phone';

const Adapter = contactPhoneAdapterBasic(Lib, {});
Lib.ContactPhone = contactPhone(Lib, { Adapter });
```

## Adapter Contract (4 methods)

| Method | Signature | Returns |
|---|---|---|
| `listCountries` | `listCountries()` | `[String]` - 245 country codes |
| `getMetadata` | `getMetadata(country_code)` | `{ calling_code, min_length, max_length }\|null` |
| `validateSyntax` | `validateSyntax(country_code, national_number)` | `{ valid, reason }` |
| `getNumberType` | `getNumberType(country_code, national_number)` | `null` (always) |

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

Never emits: `CONTACT_PHONE_INVALID_LENGTH`, `CONTACT_PHONE_INVALID_PATTERN`

## Data Source

Generated from `libphonenumber-js` min metadata (Google PhoneNumberMetadata.xml). 245 countries. ~20 KB. Re-run: `npm run generate`.

## Documentation

- [`docs/api.md`](docs/api.md) - adapter contract methods
- [`docs/configuration.md`](docs/configuration.md) - loader pattern, data source, testing
