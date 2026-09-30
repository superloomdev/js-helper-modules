# @superloomdev/js-client-helper-themer-template-material

Material Design 3 values for the Superloom token contract: Material's schemes generated from the pinned upstream packages named in `reference`, mapped onto Superloom's keys through `data/mapping.js`. Material's own token names do not appear outside that mapping table. Data only: no loader, no React, no side effects. Values are canonical and unit-free; `meta` is attached so `Themer.buildTheme(profile.schemes.light, layers, 'native')` emits every group correctly. Keys Material has no concept for are completed from the polarity-matching scheme of the Superloom default template and listed in `from_default`; the completed color roles are `rampStep` rules, so every scheme carries an eleven-step `ramp` of its own neutral tonal palette (tones 99 to 10, light end first) for them to step along, and the tests assert that every scheme emits a value for all 490 tokens on both projections. One Material token may answer several Superloom roles (Material's primary is the filled button, the checked control and the link), and the `control.*` roles carry the geometry Material states for its own controls, read from the pinned component token files. Structure knobs carry Material's canonical values (shape scale, elevation levels as two-layer shadows, state-layer opacities, surface tint); a brand layer may override them.

## Schemes

Six schemes generated from `@material/material-color-utilities` `SchemeTonalSpot` at contrast levels 0, 0.5, and 1.0:

| Scheme | Polarity | Contrast level |
|---|---|---|
| `light` | light | 0 |
| `dark` | dark | 0 |
| `light_medium_contrast` | light | 0.5 |
| `light_high_contrast` | light | 1.0 |
| `dark_medium_contrast` | dark | 0.5 |
| `dark_high_contrast` | dark | 1.0 |

## Usage

```js
import profile from '@superloomdev/js-client-helper-themer-template-material';

const built = Themer.buildTheme(profile.schemes.light, [], 'native');
```

## Generator

```bash
npm install
npm run sync-icon-map   # refresh scripts/icon-map.json from rnw-components-v2/data/icons.json
npm run generate
```

Reads pinned `@material/web@2.5.0` SCSS token files and `@material/material-color-utilities@0.4.0` scheme generation, maps through `data/mapping.js`, converts the 78 Material Symbols glyphs named by `scripts/icon-map.json` from pinned `@material-symbols/svg-400@0.47.4` (outlined style) into `icon.*` literals, sets Material's shape choice on every `anatomy.*` enum (`label: floating`, `switch_handle: grows`, `status_marker: plain`, `dialog_actions: trailing`, `caret: hidden`, `slider_handle: bar`), completes the remaining keys from the default template, and writes six scheme files to `data/`. No `anatomy.*` or `icon.*` token is ever completed from the default template.

### Provenance

Every generated scheme carries a `provenance` object recording the default template identity:

| Field | Description |
|---|---|
| `default_version` | The default template package version used for completion |
| `default_shasum` | The distribution shasum of the installed default template |
| `generator_schema` | The generator schema revision (`v3`: contract version 5, control roles, role type sets and colors; `v2`: contract version 4, anatomy and icons) |
| `icons` | `{ package, version, style, map_source, map_sha256 }` - the Material Symbols package and style the glyphs came from, and the sha256 of the authored semantic-name table the snapshot was taken from |

The generator verifies the installed default shasum matches the registry shasum before writing. A mismatch aborts generation. After a same-version default template republish, regenerate all six schemes and republish Material at the same version; every consumer lockfile must be refreshed.

## License

MIT. See `NOTICE` for Material Design 3 and Material Symbols attribution.
