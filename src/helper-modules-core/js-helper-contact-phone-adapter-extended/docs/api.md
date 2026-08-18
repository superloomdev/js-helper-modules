# API Reference - helper-contact-phone-adapter-extended

## Overview

The extended phone adapter implements the 4-method contract defined by `helper-contact-phone`. It wraps `libphonenumber-js` with max metadata for full validation depth.

## Adapter Contract

### listCountries

```javascript
adapter.listCountries() -> [String]
```

Returns an array of 245 ISO 3166-1 alpha-2 country codes (lowercase).

### getMetadata

```javascript
adapter.getMetadata(country_code) -> { calling_code, min_length, max_length } | null
```

Returns country metadata extracted from `libphonenumber-js`, or `null` for unknown countries.

### validateSyntax

```javascript
adapter.validateSyntax(country_code, national_number) -> { valid, reason }
```

Validates using `libphonenumber-js`'s `isValid()` and `isPossible()` checks. This includes digit pattern validation.

| Reason | Condition |
|---|---|
| `CONTACT_PHONE_UNKNOWN_COUNTRY` | Country code not in metadata |
| `CONTACT_PHONE_NOT_A_NUMBER` | Input contains non-digit characters or parse failed |
| `CONTACT_PHONE_TOO_SHORT` | Length < minimum possible length |
| `CONTACT_PHONE_TOO_LONG` | Length > maximum possible length |
| `CONTACT_PHONE_INVALID_PATTERN` | Length is valid but digit pattern does not match |

### getNumberType

```javascript
adapter.getNumberType(country_code, national_number) -> String | null
```

Returns the number type from `libphonenumber-js`'s `getType()`. One of: `MOBILE`, `FIXED_LINE`, `FIXED_LINE_OR_MOBILE`, `TOLL_FREE`, `PREMIUM_RATE`, `SHARED_COST`, `VOIP`, `PERSONAL_NUMBER`, `PAGER`, `UAN`, `VOICEMAIL`. Returns `null` if the type cannot be determined.
