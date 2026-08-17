# Data Model. `helper-contact-phone`

The phone ID encoding, the E.164 format, and the shared calling code limitation of `parseE164`. For the function reference see [API Reference](https://github.com/superloomdev/superloom/blob/main/src/helper-modules-core/js-helper-contact-phone/docs/api.md). For the adapter contract schema and return envelope shapes see [Schemas](https://github.com/superloomdev/superloom/blob/main/src/helper-modules-core/js-helper-contact-phone/docs/schemas.md).

## On This Page

- [Phone ID Encoding](#phone-id-encoding)
- [E.164 Format](#e164-format)
- [Shared Calling Code Limitation](#shared-calling-code-limitation)

---

## Phone ID Encoding

The phone ID is a Superloom-owned storage identifier built from a country code and a national number. It is not an industry standard. It exists to solve a storage-layer distribution problem.

### Format

```
phone_id = reversed(national_number) + '.' + country_code
```

The national number is reversed character by character, then joined with the lowercase country code using a `.` separator.

| Input | Output |
|---|---|
| `country_code='in'`, `national_number='9876543210'` | `'0123456789.in'` |
| `country_code='us'`, `national_number='4155551234'` | `'4321555514.us'` |
| `country_code='ae'`, `national_number='12345678'` | `'87654321.ae'` |

### Reversal rationale

Phone numbers within a single country are typically issued sequentially or in ascending blocks. A national number like `4155550001` is followed by `4155550002`, then `4155550003`, and so on. If these numbers were stored as-is in a sorted key space, sequential issuances would cluster together in one partition, creating a hot spot.

Reversing the national number distributes sequentially-issued numbers across the key space. `4155550001` becomes `1000555514`, `4155550002` becomes `2000555514`, `4155550003` becomes `3000555514`. The numbers that were adjacent are now spread across different leading digits, which maps to different partitions in a range- or hash-partitioned store.

This technique originated in a DynamoDB-era storage design where sort keys needed even distribution across partition key ranges. The reversal is a fixed, deterministic transformation: no metadata, no salt, no randomness. `parsePhoneId` reverses the string back to recover the original national number.

### Separator choice

The separator between the reversed number and the country code is `.` (a single period). This choice avoids collisions with other Superloom identifier formats:

| Format | Separator | Owner |
|---|---|---|
| Phone ID | `.` | helper-contact-phone |
| Auth identifiers | `-` | helper-auth |
| Auth composite keys | `#` | helper-auth |

The `.` separator collides with nothing in the current identifier ecosystem. `parsePhoneId` splits on the first `.` it finds, so the country code part is everything after the first dot. The national number (reversed) is everything before it. Since national numbers are digits only and country codes are lowercase letters, there is no ambiguity.

### Storage convention, not display format

The phone ID is a storage convention. It should never be shown to an end user, logged in plain text, or used as a display string. The reversed number is not meaningful to a human reader. Use `parsePhoneId` to recover the country code and national number, then `formatE164` to produce a human-readable display string.

### Round-trip guarantee

`createPhoneId` and `parsePhoneId` are inverse operations. For any valid country code and non-empty national number:

```javascript
const id = contactPhone.createPhoneId('in', '9876543210');
const parsed = contactPhone.parsePhoneId(id);
// parsed === { country_code: 'in', national_number: '9876543210' }
```

The country code is lowercased by `createPhoneId`, so `parsePhoneId` always returns a lowercase country code regardless of the case passed to `createPhoneId`.

---

## E.164 Format

E.164 is the ITU-T standard for international telephone number format. A valid E.164 number consists of a `+` prefix, the country calling code, and the national subscriber number, with no spaces or formatting characters.

### Format

```
e164 = '+' + calling_code + national_number
```

| Input | Output |
|---|---|
| `country_code='us'`, `national_number='4155551234'` | `'+14155551234'` |
| `country_code='in'`, `national_number='9876543210'` | `'+919876543210'` |
| `country_code='ae'`, `national_number='12345678'` | `'+97112345678'` |

`formatE164` builds the string by concatenating the calling code from adapter metadata with the national number as-is. `parseE164` reverses the process by matching calling codes against the start of the digit string.

### What the core does and does not guarantee

The core module's `formatE164` does not validate the national number before formatting. It concatenates the calling code and the national number directly. If the national number contains non-digit characters or has the wrong length, the resulting E.164 string will be malformed. Call `validateNumber` first if the input source is untrusted.

`parseE164` does not validate the parsed national number against the adapter's length bounds. It returns whatever digits remain after the calling code is stripped. The caller can validate the result by passing the returned `country_code` and `national_number` to `validateNumber`.

---

## Shared Calling Code Limitation

`parseE164` identifies the country by matching calling codes against the start of the digit string. When two or more countries share the same calling code, the E.164 string alone cannot determine which country the number belongs to.

### The problem

The most common case is calling code `1`, shared by the US, Canada, and other NANP countries. An E.164 number like `+14155551234` could be a US number or a Canadian number. The calling code is the same, so the parse result is ambiguous.

### What `parseE164` does

`parseE164` iterates all known countries, collects their calling codes, sorts by calling code length descending (longest first), and returns the first country whose calling code matches the start of the digit string. When multiple countries share the same calling code, the result depends on adapter iteration order. The function returns one country, not a list of candidates.

### What the caller should do

When the calling code is shared, the caller must use additional context to determine the correct country. Options include:

- **Ask the user.** If the application collects a country code separately from the phone number, use the user-provided country code instead of relying on `parseE164`.
- **Use the phone ID.** If the number was stored as a phone ID, `parsePhoneId` recovers the original country code unambiguously. The phone ID encodes the country code directly, so there is no calling-code ambiguity.
- **Use a libphonenumber adapter.** The libphonenumber adapter can distinguish NANP countries by checking the area code against assigned ranges. This requires the adapter to expose a richer parse API, which is outside the current 3-method contract.

### The longest-match-first sort

`parseE164` sorts candidate calling codes by string length descending before matching. This ensures that `+91` matches IN (calling code `91`) before it could match a hypothetical country with calling code `9`. Without the sort, a shorter calling code could match first and produce the wrong country.

The sort also handles the case where a calling code appears again inside the national number. For example, `+19198765432` starts with `1` (US calling code), and the digits `91` appear again later in the number. The anchored match at the start correctly identifies US and extracts `9198765432` as the national number, rather than matching `91` (IN) at position 0, which would fail because the number starts with `1`, not `91`.
