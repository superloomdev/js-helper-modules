# ROBOTS.md - js-client-helper-themer-template-base

## Type

Class G data pack, default export frozen profile `{ id: 'superloom-base', contract_version, schemes: { light, dark } }`.

## Peer dependencies

None.

## Hand-picked values

The one hand-picked value is `color.interactive` (and the button, link, and focus keys that alias it). Every other value is derived or an identity default.

## Regeneration

`node scripts/generate.js` (dev only) must produce no diff. Tests assert the full contract key count, contract validity with `required` equal to every key, contrast of every text-on-background pair under `contrast: 'report'`, unit gate, engine build.

## Exports

- `.` -> `./template.js`
- `./package.json` -> `./package.json`
