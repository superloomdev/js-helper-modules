# Configuration - helper-contact-address

## Loader Pattern

```javascript
const Adapter = require('helper-contact-address-adapter-basic')(Lib, {});
Lib.ContactAddress = require('helper-contact-address')(Lib, { Adapter });
```

## Peer Dependencies

| Peer | Why |
|---|---|
| `helper-utils` | Type-checking primitives |

## Direct Dependencies

None.

## Config Keys

| Key | Type | Default | Description |
|---|---|---|---|
| `FIELD_POLICY` | `Object` | See below | Required/optional per field |
| `FIELD_LENGTHS` | `Object` | See below | Min/max length per string field |
| `VALID_TAGS` | `Array` | `['home', 'work', 'other']` | Valid tag enum values |
| `LATITUDE_MIN` | `Number` | `-90` | Minimum latitude |
| `LATITUDE_MAX` | `Number` | `90` | Maximum latitude |
| `LONGITUDE_MIN` | `Number` | `-180` | Minimum longitude |
| `LONGITUDE_MAX` | `Number` | `180` | Maximum longitude |
| `POSTAL_SANITIZE_REGEX` | `RegExp` | `/[^a-zA-Z0-9 -]/g` | Characters stripped from postal code |

## Adapter Contract (5 methods)

| Method | Signature | Returns |
|---|---|---|
| `listCountries` | `listCountries()` | `[String]` |
| `getPostalRule` | `getPostalRule(country_code)` | `{ min_length, max_length, pattern, required }\|null` |
| `listSubdivisions` | `listSubdivisions(country_code)` | `[{ code, name }]\|null` |
| `validatePostalCode` | `validatePostalCode(country_code, postal_code)` | `{ valid, reason }` |
| `validateSubdivision` | `validateSubdivision(country_code, subdivision_code)` | `{ valid, reason }` |

## Available Adapters

| Adapter | Package | Depth |
|---|---|---|
| Basic | `helper-contact-address-adapter-basic` | Postal length bounds only. No subdivisions. |
| Extended | `helper-contact-address-adapter-extended` | Postal regex + subdivision lists. |
