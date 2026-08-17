# API Reference. `helper-contact-phone`

Every exported function on the public interface, with parameters, return shape, and worked examples. For configuration keys, the adapter contract, and reason codes see [Configuration](https://github.com/superloomdev/superloom/blob/main/src/helper-modules-core/js-helper-contact-phone/docs/configuration.md). For the adapter contract schema and return envelope shapes see [Schemas](https://github.com/superloomdev/superloom/blob/main/src/helper-modules-core/js-helper-contact-phone/docs/schemas.md). For the phone ID encoding and E.164 format see [Data Model](https://github.com/superloomdev/superloom/blob/main/src/helper-modules-core/js-helper-contact-phone/docs/data-model.md).

## On This Page

- [Conventions](#conventions)
- [Sanitization](#sanitization)
- [Predicates](#predicates)
- [Lookups](#lookups)
- [Validation](#validation)
- [E.164 Format and Parse](#e164-format-and-parse)
- [Phone ID Create and Parse](#phone-id-create-and-parse)
- [Lifecycle](#lifecycle)

---

## Conventions

Every function in this module is **synchronous and side-effect-free**. There is no async function and no I/O. The module holds no per-instance state. Each loader call returns an independent interface closed over one adapter.

The module follows a two-tier error discipline:

| Pattern | Behavior |
|---|---|
| **Programmer errors** (missing adapter, bad config at loader time) | Throw `Error` at startup. The loader never returns a partially-configured interface |
| **Validation failures** (unknown country, bad charset, wrong length) | Return an envelope `{ success, error }` or `{ success, metadata, error }`. Never throw |
| **Sanitizers** (`sanitizeNumber`, `sanitizeFullNumber`) | Return a cleaned string. Return `''` for null or undefined input. Never throw |
| **Predicates** (`isKnownCountry`) | Return `Boolean`. Never throw |
| **Formatters and parsers** (`formatE164`, `parseE164`, `createPhoneId`, `parsePhoneId`) | Return the result or `null` on bad input. Never throw |

Country codes are ISO 3166-1 alpha-2 strings. The module lowercases country codes before passing them to the adapter, so callers can pass `'US'` or `'us'` interchangeably.

---

## Sanitization

Two functions that strip disallowed characters from phone number strings. Neither validates against the adapter. They are pure string cleaning.

### `sanitizeNumber(number)`

Strip non-digit characters from a national phone number string. Returns the cleaned string (digits only). Returns `''` for null or undefined input.

| Param | Type | Required | Description |
|---|---|---|---|
| `number` | `string` | No | National phone number string |

**Returns:** `String` - sanitized string (digits only)

```javascript
contactPhone.sanitizeNumber('98765 43210');        // '9876543210'
contactPhone.sanitizeNumber('call 987-654-3210');  // '9876543210'
contactPhone.sanitizeNumber(null);                 // ''
contactPhone.sanitizeNumber(undefined);            // ''
```

### `sanitizeFullNumber(phone)`

Strip non-digit and non-plus characters from a full phone number string (may include a country calling code prefix). Returns the cleaned string (digits and `+` only). Returns `''` for null or undefined input.

| Param | Type | Required | Description |
|---|---|---|---|
| `phone` | `string` | No | Full phone number string (may start with `+`) |

**Returns:** `String` - sanitized string (digits and `+` only)

```javascript
contactPhone.sanitizeFullNumber('+91 98765 43210');  // '+919876543210'
contactPhone.sanitizeFullNumber('919876543210');     // '919876543210'
contactPhone.sanitizeFullNumber(null);               // ''
```

> **`sanitizeFullNumber` does not enforce a leading `+`.** It strips everything except digits and `+`, wherever they appear. If the input has a `+` in the middle, it survives. Use this for cleaning user input before parsing, not for guaranteeing E.164 structure.

---

## Predicates

### `isKnownCountry(country_code)`

Return `true` if the country code is in the adapter known list. The check is case-insensitive. Returns `false` for non-string input.

| Param | Type | Required | Description |
|---|---|---|---|
| `country_code` | `string` | No | ISO 3166-1 alpha-2 country code |

**Returns:** `Boolean`

```javascript
contactPhone.isKnownCountry('us');   // true
contactPhone.isKnownCountry('US');   // true
contactPhone.isKnownCountry('zz');   // false
contactPhone.isKnownCountry(123);    // false
contactPhone.isKnownCountry(null);   // false
```

---

## Lookups

### `listCountries()`

List all country codes the adapter knows about. Always returns a success envelope. The country list comes from the adapter, so the contents depend on which adapter was injected at loader time.

**Returns:** `{ success, countries, error }`

| Field | Type | Description |
|---|---|---|
| `success` | `Boolean` | Always `true` |
| `countries` | `String[]` | Array of lowercase ISO 3166-1 alpha-2 country codes |
| `error` | `Object` or `null` | Always `null` |

```javascript
const result = contactPhone.listCountries();
// { success: true, countries: ['us', 'in', 'gb', ...], error: null }
```

### `getCountryMetadata(country_code)`

Get phone metadata for a country (calling code, length bounds). Returns a success envelope with the metadata, or a failure envelope if the country is unknown or the input is not a string.

| Param | Type | Required | Description |
|---|---|---|---|
| `country_code` | `string` | No | ISO 3166-1 alpha-2 country code |

**Returns:** `{ success, metadata, error }`

| Field | Type | Description |
|---|---|---|
| `success` | `Boolean` | `true` on success, `false` on failure |
| `metadata` | `Object` or `null` | `{ calling_code, min_length, max_length }` on success, `null` on failure |
| `error` | `Object` or `null` | Error object on failure, `null` on success |

The metadata object shape:

| Field | Type | Description |
|---|---|---|
| `calling_code` | `String` | Country calling code without the `+` prefix (e.g. `'1'`, `'91'`) |
| `min_length` | `Number` | Minimum national number length |
| `max_length` | `Number` | Maximum national number length |

```javascript
contactPhone.getCountryMetadata('in');
// { success: true, metadata: { calling_code: '91', min_length: 10, max_length: 10 }, error: null }

contactPhone.getCountryMetadata('zz');
// { success: false, metadata: null, error: { type: 'CONTACT_PHONE_UNKNOWN_COUNTRY', message: '...' } }

contactPhone.getCountryMetadata(123);
// { success: false, metadata: null, error: { type: 'CONTACT_PHONE_UNKNOWN_COUNTRY', message: '...' } }
```

---

## Validation

### `validateNumber(country_code, national_number)`

Validate a national phone number against the adapter rules. The adapter checks country existence, charset, and length bounds. Returns an envelope with `success` and `error`. On failure, the error object's `message` field carries the reason code from the adapter.

| Param | Type | Required | Description |
|---|---|---|---|
| `country_code` | `string` | Yes | ISO 3166-1 alpha-2 country code |
| `national_number` | `string` | Yes | National phone number (no calling code) |

**Returns:** `{ success, error }`

| Field | Type | Description |
|---|---|---|
| `success` | `Boolean` | `true` if the number passed all adapter checks |
| `error` | `Object` or `null` | Error object on failure, `null` on success |

On failure, `error` is `{ type: 'CONTACT_PHONE_INVALID_NUMBER', message: <reason> }` where `<reason>` is one of the reason codes: `UNKNOWN_COUNTRY`, `CHARSET`, `TOO_SHORT`, `TOO_LONG`, `PATTERN`, `NOT_ASSIGNED`. The basic adapter only emits the first four. See [Configuration](https://github.com/superloomdev/superloom/blob/main/src/helper-modules-core/js-helper-contact-phone/docs/configuration.md) for the full reason code list.

```javascript
contactPhone.validateNumber('us', '4155551234');
// { success: true, error: null }

contactPhone.validateNumber('us', '123456789');
// { success: false, error: { type: 'CONTACT_PHONE_INVALID_NUMBER', message: 'TOO_SHORT' } }

contactPhone.validateNumber('us', '415555abcd');
// { success: false, error: { type: 'CONTACT_PHONE_INVALID_NUMBER', message: 'CHARSET' } }

contactPhone.validateNumber('zz', '1234567890');
// { success: false, error: { type: 'CONTACT_PHONE_INVALID_NUMBER', message: 'UNKNOWN_COUNTRY' } }

contactPhone.validateNumber('us', null);
// { success: false, error: { type: 'CONTACT_PHONE_INVALID_NUMBER', message: 'Validation failed' } }
```

> **Non-string `national_number` produces a generic message.** When `national_number` is not a string, the function returns `{ success: false, error: ERRORS.INVALID_NUMBER }` without delegating to the adapter. The error message is `'The phone number failed validation'`, not a reason code. Always sanitize and type-check before calling `validateNumber` if the input source is untrusted.

---

## E.164 Format and Parse

### `formatE164(country_code, national_number)`

Format a national number into E.164 form: `+` + calling code + national number. Returns `null` if the country is unknown, the national number is null or undefined, or the country code is not a string.

| Param | Type | Required | Description |
|---|---|---|---|
| `country_code` | `string` | Yes | ISO 3166-1 alpha-2 country code |
| `national_number` | `string` | No | National phone number (no calling code) |

**Returns:** `String` or `null` - E.164 formatted string, or `null`

```javascript
contactPhone.formatE164('us', '4155551234');   // '+14155551234'
contactPhone.formatE164('in', '9876543210');   // '+919876543210'
contactPhone.formatE164('ae', '12345678');     // '+97112345678'
contactPhone.formatE164('zz', '1234567890');   // null
contactPhone.formatE164('us', null);           // null
```

> **`formatE164` does not validate the national number.** It concatenates the calling code from metadata with the national number as-is. If the national number contains non-digit characters or has the wrong length, the resulting E.164 string will be malformed. Call `validateNumber` first if the input is untrusted.

### `parseE164(e164_number)`

Parse an E.164 formatted string into its country code and national number. The match is anchored to the start of the digit string and tries the longest calling code first, so a number like `+19198765432` correctly resolves to US (calling code `1`) rather than IN (calling code `91`).

Returns an object `{ country_code, national_number }` or `null` if no country's calling code matches the start of the string, the input does not start with `+`, or the input is not a string.

| Param | Type | Required | Description |
|---|---|---|---|
| `e164_number` | `string` | No | E.164 formatted phone number (starts with `+`) |

**Returns:** `{ country_code, national_number }` or `null`

| Field | Type | Description |
|---|---|---|
| `country_code` | `String` | Lowercase ISO 3166-1 alpha-2 country code |
| `national_number` | `String` | National phone number (the digits after the calling code) |

```javascript
contactPhone.parseE164('+14155551234');
// { country_code: 'us', national_number: '4155551234' }

contactPhone.parseE164('+919876543210');
// { country_code: 'in', national_number: '9876543210' }

contactPhone.parseE164('+97112345678');
// { country_code: 'ae', national_number: '12345678' }

contactPhone.parseE164('14155551234');  // null (no leading +)
contactPhone.parseE164(null);           // null
```

> **Shared calling code limitation.** When two countries share the same calling code (e.g. US and CA both use `1`), `parseE164` returns the first match in adapter iteration order. It cannot distinguish which country the number belongs to from the E.164 string alone. See [Data Model](https://github.com/superloomdev/superloom/blob/main/src/helper-modules-core/js-helper-contact-phone/docs/data-model.md) for details.

---

## Phone ID Create and Parse

### `createPhoneId(country_code, national_number)`

Create a phone ID from a country code and national number. The ID format is `reversed(national_number) + '.' + country_code`. Returns `null` if the national number is null or empty, or the country code is not a string.

| Param | Type | Required | Description |
|---|---|---|---|
| `country_code` | `string` | Yes | ISO 3166-1 alpha-2 country code |
| `national_number` | `string` | No | National phone number (no calling code) |

**Returns:** `String` or `null` - phone ID string, or `null`

```javascript
contactPhone.createPhoneId('in', '9876543210');  // '0123456789.in'
contactPhone.createPhoneId('us', '4155551234');  // '4321555514.us'
contactPhone.createPhoneId('us', null);          // null
contactPhone.createPhoneId('us', '');            // null
contactPhone.createPhoneId(123, '4155551234');   // null
```

> **The phone ID is a storage convention, not a display format.** Never show a phone ID to an end user. The reversal and separator exist for key-space distribution in storage layers. See [Data Model](https://github.com/superloomdev/superloom/blob/main/src/helper-modules-core/js-helper-contact-phone/docs/data-model.md) for the encoding rationale.

### `parsePhoneId(phone_id)`

Parse a phone ID back into its country code and national number. Splits on the first `.` separator, reverses the left side back to the original national number, and returns the country code from the right side. Returns `null` if the input is null, empty, not a string, has no `.`, or either part is empty.

| Param | Type | Required | Description |
|---|---|---|---|
| `phone_id` | `string` | No | Phone ID string |

**Returns:** `{ country_code, national_number }` or `null`

| Field | Type | Description |
|---|---|---|
| `country_code` | `String` | Lowercase ISO 3166-1 alpha-2 country code |
| `national_number` | `String` | National phone number (reversed back to original form) |

```javascript
contactPhone.parsePhoneId('0123456789.in');
// { country_code: 'in', national_number: '9876543210' }

contactPhone.parsePhoneId('4321555514.us');
// { country_code: 'us', national_number: '4155551234' }

contactPhone.parsePhoneId('0123456789');    // null (no dot)
contactPhone.parsePhoneId('.in');           // null (empty reversed part)
contactPhone.parsePhoneId('0123456789.');   // null (empty country code)
contactPhone.parsePhoneId(null);            // null
```

---

## Lifecycle

There is nothing to clean up. The module exposes only synchronous functions with no I/O and no per-instance resources. Each loader call captures its `Lib`, `CONFIG`, `ERRORS`, and adapter in a closure. After construction, no module-level state changes for the lifetime of the process.

For module-level setup details (loader signature, config-merge semantics, the adapter contract) see [Configuration](https://github.com/superloomdev/superloom/blob/main/src/helper-modules-core/js-helper-contact-phone/docs/configuration.md).
