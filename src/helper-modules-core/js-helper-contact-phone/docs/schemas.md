# Schemas - helper-contact-phone

## Return Conventions

| Kind | Returns | Rationale |
|---|---|---|
| Transform (`sanitize*`, `create*`, `parse*`, `format*`) | The value directly; `null` on unusable input | Matches `Lib.Utils` precedent |
| Validation (`validate*`) | `{ success: Boolean, error: Object\|null }` | The caller needs the reason |
| Predicate (`is*`) | `Boolean` | Cheap check, no reason possible |
| Lookup (`get*`, `list*`) | `{ success, <payload>, error }` | Can legitimately miss |

## Adapter Contract Schema

```javascript
{
  listCountries: function () -> [String],
  getMetadata: function (country_code: String) -> {
    calling_code: String,    // E.164 dialing prefix, e.g. '91'
    min_length: Number,      // minimum national number length
    max_length: Number       // maximum national number length
  } | null,
  validateSyntax: function (country_code: String, national_number: String) -> {
    valid: Boolean,
    reason: String | null    // one of the CONTACT_PHONE_* error type strings
  },
  getNumberType: function (country_code: String, national_number: String) -> String | null
}
```

## Metadata Schema

```javascript
{
  calling_code: String,    // E.164 dialing prefix without +, e.g. '91', '1', '44'
  min_length: Number,      // minimum digits in a valid national number
  max_length: Number       // maximum digits in a valid national number
}
```

## Phone ID Format

```
country_code + '.' + reversed(national_number)
```

Example: `in.0123456789` for India number `9876543210`.

## E.164 Format

```
+<calling_code><national_number>
```

Example: `+919876543210` for India calling code `91` and national number `9876543210`.

Maximum 15 digits (excluding the `+` prefix), per ITU-T E.164 recommendation.

## Error Catalog

All error entries are frozen objects with `type` and `message` properties. Key === type. See `docs/api.md` for the full catalog.
