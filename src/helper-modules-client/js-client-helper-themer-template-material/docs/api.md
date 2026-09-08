# API

## Default export

```js
import profile from '@superloomdev/js-client-helper-themer-template-material';
```

A frozen object:

| Field | Type | Value |
|---|---|---|
| `id` | string | `'material-v0_192'` |
| `contract_version` | number | `2` |
| `reference` | object | Package versions and token set version |
| `schemes` | object | Six scheme objects keyed by name |

## Scheme object

Each scheme (`light`, `dark`, `light_medium_contrast`, `light_high_contrast`, `dark_medium_contrast`, `dark_high_contrast`) is a frozen object:

| Field | Type | Description |
|---|---|---|
| `polarity` | string | `'light'` or `'dark'` |
| `scales` | object | `{ base_font_size, miniUnit, stepPairIncrement }` |
| `tokens` | object | 379 contract tokens, unit-free |
| `meta` | object | Contract metadata |
| `from_base` | string[] | Sorted keys completed from the base template |

## Reference metadata

```js
profile.reference = {
  material_web: '@material/web@2.5.0',
  material_color_utilities: '@material/material-color-utilities@0.4.0',
  token_set_version: 'v0_192',
  compose_material3_motion_tokens: 'ExpressiveMotionTokens.kt, androidx-main, read 2026-09-08'
};
```

## Data exports

- `data/mapping.js`: Material-to-Superloom token mapping table
- `data/absent.js`: Material upstream tokens deliberately not mapped
