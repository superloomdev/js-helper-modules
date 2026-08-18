# helper-contact-phone

Phone number validation, formatting, and ID management. Port module requiring a swappable adapter for country data and validation depth.

## Type

Core module. Port with required adapter. Factory pattern.

## Peer Dependencies

| Peer | Why |
|---|---|
| `helper-utils` | Used by all public functions for type-checking primitives |

## Direct Dependencies

None. The core owns no country data.

## Loader Pattern (Factory)

```javascript
const Adapter = require('helper-contact-phone-adapter-basic')(Lib, {});
Lib.ContactPhone = require('helper-contact-phone')(Lib, { Adapter });
```

Each loader call returns an independent `ContactPhone` interface with its own merged configuration and adapter. The adapter is required and validated at construction time.

## Config Keys

| Key | Type | Default | Description |
|---|---|---|---|
| `PHONE_ID_SEPARATOR` | `String` | `'.'` | Separator in phone IDs |
| `PHONE_SANITIZE_REGEX` | `RegExp` | `/[^0-9+\-\s()]/g` | Characters stripped from full phone input |
| `NATIONAL_SANITIZE_REGEX` | `RegExp` | `/[^0-9]/g` | Characters stripped from national number input |
| `E164_MAX_LENGTH` | `Number` | `15` | Max digits in E.164 number |
| `NATIONAL_MIN_LENGTH` | `Number` | `3` | Min national number length |
| `NATIONAL_MAX_LENGTH` | `Number` | `14` | Max national number length |

## Adapter Contract (4 methods)

| Method | Signature | Returns |
|---|---|---|
| `listCountries` | `listCountries()` | `[String]` |
| `getMetadata` | `getMetadata(country_code)` | `{ calling_code, min_length, max_length }\|null` |
| `validateSyntax` | `validateSyntax(country_code, national_number)` | `{ valid, reason }` |
| `getNumberType` | `getNumberType(country_code, national_number)` | `String\|null` |

## Exported Functions (13 total)

All functions are synchronous and client-side safe.

### Sanitization

| Function | Signature | Returns |
|---|---|---|
| `sanitizeNumber` | `sanitizeNumber(national_number)` | `String` - digits only |
| `sanitizeFullNumber` | `sanitizeFullNumber(phone)` | `String` - cleaned, preserving leading `+` |

### Predicates

| Function | Signature | Returns |
|---|---|---|
| `isKnownCountry` | `isKnownCountry(country_code)` | `Boolean` |

### Lookup

| Function | Signature | Returns |
|---|---|---|
| `listCountries` | `listCountries()` | `{ success, countries, error }` |
| `getCountryMetadata` | `getCountryMetadata(country_code)` | `{ success, metadata, error }` |

### Validation

| Function | Signature | Returns |
|---|---|---|
| `validateSyntax` | `validateSyntax(country_code, national_number)` | `{ success, error }` |

### Number Type

| Function | Signature | Returns |
|---|---|---|
| `getNumberType` | `getNumberType(country_code, national_number)` | `{ success, type, error }` |

### Formatting

| Function | Signature | Returns |
|---|---|---|
| `formatE164` | `formatE164(country_code, national_number)` | `String\|null` |
| `formatFullNumber` | `formatFullNumber(country_code, national_number)` | `String\|null` - alias for `formatE164` |

### Parsing

| Function | Signature | Returns |
|---|---|---|
| `parseE164` | `parseE164(e164_number)` | `{ country_code, national_number }\|null` |
| `parseFullNumber` | `parseFullNumber(full_number)` | `{ country_code, national_number }\|null` - alias for `parseE164` |

### Phone ID

| Function | Signature | Returns |
|---|---|---|
| `createPhoneId` | `createPhoneId(country_code, national_number)` | `String\|null` |
| `parsePhoneId` | `parsePhoneId(phone_id)` | `{ country_code, national_number }\|null` |

## Adapters

| Adapter | Package | Depth |
|---|---|---|
| Basic | `helper-contact-phone-adapter-basic` | Length + charset. No pattern. No type. |
| Extended | `helper-contact-phone-adapter-extended` | Length + charset + pattern + type. Wraps `libphonenumber-js`. |

## Documentation

- [`docs/api.md`](docs/api.md) - complete function reference
- [`docs/configuration.md`](docs/configuration.md) - loader pattern, dependencies, adapter contract
- [`docs/schemas.md`](docs/schemas.md) - return conventions, adapter contract schema, error catalog
- [`docs/data-model.md`](docs/data-model.md) - country codes, calling codes, phone ID encoding
