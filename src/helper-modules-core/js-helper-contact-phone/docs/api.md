# API Reference - helper-contact-phone

## Overview

Phone number validation, formatting, and ID management. This is a port module that requires a swappable adapter for country data and validation depth.

The core owns no country data. The adapter provides country metadata, syntax validation, and number type classification.

## Loader

```javascript
const Adapter = require('helper-contact-phone-adapter-basic')(Lib, {});
Lib.ContactPhone = require('helper-contact-phone')(Lib, { Adapter });
```

## Exported Functions (13 total)

All functions are synchronous and client-side safe.

### Sanitization

| Function | Signature | Returns |
|---|---|---|
| `sanitizeNumber` | `sanitizeNumber(national_number)` | `String` - digits only |
| `sanitizeFullNumber` | `sanitizeFullNumber(phone)` | `String` - cleaned string preserving leading `+` |

### Predicates

| Function | Signature | Returns |
|---|---|---|
| `isKnownCountry` | `isKnownCountry(country_code)` | `Boolean` - true if adapter has metadata |

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
| `formatE164` | `formatE164(country_code, national_number)` | `String\|null` - E.164 string |
| `formatFullNumber` | `formatFullNumber(country_code, national_number)` | `String\|null` - alias for `formatE164` |

### Parsing

| Function | Signature | Returns |
|---|---|---|
| `parseE164` | `parseE164(e164_number)` | `{ country_code, national_number }\|null` |
| `parseFullNumber` | `parseFullNumber(full_number)` | `{ country_code, national_number }\|null` - alias for `parseE164` |

### Phone ID

| Function | Signature | Returns |
|---|---|---|
| `createPhoneId` | `createPhoneId(country_code, national_number)` | `String\|null` - phone ID |
| `parsePhoneId` | `parsePhoneId(phone_id)` | `{ country_code, national_number }\|null` |

## Country Code Standard

All country codes are ISO 3166-1 alpha-2, lowercase. Examples: `us`, `in`, `gb`, `de`, `jp`.

## Terminology

- **Country code** = ISO 3166-1 alpha-2, lowercase (e.g. `us`, `in`). Identifies a country.
- **Calling code** = E.164 international dialing prefix (e.g. `1`, `91`, `44`). What you dial to reach that country.

## Phone ID Encoding

Format: `country_code + '.' + reversed(national_number)`

Example: `createPhoneId('in', '9876543210')` returns `'in.0123456789'`.

The country code is at the start so `begins_with("in.")` finds all India numbers in prefix-based database queries. The reversal distributes sequentially-issued numbers across a partitioned key space.

This is a storage convention, not a display format. Never show phone IDs to users.

## Developer-Friendly Aliases

`formatFullNumber` and `parseFullNumber` are aliases for `formatE164` and `parseE164` respectively. They exist so developers who do not know E.164 by heart can use a self-documenting name. Both names are fully supported and documented.

## Number Types

`getNumberType` returns one of these strings (extended adapter only; basic always returns `null`):

- `MOBILE`
- `FIXED_LINE`
- `FIXED_LINE_OR_MOBILE`
- `TOLL_FREE`
- `PREMIUM_RATE`
- `SHARED_COST`
- `VOIP`
- `PERSONAL_NUMBER`
- `PAGER`
- `UAN`
- `VOICEMAIL`

## Error Codes

| Type | Message | Emitted by |
|---|---|---|
| `CONTACT_PHONE_UNKNOWN_COUNTRY` | Country code is not recognized | core, both adapters |
| `CONTACT_PHONE_NOT_A_NUMBER` | Input does not contain a valid phone number | both adapters |
| `CONTACT_PHONE_TOO_SHORT` | Phone number is too short for this country | both adapters |
| `CONTACT_PHONE_TOO_LONG` | Phone number is too long for this country | both adapters |
| `CONTACT_PHONE_INVALID_LENGTH` | Phone number length does not match any valid length for this country | both adapters |
| `CONTACT_PHONE_INVALID_PATTERN` | Phone number digits do not match the national number pattern | extended only |
