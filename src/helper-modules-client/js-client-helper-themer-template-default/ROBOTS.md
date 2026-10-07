# ROBOTS.md - js-client-helper-themer-template-default

## Type

Class G data pack, default export frozen profile `{ id: 'superloom-default', contract_version: 5, schemes: { light, dark } }`. Each scheme carries every contract token (752), including `anatomy.*` enums at their plainest value, `control.*` roles at the primary reference geometry, every role-grid cell as an alias to the semantic token the part draws in, and 80 `icon.*` literals, plus `provenance.icons` `{ package, version, map_source, map_sha256 }`.

## Peer dependencies

None.

## Hand-picked values

The hand-picked values are four hues: `color.interactive` (and the button, link and focus keys that alias it) and `color.support_error`, `color.support_success`, `color.support_warning` (error text and the danger buttons alias the error hue; on the dark scheme a hue drawn as text is its half mix toward `text_primary`). Text and icons on a colored fill are white, the shadow is translucent black and the secondary button fill is the ramp's dark gray on both schemes. Every other value is derived or an identity default, except the icon glyphs, which are Carbon's (`@carbon/icons@11.89.0`, redistributed under Apache-2.0 per `NOTICE`) until the Superloom set exists.

## Regeneration

`npm run generate` (dev only) must produce no diff; `npm run sync-icon-map` refreshes `scripts/icon-map.json` from `rnw-components-v2/data/icons.json`. Tests assert the full contract key count, contract validity with `required` equal to every key, contrast of every text-on-background pair under `contrast: 'report'`, the engine's role audit (`auditRoles`) on both schemes, the anatomy values, every icon literal valid with size variants and provenance, unit gate, engine build, byte-identical regeneration.

## Exports

- `.` -> `./template.js`
- `./package.json` -> `./package.json`
