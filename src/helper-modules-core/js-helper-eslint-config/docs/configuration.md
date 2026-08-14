# Configuration. `helper-eslint-config`

Peer dependencies, consumer setup, and preset assignment. For the rule reference see [API Reference](https://github.com/superloomdev/superloom/blob/main/src/helper-modules-core/js-helper-eslint-config/docs/api.md).

This is a dev tooling package, not a runtime module. It has no loader pattern, no config keys, and no service dependency. The page exists for shape consistency with other Superloom modules.

## On This Page

- [Peer Dependencies](#peer-dependencies)
- [Consumer Setup](#consumer-setup)
- [Preset Assignment](#preset-assignment)
- [Testing Tiers](#testing-tiers)

---

## Peer Dependencies

| Package | Version |
|---|---|
| `eslint` | `^10.2.0` |
| `@eslint/js` | `^10.0.1` |

Consumers already install both packages as devDependencies. The peer declaration ensures version compatibility without duplicating them in the dependency tree.

## Consumer Setup

Add to `devDependencies` in the module's `package.json`:

```json
"devDependencies": {
  "@superloomdev/js-helper-eslint-config": "^1.0.0",
  "eslint": "^10.2.0",
  "@eslint/js": "^10.0.1"
}
```

Then replace the module's `eslint.config.js` with:

```javascript
const { base } = require('@superloomdev/js-helper-eslint-config');

module.exports = base;
```

Use `browser` instead of `base` for modules that need DOM globals. Use `app` for application repos with ESM and JSX.

No per-module rule overrides are permitted. If a module cannot pass the shared config, the finding goes to the retrospective, not to a local override.

## Preset Assignment

| Preset | Targets |
|---|---|
| `base` | All 55 modules except `js-client-helper-font-ext-web`; plus `codebase-demo-server-js` directories |
| `browser` | `js-client-helper-font-ext-web` |
| `app` | `codebase-demo-client-rnw` |

## Testing Tiers

| Tier | Runtime | Status |
|---|---|---|
| Unit | Node.js `node --test` | Passing |

The test suite asserts the exported shape: preset keys, array lengths, ignore patterns, rule values, globals, and the presence of all 11 safety rules. No external service or Docker container is required.
