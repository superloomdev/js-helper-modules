# Configuration - helper-contact-phone

## Loader Pattern

```javascript
import contactPhoneAdapterBasic from 'helper-contact-phone-adapter-basic';
import contactPhone from 'helper-contact-phone';

const Adapter = contactPhoneAdapterBasic(Lib, {});
Lib.ContactPhone = contactPhone(Lib, {
  Adapter: Adapter
});
```

Each loader call returns an independent `ContactPhone` interface with its own merged configuration captured in a closure. Functions are pure - no shared module-level state between instances.

## Peer Dependencies

| Peer | Why |
|---|---|
| `helper-utils` | Used for type-checking primitives (`isString`, `isObject`, `isFunction`, `isNullOrUndefined`) |

## Direct Dependencies

None. The core owns no country data and has no runtime third-party dependencies.

## Config Keys

| Key | Type | Default | Description |
|---|---|---|---|
| `PHONE_ID_SEPARATOR` | `String` | `'.'` | Separator between country code and reversed national number in phone IDs |
| `PHONE_SANITIZE_REGEX` | `RegExp` | `/[^0-9+\-\s()]/g` | Characters stripped from full phone number input |
| `NATIONAL_SANITIZE_REGEX` | `RegExp` | `/[^0-9]/g` | Characters stripped from national number input |
| `E164_MAX_LENGTH` | `Number` | `15` | Maximum digit count in an E.164 number (per ITU-T recommendation) |
| `NATIONAL_MIN_LENGTH` | `Number` | `3` | Minimum length for a national number |
| `NATIONAL_MAX_LENGTH` | `Number` | `14` | Maximum length for a national number |

## Adapter Contract

The adapter is required. The core validates the adapter contract at construction time and throws if any method is missing.

| Method | Signature | Returns |
|---|---|---|
| `listCountries` | `listCountries()` | `[String]` - array of ISO 3166-1 alpha-2 country codes |
| `getMetadata` | `getMetadata(country_code)` | `{ calling_code, min_length, max_length }\|null` |
| `validateSyntax` | `validateSyntax(country_code, national_number)` | `{ valid, reason }` where reason is a stable error type string |
| `getNumberType` | `getNumberType(country_code, national_number)` | `String\|null` - number type or null if unknown |

## Available Adapters

| Adapter | Package | Validation Depth |
|---|---|---|
| Basic | `helper-contact-phone-adapter-basic` | Length + charset. No pattern. No number type. |
| Extended | `helper-contact-phone-adapter-extended` | Length + charset + digit pattern + number type. Wraps `libphonenumber-js`. |

Both adapters expose the same 4-method contract. Swapping an adapter changes validation depth, never call sites.

## Testing Tiers

| Tier | Runtime | Status |
|---|---|---|
| Unit | Node.js `node --test` | CI on every push |

No Docker, no external service required. Tests use a stub adapter that implements the 4-method contract.
