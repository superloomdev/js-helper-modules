# Configuration

## Package

```json
{
  "name": "@superloomdev/js-client-helper-themer-template-material",
  "version": "1.0.0",
  "type": "module",
  "exports": {
    ".": "./template.js",
    "./package.json": "./package.json"
  }
}
```

No `main` field. No peer dependencies. Dev dependencies pinned to `@material/web@2.5.0` and `@material/material-color-utilities@0.4.0`.

## Generator

`scripts/generate.js` reads the pinned Material packages, generates six color schemes via `SchemeTonalSpot` at contrast levels 0, 0.5, and 1.0, parses SCSS token files for type, motion, shape, state, and elevation values, maps through `data/mapping.js`, completes from the base template, and writes six scheme files to `data/`.

Run: `node scripts/generate.js [output-dir]`

## Structure knobs

Material's canonical values are written as literals:

- Shape: `corner-none` 0, `corner-extra-small` 4, `corner-small` 8, `corner-medium` 12, `corner-large` 16, `corner-extra-large` 28, `corner-full` 9999
- State: hover 0.08, focus 0.12, pressed 0.12, dragged 0.16, disabled container 0.12, disabled content 0.38
- Elevation: levels 0-5 at dp 0, 1, 3, 6, 8, 12 with two-layer shadow recipes
- Tint: levels 1-5 at 0.05, 0.08, 0.11, 0.12, 0.14
- Springs: expressive scheme from `ExpressiveMotionTokens.kt` (D19)
- Durations: 16 slots from 50ms to 1000ms
- Easings: 7 bezier curves (standard, emphasized, accelerate, decelerate, linear)

## Absent tokens

`data/absent.js` lists Material upstream tokens deliberately not mapped:
- `easing-m2*`: Material 2 compatibility curves
- Composite corners: anatomy, not design tokens
- `path`: null upstream
