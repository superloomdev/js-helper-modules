# Schemas - helper-contact-address

## Return Conventions

| Kind | Returns |
|---|---|
| Transform (`sanitize*`, `create*`) | The value directly |
| Validation (`validate*`) | `{ success, error }` or `{ success, errors, error }` |
| Lookup (`list*`, `get*`) | `{ success, <payload>, error }` |

## Adapter Contract Schema

```javascript
{
  listCountries: function () -> [String],
  getPostalRule: function (country_code: String) -> {
    min_length: Number,
    max_length: Number,
    pattern: RegExp | null,
    required: Boolean
  } | null,
  listSubdivisions: function (country_code: String) -> [{ code: String, name: String }] | null,
  validatePostalCode: function (country_code: String, postal_code: String) -> { valid: Boolean, reason: String | null },
  validateSubdivision: function (country_code: String, subdivision_code: String) -> { valid: Boolean, reason: String | null }
}
```

## Address Data Structure

```
{
  line_1:       String
  line_2:       String
  landmark:     String
  locality:     String
  subdivision:  String
  postal_code:  String
  country:      String          // ISO 3166-1 alpha-2, lowercase
  coordinates:  { latitude: Number, longitude: Number }
  label:        String
  tag:          String          // 'home' | 'work' | 'other'
  metadata:     Object
}
```
