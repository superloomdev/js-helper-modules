# Configuration - helper-contact-address-adapter-basic

## Loader Pattern

```javascript
import contactAddressAdapterBasic from 'helper-contact-address-adapter-basic';
import contactAddress from 'helper-contact-address';

const Adapter = contactAddressAdapterBasic(Lib, {});
Lib.ContactAddress = contactAddress(Lib, { Adapter });
```

## Peer Dependencies

| Peer | Why |
|---|---|
| `helper-utils` | Type-checking primitives |

## Direct Dependencies

None.

## Data Source

Postal code length bounds generated from libphonenumber-js (country list) and hard-coded postal length data. 245 countries. ~20 KB. Re-run: `npm run generate`.
