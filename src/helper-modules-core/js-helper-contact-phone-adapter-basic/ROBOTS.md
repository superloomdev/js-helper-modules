# helper-contact-phone-adapter-basic - AI Agent Reference

## Module Type
Adapter module for `helper-contact-phone`. Stateless, synchronous, no runtime dependencies. Carries a generated 20 KB country data table.

## Peer Dependencies
- `helper-utils` - type checks and validation helpers
- `helper-debug` - structured logging

## Direct Dependencies
None. `libphonenumber-js` is a devDependency used only by the generation script.

## Loader Pattern (Factory)

```javascript
const adapter = require('helper-contact-phone-adapter-basic')(Lib, {});
```

`shared_libs` provides `Lib.Utils` and `Lib.Debug`, injected by the parent at load time. `config` is merged over defaults from `adapter.config.js` (empty). Each call returns an independent adapter object.
Companion files: `adapter.config.js` (empty defaults), `adapter.errors.js` (empty frozen catalog), `adapter.validators.js` (no-op `validateConfig`).

## Config Keys
None. The country data is generated and committed.

## Data Source
- Source: `libphonenumber-js/metadata.min.json` (MIT license)
- Generator: `_data/generate.js` (`npm run generate`)
- Output: `basic.country-data.js` (20 KB, committed, frozen)
- No runtime dependency on `libphonenumber-js`

## Adapter Contract (3 methods)

listCountries() -> [String]
getMetadata(country_code) -> { calling_code, min_length, max_length } | null
validateNumber(country_code, national_number) -> { valid: Boolean, reason: String | null }

## Reason Codes

| Code | Meaning |
|---|---|
| UNKNOWN_COUNTRY | Country code not in the data table |
| CHARSET | National number contains non-digit characters |
| TOO_SHORT | National number shorter than the country min_length |
| TOO_LONG | National number longer than the country max_length |

Never emits: PATTERN, NOT_ASSIGNED (reserved for the libphonenumber adapter).

## Patterns
- **Stateless:** No module-level state after construction. The country table is a frozen constant shared across all instances
- **Structural validation only:** Checks country existence, charset (digits only), and length bounds. No pattern matching, no assignment-status lookup
- **Hot-swappable:** Same 3-method contract as the libphonenumber adapter. The parent core calls the same methods regardless of which adapter is loaded
- **Generated data:** Country table is built ahead of time from libphonenumber-js metadata and committed. Consumers ship the static file, not the generator
