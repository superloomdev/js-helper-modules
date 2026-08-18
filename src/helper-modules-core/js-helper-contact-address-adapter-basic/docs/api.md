# API Reference - helper-contact-address-adapter-basic

## listCountries

Returns 245 ISO 3166-1 alpha-2 country codes (lowercase).

## getPostalRule

Returns `{ min_length, max_length, pattern: null, required }` or null for unknown countries. Countries with `required: false` have no postal system.

## listSubdivisions

Always returns `null`. The basic adapter has no subdivision data.

## validatePostalCode

Length bounds only. No regex pattern validation. Returns `{ valid, reason }`.

| Reason | Condition |
|---|---|
| `CONTACT_ADDRESS_INVALID_COUNTRY` | Unknown country |
| `CONTACT_ADDRESS_TOO_SHORT` | Length < min_length |
| `CONTACT_ADDRESS_TOO_LONG` | Length > max_length |

## validateSubdivision

Always returns `{ valid: true, reason: null }`. The basic adapter has no subdivision data.
