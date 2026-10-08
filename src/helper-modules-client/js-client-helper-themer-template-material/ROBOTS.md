# ROBOTS.md

## @superloomdev/js-client-helper-themer-template-material

Type: Class G data pack, default export frozen profile `{ id: 'material-v0_192', contract_version, reference, schemes: { light, dark, light_medium_contrast, light_high_contrast, dark_medium_contrast, dark_high_contrast } }`.

Peer dependencies: none.

`mapping` export: a frozen object keyed by Material domain (`color`, `type`, `motion`, `shape`, `elevation`, `state`, `tint`) whose values map each Material token name to a Superloom key or `null`.

`absent` export: the list of Material upstream tokens deliberately not mapped, with one reason each.

Regeneration: `npm run generate` (dev only) must produce no diff; `npm run sync-icon-map` refreshes `scripts/icon-map.json` from `rnw-components-v2/data/icons.json`.

Tests assert: the full contract key count (763 at contract version 5, every role-grid cell from Material's component tokens, none from the default), contract validity with `required` equal to every key, parity oracle values, expressive springs (D19), Material's six `anatomy.*` values, 80 valid `icon.*` literals (79 from Material Symbols (outlined) with provenance, unit gate, engine build with two-layer shadows, the engine's role audit (`auditRoles`) on every scheme, brand layer, and byte-identical regeneration.
