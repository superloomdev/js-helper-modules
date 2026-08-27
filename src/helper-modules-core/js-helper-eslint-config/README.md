# @superloomdev/js-helper-eslint-config

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![Node.js 24+](https://img.shields.io/badge/Node.js-24%2B-brightgreen.svg)](https://nodejs.org)

Shared ESLint flat configuration presets for Superloom modules and applications. Zero runtime dependencies. Part of [Superloom](https://superloom.dev).

## What This Is

A single published package exporting three ESLint flat-config presets: `base` (Node 24), `browser` (base plus DOM globals), and `app` (ESM plus JSX plus browser globals for application repos). Every Superloom module consumes one of these presets as a devDependency, replacing 59 hand-maintained `eslint.config.js` files that had drifted into 24 byte-distinct variants.

## Why Use This Module

- **Zero runtime dependencies.** Adding this module to a project adds zero packages to the dependency tree. `eslint` and `@eslint/js` are peer dependencies, already installed by every consumer.

- **One source of truth.** A rule change lands in one file and propagates to every module on the next install. No per-module overrides are permitted.

- **Codifies house style.** The rule set enforces the formatting and spacing conventions documented in `docs/languages/js/code-formatting.md`, including the 3/2/1 banner spacing (via `no-multiple-empty-lines: { max: 3 }`) and the ban on underscore-prefixed parameters (via `no-unused-vars: { args: 'after-used' }` with no `argsIgnorePattern`).

## Aligned with Superloom Philosophy

This module is a dev tooling package, not a runtime module. It carries the `js-helper-*` prefix to match the `detect` regex in the CI pipeline, but it has no runtime tier and no loader pattern. It is consumed as a devDependency only.

For projects not yet using Superloom, the principles are documented at [superloom.dev](https://superloom.dev).

## Extended Documentation

Extended documentation lives alongside the source on GitHub:

- [API reference](https://github.com/superloomdev/superloom/blob/main/src/helper-modules-core/js-helper-eslint-config/docs/api.md) - every exported preset with its rule set and globals
- [Configuration](https://github.com/superloomdev/superloom/blob/main/src/helper-modules-core/js-helper-eslint-config/docs/configuration.md) - peer dependencies, consumer setup, preset assignment

## Adding to Your Project

Install this module as a devDependency and select a preset in your `eslint.config.js`:

```javascript
import { base } from '@superloomdev/js-helper-eslint-config';

export default base;
```

For GitHub Packages registry setup, see the [npmrc setup guide](https://github.com/superloomdev/superloom/blob/main/docs/dev/npmrc-setup.md).

## Dependencies

This module has no runtime dependencies. It declares `eslint` and `@eslint/js` as peer dependencies, which consumers already install.

## Testing Status

| Tier | Runtime | Status |
|---|---|---|
| Unit | Node.js `node --test` | [![Test](https://github.com/superloomdev/js-helper-modules/actions/workflows/ci-publish-helper-modules.yml/badge.svg?branch=main)](https://github.com/superloomdev/js-helper-modules/actions/workflows/ci-publish-helper-modules.yml) |

## License

MIT
