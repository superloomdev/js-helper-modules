# ROBOTS.md - js-client-helper-themer-template-carbon

## Type

Class G data pack, default export frozen profile `{ id, contract_version, reference, schemes }`.

## Peer dependencies

None.

## Export shape

`schemes.<name>` is `{ polarity, scales, tokens, meta, from_default, provenance }`; `from_default` is a sorted array of key strings and never contains a `stacking.*`, `anatomy.*` or `icon.*` key; `provenance.icons` is `{ package, version, map_source, map_sha256 }`.

## Regeneration

`npm run generate` (dev only) must produce no diff; `npm run sync-icon-map` refreshes `scripts/icon-map.json` from `rnw-components-v2/data/icons.json`. Tests assert the full contract key count per scheme (490 at contract version 5, including the `control.*` roles from Carbon's own layout scale), contract validity, oracle parity, `from_default` correctness, Carbon's six `anatomy.*` values, 78 valid `icon.*` literals from `@carbon/icons` with size variants and provenance, unit gate, engine build.
