# ROBOTS.md

## @superloomdev/js-client-helper-themer-template-material

Type: Class G data pack, default export frozen profile `{ id: 'material-v0_192', contract_version, reference, schemes: { light, dark, light_medium_contrast, light_high_contrast, dark_medium_contrast, dark_high_contrast } }`.

Peer dependencies: none.

`mapping` export: a frozen object keyed by Material domain (`color`, `type`, `motion`, `shape`, `elevation`, `state`, `tint`) whose values map each Material token name to a Superloom key or `null`.

`absent` export: the list of Material upstream tokens deliberately not mapped, with one reason each.

Regeneration: `node scripts/generate.js` (dev only) must produce no diff.

Tests assert: the full contract key count (379), contract validity with `required` equal to every key, parity oracle values, expressive springs (D19), unit gate, engine build with two-layer shadows, brand layer, and byte-identical regeneration.
