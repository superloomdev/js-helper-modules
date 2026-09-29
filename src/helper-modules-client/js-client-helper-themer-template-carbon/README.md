# @superloomdev/js-client-helper-themer-template-carbon

Carbon Design System v11 values for the Superloom token contract: four complete templates (`white`, `g10`, `g90`, `g100`) generated from the pinned upstream packages named in `reference`. Data only: no loader, no React, no side effects. Values are canonical and unit-free; `meta` is attached so `Themer.buildTheme(profile.schemes.white, layers, 'native')` emits every group correctly. Structure knobs carry Carbon's canonical values, the `anatomy.*` enums carry Carbon's shape choices (`label: above`, `switch_handle: fixed`, `status_marker: bar_icon`, `dialog_actions: stretched`, `caret: shown`, `slider_handle: round`), and the 78 `icon.*` literals are Carbon's own glyphs from pinned `@carbon/icons@11.89.0`, with the set's 16, 20 and 24 pixel variants under `sizes`; a brand layer may override any of them.

Each scheme is complete. Keys that Carbon does not define (for example `state.*`, `tint.*`, `motion.spring_*`, and the weights Carbon's type sets do not use) are copied from `@superloomdev/js-client-helper-themer-template-default` at generation time and listed in `schemes.<name>.from_default`. Nothing in this package is a fallback chosen by a component; every value is data you can read.

## Installation

```
npm install @superloomdev/js-client-helper-themer-template-carbon
```

## Usage

```js
import profile from '@superloomdev/js-client-helper-themer-template-carbon';

// profile is frozen: { id, contract_version, reference, schemes }
const built = Themer.buildTheme(profile.schemes.white, [], 'native');
```

## Generator

```bash
npm install
npm run sync-icon-map   # refresh scripts/icon-map.json from rnw-components-v2/data/icons.json
npm run generate
```

The semantic-name -> glyph table is authored once in the component library; `scripts/icon-map.json` is this package's committed snapshot of its Carbon column, and every scheme's `provenance.icons` records the `@carbon/icons` version and the source table's sha256.

## License

MIT; see NOTICE for Carbon upstream attribution (design tokens and icons).
