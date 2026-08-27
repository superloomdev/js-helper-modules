# Configuration - helper-contact-address-adapter-extended

## Loader Pattern

```javascript
import contactAddressAdapterExtended from 'helper-contact-address-adapter-extended';
import contactAddress from 'helper-contact-address';

const Adapter = contactAddressAdapterExtended(Lib, {});
Lib.ContactAddress = contactAddress(Lib, { Adapter });
```

## Peer Dependencies

| Peer | Why |
|---|---|
| `helper-utils` | Type-checking primitives |

## Direct Dependencies

None. Data is generated at build time.

## Data Source

Postal patterns and subdivision lists generated from `postal-code-checker`. Country list from `libphonenumber-js`. 245 countries, 174 with postal patterns, 24 with subdivisions. ~90 KB. Re-run: `npm run generate`.
