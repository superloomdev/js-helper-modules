# API Reference - helper-contact-phone-adapter-basic

## Overview

The basic phone adapter implements the 4-method contract defined by `helper-contact-phone`. It provides lean country data (calling codes, length bounds) and charset validation.

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

Returns a copy of the country metadata, or `null` for unknown countries.

| Field | Type | Description |
|---|---|---|
| `calling_code` | `String` | E.164 dialing prefix without `+` (e.g. `'91'`) |
| `min_length` | `Number` | Minimum national number digit count |
| `max_length` | `Number` | Maximum national number digit count (capped at E.164 limit) |

### validateSyntax

```javascript
adapter.validateSyntax(country_code, national_number) -> { valid, reason }
```

Validates length and charset. Returns `{ valid: true, reason: null }` on success, or `{ valid: false, reason: '<error_type>' }` on failure.

| Reason | Condition |
|---|---|
| `CONTACT_PHONE_UNKNOWN_COUNTRY` | Country code not in data |
| `CONTACT_PHONE_NOT_A_NUMBER` | Input contains non-digit characters |
| `CONTACT_PHONE_TOO_SHORT` | Length < min_length |
| `CONTACT_PHONE_TOO_LONG` | Length > max_length |

### getNumberType

```javascript
adapter.getNumberType(country_code, national_number) -> null
```

Always returns `null`. The basic adapter has no number type data.
