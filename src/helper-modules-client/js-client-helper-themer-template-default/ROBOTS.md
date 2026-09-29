# ROBOTS.md - js-client-helper-themer-template-default

## Type

Class G data pack, default export frozen profile `{ id: 'superloom-default', contract_version: 4, schemes: { light, dark } }`. Each scheme carries every contract token (469), including `anatomy.*` enums at their plainest value and 78 `icon.*` literals, plus `provenance.icons` `{ package, version, map_source, map_sha256 }`.

## Peer dependencies

None.

## Hand-picked values

The one hand-picked value is `color.interactive` (and the button, link, and focus keys that alias it). Every other value is derived or an identity default, except the icon glyphs, which are Carbon's (`@carbon/icons@11.89.0`, redistributed under Apache-2.0 per `NOTICE`) until the Superloom set exists.

## Regeneration

`npm run generate` (dev only) must produce no diff; `npm run sync-icon-map` refreshes `scripts/icon-map.json` from `rnw-components-v2/data/icons.json`. Tests assert the full contract key count, contract validity with `required` equal to every key, contrast of every text-on-background pair under `contrast: 'report'`, the anatomy values, every icon literal valid with size variants and provenance, unit gate, engine build, byte-identical regeneration.

## Exports

- `.` -> `./template.js`
- `./package.json` -> `./package.json`
