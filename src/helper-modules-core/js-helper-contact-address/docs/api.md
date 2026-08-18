# API Reference - helper-contact-address

## Overview

Postal address validation and field policy management. Port module requiring a swappable adapter for postal code and subdivision validation depth.

## Loader

```javascript
const Adapter = require('helper-contact-address-adapter-basic')(Lib, {});
Lib.ContactAddress = require('helper-contact-address')(Lib, { Adapter });
```

## Exported Functions (6 total)

| Function | Signature | Returns |
|---|---|---|
| `sanitizePostalCode` | `sanitizePostalCode(postal_code)` | `String` |
| `validateSyntax` | `validateSyntax(field_name, value, context)` | `{ success, error }` |
| `validateAddress` | `validateAddress(data)` | `{ success, errors, error }` |
| `createAddress` | `createAddress(data)` | `Object` |
| `listSubdivisions` | `listSubdivisions(country_code)` | `{ success, subdivisions, error }` |
| `getFieldPolicy` | `getFieldPolicy()` | `Object` |

## Address Data Structure

```
{
  line_1:       String          // primary street address
  line_2:       String          // apartment, suite, unit (optional)
  landmark:     String          // nearby landmark (optional)
  locality:     String          // city, town, village
  subdivision:  String          // state, province, region
  postal_code:  String          // ZIP or postal code
  country:      String          // ISO 3166-1 alpha-2, lowercase
  coordinates:  { latitude, longitude }   // decimal degrees (optional)
  label:        String          // user-assigned label (optional)
  tag:          String          // enum: 'home', 'work', 'other' (optional)
  metadata:     Object          // free-form (optional)
}
```

## Field Policy

Two states only: `required` and `optional`. No `hidden` state. UI visibility is an application concern.

## Tags

String enum: `home`, `work`, `other`. Not integers.

## Coordinates

`{ latitude, longitude }` in decimal degrees. Range-checked: latitude -90 to 90, longitude -180 to 180.

## Error Codes

| Type | Message |
|---|---|
| `CONTACT_ADDRESS_EMPTY` | Required field is empty |
| `CONTACT_ADDRESS_TOO_SHORT` | Field value is too short |
| `CONTACT_ADDRESS_TOO_LONG` | Field value is too long |
| `CONTACT_ADDRESS_INVALID_FORMAT` | Field value does not match the expected format |
| `CONTACT_ADDRESS_INVALID_COUNTRY` | Country code is not recognized |
| `CONTACT_ADDRESS_INVALID_SUBDIVISION` | Subdivision code is not valid for this country |
| `CONTACT_ADDRESS_NO_POSTAL_SYSTEM` | This country does not use postal codes |
| `CONTACT_ADDRESS_INVALID_TAG` | Tag must be one of: home, work, other |
| `CONTACT_ADDRESS_INVALID_COORDINATES` | Coordinates must be { latitude, longitude } in decimal degrees |
