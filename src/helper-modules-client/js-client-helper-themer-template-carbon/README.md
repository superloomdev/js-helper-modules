# @superloomdev/js-client-helper-themer-template-carbon

Carbon Design System v11 values for the Superloom token contract: four complete templates (`white`, `g10`, `g90`, `g100`) generated from the pinned upstream packages named in `reference`. Data only: no loader, no React, no side effects. Values are canonical and unit-free; `meta` is attached so `Themer.buildTheme(profile.schemes.white, layers, 'native')` emits every group correctly. Structure knobs carry Carbon's canonical values; a brand layer may override them.

Each scheme is complete. Keys that Carbon does not define (for example `state.*`, `tint.*`, `motion.spring_*`, and the weights Carbon's type sets do not use) are copied from `@superloomdev/js-client-helper-themer-template-base` at generation time and listed in `schemes.<name>.from_base`. Nothing in this package is a fallback chosen by a component; every value is data you can read.

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

## License

MIT; see NOTICE for Carbon upstream attribution.
