# helper-contact-phone - AI Agent Reference

Phone number validation, sanitization, and E.164 formatting with swappable adapter depth. 10 exported functions. The core holds no country data; a required adapter supplies calling codes, length bounds, and validation logic.

## Module Type
Class B. Domain helper. No service dependency (no Docker, no external service). Requires a peer adapter package for country data.

## Peer Dependencies
- helper-utils (type checks, null guards)
- helper-debug (structured logging)

## Optional Peer Dependencies (adapters)
- helper-contact-phone-adapter-basic (lean static table, 4 reason codes)
- helper-contact-phone-adapter-libphonenumber (full validation, 6 reason codes)

## Direct Dependencies
None.

## Companion Files
- `phone.config.js` - 1 config key (Adapter, required, default null)
- `phone.errors.js` - 3 frozen error objects (UNKNOWN_COUNTRY, INVALID_NUMBER, LOOKUP_FAILED)
- `phone.validators.js` - validateConfig + validateAdapterContract (throw at loader time)

## Loader Pattern (Factory)

```javascript
const Adapter = require('helper-contact-phone-adapter-basic')(Lib, {});
const contactPhone = require('helper-contact-phone')(Lib, { Adapter });
```

Each loader call returns an independent ContactPhone interface closed over one ready-to-use adapter. Validates CONFIG and adapter contract at construction time. Throws on misconfiguration.

## Config Keys
| Key | Type | Default | Description |
|---|---|---|---|
| Adapter | Object | null | Ready-to-use adapter object (required). Loader throws if null or not an object |

## Adapter Contract (3 methods)
listCountries() -> [String]
getMetadata(country_code: String) -> { calling_code: String, min_length: Number, max_length: Number } | null
validateNumber(country_code: String, national_number: String) -> { valid: Boolean, reason: String | null }

## Reason Codes
UNKNOWN_COUNTRY, CHARSET, TOO_SHORT, TOO_LONG, PATTERN, NOT_ASSIGNED
Basic adapter emits first 4 only. Libphonenumber adapter emits all 6.

## Exported Functions (10 total)

### Sanitization
sanitizeNumber(number) -> String | async:no - strip non-digit chars from national number, '' for null/undefined
sanitizeFullNumber(phone) -> String | async:no - strip non-digit and non-plus chars from full number, '' for null/undefined

### Predicates
isKnownCountry(country_code) -> Boolean | async:no - true if country is in adapter known list, case-insensitive

### Lookups
listCountries() -> { success, countries, error } | async:no - always succeeds, countries from adapter
getCountryMetadata(country_code) -> { success, metadata, error } | async:no - metadata or UNKNOWN_COUNTRY error

### Validation
validateNumber(country_code, national_number) -> { success, error } | async:no - delegates to adapter, error.message carries reason code

### E.164 Format and Parse
formatE164(country_code, national_number) -> String | null | async:no - +calling_code + national_number, null if country unknown
parseE164(e164_number) -> { country_code, national_number } | null | async:no - anchored longest-match-first parse, null if no match

### Phone ID Create and Parse
createPhoneId(country_code, national_number) -> String | null | async:no - reversed(national_number) + '.' + country_code, null if empty
parsePhoneId(phone_id) -> { country_code, national_number } | null | async:no - splits on first '.', reverses number back, null if malformed

## Patterns
- **Adapter-swappable:** Core holds no country data. Adapter supplies all country-specific logic. Swap adapters to change validation depth without touching call sites
- **Throw vs return:** Programmer errors (missing adapter, bad config) throw Error at loader time. Validation failures return { success, error } envelopes. Never mixed
- **Phone ID encoding:** reversed(national_number) + '.' + country_code. Reversal distributes sequential numbers across partitioned key space. Separator '.' collides with nothing (auth reserves '-' and '#'). Storage convention, not display format
- **E.164 parse longest-match-first:** Candidates sorted by calling code length descending so +91 matches IN before +9 could match a shorter code. Anchored to string start to fix recurring-digit ambiguity
- **Shared calling code:** parseE164 returns first match when countries share a calling code (e.g. US and CA both use 1). Use phone ID or user-provided country code for unambiguous identification
- **Country code lowercasing:** All public functions lowercase country codes before passing to adapter. Callers can pass 'US' or 'us' interchangeably
