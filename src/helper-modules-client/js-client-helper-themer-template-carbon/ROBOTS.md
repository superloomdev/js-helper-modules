# ROBOTS.md - js-client-helper-themer-template-carbon

## Type

Class G data pack, default export frozen profile `{ id, contract_version, reference, schemes }`.

## Peer dependencies

None.

## Export shape

`schemes.<name>` is `{ polarity, scales, tokens, meta, from_base }`; `from_base` is a sorted array of key strings.

## Regeneration

`node scripts/generate.js` (dev only) must produce no diff. Tests assert the full contract key count per scheme, contract validity, oracle parity, `from_base` correctness, unit gate, engine build.
