# Configuration - helper-contact-phone-adapter-basic

## Loader Pattern

```javascript
import contactPhoneAdapterBasic from 'helper-contact-phone-adapter-basic';
import contactPhone from 'helper-contact-phone';

const Adapter = contactPhoneAdapterBasic(Lib, {});
Lib.ContactPhone = contactPhone(Lib, { Adapter });
```

## Peer Dependencies

| Peer | Why |
|---|---|
| `helper-utils` | Type-checking primitives |

## Direct Dependencies

None. Country data is generated at build time and committed as a static JavaScript object.

## Config Keys

| Key | Type | Default | Description |
|---|---|---|---|
| `NATIONAL_NUMBER_REGEX` | `RegExp` | `/^[0-9]+$/` | Regex for valid national number characters (digits only) |

## Data Source

Country data is generated from `libphonenumber-js` min metadata, which is sourced from Google's PhoneNumberMetadata.xml.

- **Build-time devDependency:** `libphonenumber-js`
- **Generated file:** `data/basic.country-data.json` (~20 KB, committed)
- **Re-run:** `npm run generate`
- **Countries:** 245 (all ISO 3166-1 countries in Google's metadata)
- **Fields per country:** `calling_code`, `min_length`, `max_length`
- **max_length cap:** Capped at `15 - calling_code.length` to stay within E.164

The generated file is committed so consumers need no build step. Metro and other bundlers see a static `createRequire(import.meta.url)` call with no dynamic resolution.

## Testing Tiers

| Tier | Runtime | Status |
|---|---|---|
| Unit | Node.js `node --test` | CI on every push |

No Docker, no external service required.
