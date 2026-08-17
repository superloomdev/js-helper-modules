# API Reference. `helper-contact-phone-adapter-basic`

The three-method adapter contract that `helper-contact-phone` consumes. For loader pattern, data source, and testing tier see [Configuration](https://github.com/superloomdev/superloom/blob/main/src/helper-modules-core/js-helper-contact-phone-adapter-basic/docs/configuration.md).

## On This Page

- [Conventions](#conventions)
- [listCountries](#listcountries)
- [getMetadata](#getmetadata)
- [validateNumber](#validatenumber)
- [Reason Codes](#reason-codes)
- [Lifecycle](#lifecycle)

---

## Conventions

The adapter is **stateless and synchronous**. Every method is a pure lookup or check against the generated country data table. No method throws, no method reads `process.env`, and no method performs I/O.

| Pattern | Behavior |
|---|---|
| **Country codes** | All country codes are ISO 3166-1 alpha-2, lowercase (e.g. `'us'`, `'in'`, `'gb'`) |
| **National numbers** | Digits only, no calling-code prefix, no formatting characters. The caller strips those before calling `validateNumber` |
| **Return on unknown country** | `getMetadata` returns `null`; `validateNumber` returns `{ valid: false, reason: 'UNKNOWN_COUNTRY' }` |
| **No exceptions** | Every method returns a value. Invalid input produces a structured result, never a thrown error |

The adapter carries a frozen country table generated from `libphonenumber-js` metadata. The table maps each country code to its calling code and national number length bounds. There are no national-prefix patterns and no number-format rules. For pattern-based or assignment-status validation, use the libphonenumber adapter instead.

---

## listCountries

```javascript
listCountries() -> [String]
```

Returns an array of every ISO 3166-1 alpha-2 country code the adapter knows about, in lowercase. The array is derived from the keys of the generated country data table.

| Return | Type | Description |
|---|---|---|
| (return) | `Array<string>` | Country codes, lowercase. Length is 200+ |

```javascript
const countries = adapter.listCountries();
// ['ac', 'ad', 'ae', 'af', 'ag', ... ]
```

---

## getMetadata

```javascript
getMetadata(country_code) -> { calling_code, min_length, max_length } | null
```

Returns the phone metadata for a country, or `null` when the country code is not in the data table.

| Param | Type | Required | Description |
|---|---|---|---|
| `country_code` | `string` | Yes | ISO 3166-1 alpha-2 country code, lowercase |

| Return field | Type | Description |
|---|---|---|
| `calling_code` | `string` | The international dialing prefix (e.g. `'1'`, `'91'`, `'971'`) |
| `min_length` | `number` | Minimum national number length (digit count) |
| `max_length` | `number` | Maximum national number length (digit count) |

Returns `null` for an unknown country code.

```javascript
const meta = adapter.getMetadata('us');
// { calling_code: '1', min_length: 10, max_length: 10 }

const meta = adapter.getMetadata('ae');
// { calling_code: '971', min_length: 5, max_length: 12 }

const meta = adapter.getMetadata('zz');
// null
```

---

## validateNumber

```javascript
validateNumber(country_code, national_number) -> { valid: Boolean, reason: String | null }
```

Validates a national phone number against the adapter rules. Checks are applied in order: country existence, charset (digits only), minimum length, maximum length. The first failing check determines the `reason`. When all checks pass, `valid` is `true` and `reason` is `null`.

| Param | Type | Required | Description |
|---|---|---|---|
| `country_code` | `string` | Yes | ISO 3166-1 alpha-2 country code, lowercase |
| `national_number` | `string` | Yes | National phone number, digits only, no calling-code prefix |

| Return field | Type | Description |
|---|---|---|
| `valid` | `boolean` | `true` when the number passes all checks |
| `reason` | `string` or `null` | A reason code when `valid` is `false`, otherwise `null` |

```javascript
adapter.validateNumber('us', '4155551234');
// { valid: true, reason: null }

adapter.validateNumber('us', '123');
// { valid: false, reason: 'TOO_SHORT' }

adapter.validateNumber('zz', '1234567890');
// { valid: false, reason: 'UNKNOWN_COUNTRY' }
```

---

## Reason Codes

`validateNumber` emits one of four reason codes when `valid` is `false`. When `valid` is `true`, `reason` is always `null`.

| Code | Meaning | Check that produces it |
|---|---|---|
| `UNKNOWN_COUNTRY` | The country code is not in the data table | Country existence |
| `CHARSET` | The national number contains non-digit characters | Charset (digits only) |
| `TOO_SHORT` | The national number is shorter than the country's `min_length` | Minimum length |
| `TOO_LONG` | The national number is longer than the country's `max_length` | Maximum length |

### Codes this adapter never emits

The basic adapter performs structural validation only (country, charset, length). It does not check number patterns or assignment status. The following reason codes are reserved for the libphonenumber adapter and are never produced by this adapter:

| Code | Reserved for | Why the basic adapter cannot produce it |
|---|---|---|
| `PATTERN` | libphonenumber adapter | Requires national-prefix and number-pattern rules, which this adapter does not carry |
| `NOT_ASSIGNED` | libphonenumber adapter | Requires a live or bundled number-range database, which this adapter does not carry |

Consumers that branch on `reason` can safely treat `PATTERN` and `NOT_ASSIGNED` as impossible when using this adapter. The test suite includes an explicit assertion that neither code is ever returned.

---

## Lifecycle

There is nothing to clean up. The adapter is stateless. Each loader call returns an independent adapter object closed over its `Lib`, `CONFIG`, `ERRORS`, and `Validators` slots, but none of those slots change after construction. The country data table is a frozen module-level constant shared across all instances.

For loader signature, config-merge semantics, and data-source details see [Configuration](https://github.com/superloomdev/superloom/blob/main/src/helper-modules-core/js-helper-contact-phone-adapter-basic/docs/configuration.md).
