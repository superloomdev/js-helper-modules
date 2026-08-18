# Schemas - helper-contact-email

## Return Conventions

| Kind | Returns | Rationale |
|---|---|---|
| Transform (`sanitize*`, `canonicalize`) | The value directly; `null` on unusable input | Matches `Lib.Utils` precedent |
| Validation (`validate*`) | `{ success: Boolean, error: Object\|null }` | The caller needs the reason |
| Predicate (`is*`) | `Boolean` | Cheap check, no reason possible |
| String utility (`get*Part`) | `String\|null` | Can legitimately miss |

## Adapter Contract Schema

```javascript
{
  validateSyntax: function (email: String) -> {
    valid: Boolean,
    reason: String | null    // one of the CONTACT_EMAIL_* error type strings
  },
  isDisposableDomain: function (domain: String) -> Boolean,
  canonicalize: function (email: String) -> String | null
}
```

## Error Catalog

All error entries are frozen objects with `type` and `message` properties. Key === type. See `docs/api.md` for the full catalog.
