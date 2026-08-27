# @superloomdev/js-helper-eslint-config

Shared ESLint flat configuration presets for Superloom modules and applications. Zero runtime dependencies. Dev tooling package, not a runtime module.

## Type

Dev tooling. No runtime tier, no loader pattern, no service dependency.

## Peer Dependencies

- `eslint` ^10.2.0
- `@eslint/js` ^10.0.1

## Direct Dependencies

None.

## Exported Presets (3 total)

### `base`
Node 24 baseline. Array of 3 config objects: ignores, `js.configs.recommended`, and the rule set with Node 24 globals. Used by all server and core modules, plus most client modules.

### `browser`
Base plus browser globals (`document`, `window`, `localStorage`, `sessionStorage`, `navigator`, `location`). Array of 4 config objects. Used by `js-client-helper-font-ext-web` only.

### `app`
ESM plus JSX plus browser globals. For application repos (`codebase-demo-client-rnw`). Phase F of the rollout plan finalizes this preset.

## Consumer Pattern

```javascript
import { base } from '@superloomdev/js-helper-eslint-config';

export default base;
```

No per-module rule overrides are permitted. A module's `eslint.config.js` is exactly the three lines above (or the `browser` / `app` variant).

## Gotchas

- **The package must never import itself by name.** Its own `eslint.config.js` imports from `./eslint-config.js`, not the package name.
- **`no-multiple-empty-lines` is set to `max: 3`**, not `max: 2`. The value 3 codifies the house 3/2/1 banner spacing. Setting it to 2 would flag 202 sites across 48 modules.
- **`no-unused-vars` has no `argsIgnorePattern`.** Underscore-prefixed parameters are banned by `code-formatting.md`. Parity parameters that must be kept but are unused get an inline `// eslint-disable-line no-unused-vars`.

## Config Keys

None. This is a dev tooling package with no runtime configuration.
