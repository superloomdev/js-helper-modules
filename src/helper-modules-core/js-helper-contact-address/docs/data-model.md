# Data Model - helper-contact-address

## Country Code

ISO 3166-1 alpha-2, lowercase. Same standard as the phone and email families.

## Subdivision

ISO 3166-2 subdivision code or free text. The basic adapter does not validate subdivisions (always returns valid). The extended adapter checks against a list from `iso-3166-2`.

## Postal Code

Country-dependent. Some countries have no postal system (e.g., `ae`). The basic adapter checks length bounds only. The extended adapter checks regex patterns from `postal-code-checker`.

## Tag

String enum: `home`, `work`, `other`. Not integers (departure from CTP).

## Coordinates

`{ latitude, longitude }` in decimal degrees. Range-checked in-module: latitude -90 to 90, longitude -180 to 180. The legacy module delegated this to `Lib.GeoInput`; that dependency is dropped.

## Metadata

Free-form object for storing raw geocoder responses, place IDs, or any extra data the application wants to preserve.

## Geocoding

Geocoding and reverse geocoding are out of scope. This module holds shape and validation only.
