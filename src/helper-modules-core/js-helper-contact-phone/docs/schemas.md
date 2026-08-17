# Schemas. `helper-contact-phone`

The adapter contract schema, return envelope shapes, and the throw-versus-return discipline. For the function reference see [API Reference](https://github.com/superloomdev/superloom/blob/main/src/helper-modules-core/js-helper-contact-phone/docs/api.md). For configuration keys and the adapter contract description see [Configuration](https://github.com/superloomdev/superloom/blob/main/src/helper-modules-core/js-helper-contact-phone/docs/configuration.md).

## On This Page

- [Adapter Contract Schema](#adapter-contract-schema)
- [Return Envelope Shapes](#return-envelope-shapes)
- [Throw vs Return Discipline](#throw-vs-return-discipline)
- [Error Catalog](#error-catalog)

---

## Adapter Contract Schema

Every adapter must be an object with exactly three methods. The core module validates the contract at loader time and throws if any method is missing or not a function.

### Contract definition

```
Adapter = {
  listCountries:    () -> [String]
  getMetadata:      (country_code: String) -> { calling_code: String, min_length: Number, max_length: Number } | null
  validateNumber:   (country_code: String, national_number: String) -> { valid: Boolean, reason: String | null }
}
```

### `listCountries()`

| Field | Type | Description |
|---|---|---|
| Returns | `String[]` | Array of lowercase ISO 3166-1 alpha-2 country codes |

No parameters. Must return an array. The core module does not validate the array contents, only that the return value is used with `indexOf` for membership checks.

### `getMetadata(country_code)`

| Param | Type | Description |
|---|---|---|
| `country_code` | `String` | Lowercase ISO 3166-1 alpha-2 country code |

| Field | Type | Description |
|---|---|---|
| Returns | `Object` or `null` | Metadata object for known countries, `null` for unknown |

The metadata object shape:

| Field | Type | Description |
|---|---|---|
| `calling_code` | `String` | Country calling code without the `+` prefix (e.g. `'1'`, `'91'`, `'971'`) |
| `min_length` | `Number` | Minimum national number length in digits |
| `max_length` | `Number` | Maximum national number length in digits |

### `validateNumber(country_code, national_number)`

| Param | Type | Description |
|---|---|---|
| `country_code` | `String` | Lowercase ISO 3166-1 alpha-2 country code |
| `national_number` | `String` | National phone number (no calling code) |

| Field | Type | Description |
|---|---|---|
| Returns | `Object` | `{ valid, reason }` |

| Field | Type | Description |
|---|---|---|
| `valid` | `Boolean` | `true` if the number passed all adapter checks |
| `reason` | `String` or `null` | Reason code on failure (`UNKNOWN_COUNTRY`, `CHARSET`, `TOO_SHORT`, `TOO_LONG`, `PATTERN`, `NOT_ASSIGNED`), `null` on success |

### Contract validation at loader time

The loader calls `Validators.validateAdapterContract(adapter)` before returning the public interface. The validator checks that each required method exists and is a function:

```javascript
const required = ['listCountries', 'getMetadata', 'validateNumber'];

required.forEach(function (name) {
  if (Lib.Utils.isNullOrUndefined(adapter[name]) || !Lib.Utils.isFunction(adapter[name])) {
    throw new Error('[helper-contact-phone] Invalid adapter contract: missing method `' + name + '`');
  }
});
```

If any method is missing, the loader throws `Error` and never returns an interface. This guarantees that runtime requests never hit a partially-implemented adapter.

---

## Return Envelope Shapes

The module uses three envelope shapes for functions that can fail on valid input (unknown country, invalid number). Sanitizers, predicates, formatters, and parsers do not use envelopes. They return their result directly or `null`.

### Lookup envelope: `{ success, countries, error }`

Used by `listCountries()`. Always succeeds.

| Field | Type | Value |
|---|---|---|
| `success` | `Boolean` | Always `true` |
| `countries` | `String[]` | Array of country codes from the adapter |
| `error` | `Object` or `null` | Always `null` |

### Metadata envelope: `{ success, metadata, error }`

Used by `getCountryMetadata(country_code)`.

| Field | Type | Success value | Failure value |
|---|---|---|---|
| `success` | `Boolean` | `true` | `false` |
| `metadata` | `Object` or `null` | `{ calling_code, min_length, max_length }` | `null` |
| `error` | `Object` or `null` | `null` | `{ type, message }` |

### Validation envelope: `{ success, error }`

Used by `validateNumber(country_code, national_number)`.

| Field | Type | Success value | Failure value |
|---|---|---|---|
| `success` | `Boolean` | `true` | `false` |
| `error` | `Object` or `null` | `null` | `{ type, message }` |

On failure, `error.type` is `'CONTACT_PHONE_INVALID_NUMBER'` and `error.message` is the reason code string from the adapter (e.g. `'TOO_SHORT'`, `'CHARSET'`). If the adapter returns a falsy reason, the message defaults to `'Validation failed'`.

### Non-envelope return types

| Function | Return type | Failure return |
|---|---|---|
| `sanitizeNumber` | `String` | `''` for null or undefined |
| `sanitizeFullNumber` | `String` | `''` for null or undefined |
| `isKnownCountry` | `Boolean` | `false` for unknown or non-string |
| `formatE164` | `String` or `null` | `null` for unknown country or null input |
| `parseE164` | `Object` or `null` | `null` for no match or bad input |
| `createPhoneId` | `String` or `null` | `null` for null, empty, or non-string input |
| `parsePhoneId` | `Object` or `null` | `null` for malformed input |

---

## Throw vs Return Discipline

The module separates programmer errors from validation failures. Programmer errors throw at startup. Validation failures return envelopes. This distinction is deliberate and consistent across all 10 public functions.

### Programmer errors throw

Programmer errors are mistakes in wiring or configuration. They are caught at loader time, before the public interface is returned. The caller must fix them before the module can be used.

| Error | When | Exception |
|---|---|---|
| `Adapter` is null, undefined, or not an object | `Validators.validateConfig` at loader time | `Error` |
| Adapter missing a required method | `Validators.validateAdapterContract` at loader time | `Error` |

Both throw `Error`, not `TypeError`. A missing adapter is a setup error, not a programmer call error. The error messages include the module name and a construction hint:

```text
[helper-contact-phone] CONFIG.Adapter must be a ready-to-use adapter object.
Create it first: const Adapter = require("helper-contact-phone-adapter-basic")(Lib, {})
```

```text
[helper-contact-phone] Invalid adapter contract: missing method `listCountries`
```

### Validation failures return envelopes

Validation failures are expected outcomes from checking user-supplied data. They never throw. The caller branches on the `success` field.

| Failure | Function | Return shape |
|---|---|---|
| Unknown country code | `getCountryMetadata` | `{ success: false, metadata: null, error: ERRORS.UNKNOWN_COUNTRY }` |
| Non-string country code | `getCountryMetadata` | `{ success: false, metadata: null, error: ERRORS.UNKNOWN_COUNTRY }` |
| Non-string country code | `validateNumber` | `{ success: false, error: ERRORS.UNKNOWN_COUNTRY }` |
| Non-string national number | `validateNumber` | `{ success: false, error: ERRORS.INVALID_NUMBER }` |
| Adapter rejects the number | `validateNumber` | `{ success: false, error: { type: 'CONTACT_PHONE_INVALID_NUMBER', message: <reason> } }` |

### Formatters and parsers return null

Formatters and parsers do not use envelopes. They return the result directly, or `null` on any failure (unknown country, null input, non-string input, malformed input). The caller checks for `null` rather than branching on a `success` field.

| Function | Returns `null` when |
|---|---|
| `formatE164` | Country is unknown, national number is null or undefined, country code is not a string |
| `parseE164` | Input is not a string, does not start with `+`, no calling code matches, or the remainder is empty |
| `createPhoneId` | National number is null or empty, country code is not a string |
| `parsePhoneId` | Input is null, empty, not a string, has no `.`, or either part is empty |

### Sanitizers and predicates never fail

Sanitizers return a cleaned string (`''` for null or undefined). Predicates return `Boolean`. Neither throws, neither returns `null`, neither uses an envelope. They are safe to call with any input.

---

## Error Catalog

The error catalog is defined in `phone.errors.js` and frozen at module load. The core module returns these objects in failure envelopes. They are not thrown.

| Key | Type | Message |
|---|---|---|
| `UNKNOWN_COUNTRY` | `Object` | `'The country code is not in the adapter known list'` |
| `INVALID_NUMBER` | `Object` | `'The phone number failed validation'` |
| `LOOKUP_FAILED` | `Object` | `'The country metadata lookup failed'` |

Each error object has a `type` field (e.g. `'CONTACT_PHONE_UNKNOWN_COUNTRY'`) and a `message` field. The catalog is frozen with `Object.freeze` to prevent accidental mutation.

`UNKNOWN_COUNTRY` is returned by `getCountryMetadata` when the country is unknown or the input is not a string. `INVALID_NUMBER` is returned by `validateNumber` when the national number is not a string, or wrapped around the adapter's reason code when the adapter rejects the number. `LOOKUP_FAILED` is reserved for future use and is not currently returned by any public function.
