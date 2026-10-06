# @superloomdev/js-client-helper-themer-template-default

The neutral Superloom default template: every contract key with a derived or default value, in `light` and `dark`. Reference theme packages complete their schemes from it and list what they took in `from_default`. No value here is a design system's, with one declared exception: the `icon.*` tokens carry Carbon's glyphs (see below) until the Superloom icon set exists. Colors are `rampStep` rules over a neutral ramp plus four hand-picked hues (interactive, error, success, warning), type sets are `stepPairIncrement` generators, spacing is `miniUnit`; the structure knobs are identity defaults (a radius named `radius_04` is 4, state-layer opacities are 0, surface tint is 0); every `anatomy.*` enum holds its plainest value. Build it directly with `Themer.buildTheme(profile.schemes.light, layers, 'native')` to see Superloom with no design system on top.

## Installation

```
npm install @superloomdev/js-client-helper-themer-template-default
```

## Usage

```js
import profile from '@superloomdev/js-client-helper-themer-template-default';

// profile is frozen: { id, contract_version, schemes: { light, dark } }
// Each scheme is a complete Themer template with every contract key and a
// provenance record for its icon set.

const built = Themer.buildTheme(profile.schemes.light, [], 'native');
```

## What this package is

- **Data only**: no loader, no React, no side effects.
- **Every contract key** (490 at contract version 5) has a value; the `control.*` roles state the primary reference geometry (a 48 button, a 40 field, a 16 checkbox) so the neutral template draws the same controls as its seed.
- **Anatomy enums** at their plainest value: `label: above`, `switch_handle: fixed`, `status_marker: bar_icon`, `dialog_actions: stretched`, `caret: shown`, `slider_handle: round`.
- **Icons**: 78 `icon.*` literals generated from the pinned `@carbon/icons` package (Apache-2.0, see `NOTICE`), each `{ icon: true, viewBox, paths, sizes? }` with the set's own 16, 20 and 24 pixel glyphs under `sizes`. The semantic-name -> glyph table is authored once in the component library (`rnw-components-v2/data/icons.json`); `scripts/icon-map.json` is this package's committed snapshot of its column, and every scheme's `provenance.icons` records the package version and the source table's sha256.
- **Derived where possible**: colors from `rampStep`, type sets from `stepPairIncrement`, spacing from `miniUnit`.
- **Literals where the engine cannot derive**: sixteen durations (integers from a geometric run 70 to 700), six springs (physics from Compose `StandardMotionTokens`), and four hand-picked hues the ramp cannot derive: `#0f62fe` for `interactive`/`focus` and the roles that alias it (links, the primary and outlined buttons), and `#b91c1c`, `#15803d`, `#b45309` for `support_error`, `support_success` and `support_warning` (error text and the danger buttons alias the error hue; `support_info` is the interactive hue). A hue drawn as text or an icon on the dark page is its half mix toward the primary text, so it reads at 4.5:1 there; text and icons on a colored fill are white on both pages, the shadow is black at a third on both, and a filled secondary button is the ramp's dark gray on both so its white label reads. The press feedback is `highlight`, so the background state fills step off the page: hover one step, selected two, active and selected-hover three.
- **Regeneration**: `npm run generate` (dev only) must produce no diff; `npm run sync-icon-map` refreshes the mapping snapshot from the component library before a regeneration that changes icons.

## License

MIT
