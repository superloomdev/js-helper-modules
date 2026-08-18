# API Reference - helper-contact-address-adapter-extended

## listCountries

Returns 245 ISO 3166-1 alpha-2 country codes (lowercase).

## getPostalRule

Returns `{ min_length, max_length, pattern, required }` with a compiled RegExp for the `pattern` field. Returns null for unknown countries.

## listSubdivisions

Returns `[{ code, name }]` for countries with subdivision data (24 countries). Returns null for countries without subdivision data or unknown countries.

## validatePostalCode

Regex pattern validation. 174 countries have patterns. Falls back to length bounds when patterns are unavailable.

| Reason | Condition |
|---|---|
| `CONTACT_ADDRESS_INVALID_COUNTRY` | Unknown country |
| `CONTACT_ADDRESS_TOO_SHORT` | Length < min_length |
| `CONTACT_ADDRESS_TOO_LONG` | Length > max_length |
| `CONTACT_ADDRESS_INVALID_FORMAT` | Length OK but pattern doesn't match |

## validateSubdivision

Checks against ISO 3166-2 subdivision list. Returns valid if no subdivision data is available (graceful fallback).

| Reason | Condition |
|---|---|
| `CONTACT_ADDRESS_INVALID_COUNTRY` | Unknown country |
| `CONTACT_ADDRESS_INVALID_SUBDIVISION` | Code not in subdivision list |
