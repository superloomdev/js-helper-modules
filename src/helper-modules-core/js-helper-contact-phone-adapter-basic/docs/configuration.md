# Configuration. `helper-contact-phone-adapter-basic`

Loader pattern, data source, dependency notes, and testing tier. For the function reference see [API Reference](https://github.com/superloomdev/superloom/blob/main/src/helper-modules-core/js-helper-contact-phone-adapter-basic/docs/api.md).

This page is intentionally short. The basic adapter accepts no configuration keys, reads no environment variables, and carries no runtime dependencies. The country data is generated ahead of time and committed to the repository. The page exists for shape consistency: every Superloom module ships a `docs/configuration.md` so contributors and AI tooling can find the loader pattern and runtime details in the same place across the framework.

## On This Page

- [Loader Pattern](#loader-pattern)
- [Configuration Keys](#configuration-keys)
- [Environment Variables](#environment-variables)
- [Peer Dependencies](#peer-dependencies)
- [Direct Dependencies](#direct-dependencies)
- [Data Source](#data-source)
- [Testing Tiers](#testing-tiers)

---

## Loader Pattern

The module is a factory. Each loader call returns an independent adapter object with its own merged configuration captured in a closure. The adapter is stateless, so the closure holds only the four fixed slots (`Lib`, `CONFIG`, `ERRORS`, `Validators`) and nothing else.

```javascript
const adapter = require('helper-contact-phone-adapter-basic')(Lib, {});
```

Loader call semantics:

- **First argument: `Lib`.** The shared dependency container. The adapter reads `Lib.Utils` and `Lib.Debug` from it. These are injected by the parent module (`helper-contact-phone`) at load time.
- **Second argument: config overrides.** Merged on top of the built-in defaults from `adapter.config.js` (currently empty). The merged config is validated by `Validators.validateConfig` at startup (currently a no-op). Pass `{}` to use defaults unchanged.
- **Multiple loader calls return independent adapter objects.** Two adapters in the same process share the same frozen country data table but hold separate closure slots.

---

## Configuration Keys

None. The adapter ships `adapter.config.js` with an empty defaults object. The country data is generated and committed, so there is nothing to configure at runtime. The second argument to the loader is merged over these defaults and validated by `Validators.validateConfig` (a no-op). No config keys are defined.

---

## Environment Variables

None. The module never reads `process.env`.

---

## Peer Dependencies

The adapter declares two peer dependencies in its `package.json`. These are provided by the parent module (`helper-contact-phone`) through the `Lib` container at load time.

| Peer | Package | Purpose |
|---|---|---|
| `helper-utils` | `@superloomdev/js-helper-utils` | Type checks and validation helpers |
| `helper-debug` | `@superloomdev/js-helper-debug` | Structured logging |

The adapter does not call `require()` on either peer at runtime. It receives them by reference from the injected `Lib` container, following the standard Superloom loader pattern.

---

## Direct Dependencies

None. The module's `package.json` declares no `dependencies`. The country data is generated ahead of time and committed as `basic.country-data.js`, so there is no runtime dependency on `libphonenumber-js`. The supply chain audit ends at this package.

`libphonenumber-js` is a `devDependency` only, used by the generation script at build time. It is not shipped to consumers.

---

## Data Source

The country data table (`basic.country-data.js`) is generated from `libphonenumber-js` metadata, not fetched at runtime.

| Property | Value |
|---|---|
| Source file | `libphonenumber-js/metadata.min.json` |
| Source license | MIT |
| Source of truth | Google PhoneNumberMetadata.xml |
| Generator script | `_data/generate.js` |
| Output file | `basic.country-data.js` |
| Output file size | 20 KB (under the 40 KB limit) |
| Generation command | `node _data/generate.js` (or `npm run generate`) |

The generator reads `metadata.min.json`, extracts the calling code and possible-lengths array for each country, derives `min_length` and `max_length` from the array, and writes a frozen object to `basic.country-data.js`. The output file is committed to the repository. Consumers never run the generator; they receive the committed file.

To refresh the data file (for example, after a `libphonenumber-js` metadata update), run the generator from the package root:

```bash
npm run generate
```

The generator prints the country count and file size on completion. The committed file should be reviewed in the pull request that updates it.

---

## Testing Tiers

The module ships a single test tier:

| Tier | Runtime | When to run | CI Status |
|---|---|---|---|
| **Unit** | Node.js `node --test` | Every commit, every CI run | [![Test](https://github.com/superloomdev/superloom/actions/workflows/ci-helper-modules.yml/badge.svg?branch=main)](https://github.com/superloomdev/superloom/actions/workflows/ci-helper-modules.yml) |

There is no Docker container, no service emulator, and no integration tier. Tests exercise the adapter contract directly (country listing, metadata lookup, number validation across multiple countries and both length boundaries) and through the parent phone core.

```bash
cd _test && npm install && npm test
```

The test runner uses Node's built-in test framework (`node --test` plus `node:assert/strict`). Test runtime is sub-second. The suite includes an explicit assertion that the adapter never emits `PATTERN` or `NOT_ASSIGNED`.

For the framework-wide testing architecture see [Module Testing](https://github.com/superloomdev/superloom/blob/main/docs/testing/module-testing.md).
