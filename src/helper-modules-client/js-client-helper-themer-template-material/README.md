# @superloomdev/js-client-helper-themer-template-material

Material Design 3 values for the Superloom token contract: Material's schemes generated from the pinned upstream packages named in `reference`, mapped onto Superloom's keys through `data/mapping.js`. Material's own token names do not appear outside that mapping table. Data only: no loader, no React, no side effects. Values are canonical and unit-free; `meta` is attached so `Themer.buildTheme(profile.schemes.light, layers, 'native')` emits every group correctly. Keys Material has no concept for are completed from the Superloom base template and listed in `from_base`. Structure knobs carry Material's canonical values (shape scale, elevation levels as two-layer shadows, state-layer opacities, surface tint); a brand layer may override them.

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
node scripts/generate.js
```

Reads pinned `@material/web@2.5.0` SCSS token files and `@material/material-color-utilities@0.4.0` scheme generation, maps through `data/mapping.js`, completes from the base template, and writes six scheme files to `data/`.

### Provenance

Every generated scheme carries a `provenance` object recording the base template identity:

| Field | Description |
|---|---|
| `base_version` | The base template package version used for completion |
| `base_shasum` | The distribution shasum of the installed base template |
| `generator_schema` | The generator schema revision |

The generator verifies the installed base shasum matches the registry shasum before writing. A mismatch aborts generation. After a same-version base republish, regenerate all six schemes and republish Material at the same version; every consumer lockfile must be refreshed.

## License

MIT. See `NOTICE` for Material Design 3 attribution.
