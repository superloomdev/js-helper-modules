# @superloomdev/js-client-helper-themer-template-base

The neutral Superloom base template: every contract key with a derived or default value, in `light` and `dark`. Reference theme packages complete their schemes from it and list what they took in `from_base`. Nothing here belongs to any design system. Colors are `rampStep` rules over a neutral ramp, type sets are `stepPairIncrement` generators, spacing is `miniUnit`; the structure knobs are identity defaults (a radius named `radius_04` is 4, state-layer opacities are 0, surface tint is 0). Build it directly with `Themer.buildTheme(profile.schemes.light, layers, 'native')` to see Superloom with no design system on top.

## Installation

```
npm install @superloomdev/js-client-helper-themer-template-base
```

## Usage

```js
import profile from '@superloomdev/js-client-helper-themer-template-base';

// profile is frozen: { id, contract_version, schemes: { light, dark } }
// Each scheme is a complete Themer template with every contract key.

const built = Themer.buildTheme(profile.schemes.light, [], 'native');
```

## What this package is

- **Data only**: no loader, no React, no side effects.
- **Every contract key** (379 at contract version 2) has a value.
- **Derived where possible**: colors from `rampStep`, type sets from `stepPairIncrement`, spacing from `miniUnit`.
- **Literals where the engine cannot derive**: sixteen durations (integers from a geometric run 70 to 700), six springs (physics from Compose `StandardMotionTokens`), and the one hand-picked color `#0f62fe` for `interactive`/`focus` and their aliases.
- **Regeneration**: `node scripts/generate.js` (dev only) must produce no diff.

## License

MIT
