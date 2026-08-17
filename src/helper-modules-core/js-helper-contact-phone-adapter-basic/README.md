# helper-contact-phone-adapter-basic

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
|[![Node.js 24+](https://img.shields.io/badge/Node.js-24%2B-brightgreen.svg)](https://nodejs.org)

Lean phone adapter for `helper-contact-phone`. Carries a 20 KB country table with calling codes and length bounds. No national-prefix patterns. Part of [Superloom](https://superloom.dev).

## What This Is

A three-method adapter that supplies country data and structural phone-number validation to the `helper-contact-phone` core. The adapter carries a frozen, generated country table (calling code, minimum length, maximum length per country) and performs cheap checks: country existence, digit-only charset, and length bounds. It does not carry number-pattern rules or assignment-status databases. For authoritative validation, use the libphonenumber adapter instead.

The adapter exposes three methods: `listCountries`, `getMetadata`, and `validateNumber`. Validation produces one of four reason codes on failure: `UNKNOWN_COUNTRY`, `CHARSET`, `TOO_SHORT`, `TOO_LONG`. The adapter never emits `PATTERN` or `NOT_ASSIGNED`, those are reserved for the libphonenumber adapter.

The country table covers 200+ countries and territories, each mapped to its international calling code and national number length bounds.

## Why Use This Module

- **Lean for browser bundles.** The data file is 20 KB, well under the 40 KB limit. No runtime dependency on `libphonenumber-js`. The generation script reads metadata at build time and commits the output, so consumers ship a single static table and nothing else.

- **Safe structural validation.** Catches the common input errors (unknown country, non-digit characters, wrong length) without the weight of a full phone-number library. Enough for form validation and pre-submit checks where the goal is to reject obviously bad input, not to verify assignment.

- **Hot-swappable.** Implements the same three-method adapter contract as the libphonenumber adapter. The parent `helper-contact-phone` core calls `listCountries`, `getMetadata`, and `validateNumber` regardless of which adapter is loaded. Swap this adapter for the libphonenumber adapter by changing one line in the loader call, with no changes to calling code.

- **Pre-tested at every release.** A full test suite runs in CI on every push. The suite covers the adapter contract directly and through the phone core, across countries with different length rules, plus an explicit assertion that this adapter never emits `PATTERN` or `NOT_ASSIGNED`.

- **Designed for human review.** The code is laid out as clearly-marked visual sections (section banners, short functions, scoped comments) so a reviewer can read it top to bottom in order, use the section breaks as checkpoints, and finish without getting lost in dense logic. This matters most when an AI assistant is generating the change and a human still has to sign off on it. Open `adapter.js` to see the structure.

## Aligned with Superloom Philosophy

If a project is built on Superloom conventions (the same loader pattern, the same testing model), this adapter slots in without learning anything new. It is one of two phone adapters that ship with the framework, so adopting it preserves consistency with the rest of the codebase.

For projects not yet using Superloom, the principles are documented at [superloom.dev](https://superloom.dev).

## Extended Documentation

Extended documentation lives alongside the source on GitHub:

- [API reference](https://github.com/superloomdev/superloom/blob/main/src/helper-modules-core/js-helper-contact-phone-adapter-basic/docs/api.md) - the three-method adapter contract, parameters, return shapes, and reason codes
- [Configuration](https://github.com/superloomdev/superloom/blob/main/src/helper-modules-core/js-helper-contact-phone-adapter-basic/docs/configuration.md) - loader pattern, data source, peer dependencies, and testing tier
- [Superloom](https://superloom.dev) - the framework

## Adding to Your Project

This adapter is not installed on its own. It is a peer of `helper-contact-phone` and is loaded through the parent module's adapter slot. Install `helper-contact-phone` and select this adapter in the loader configuration. Do not vendor the source or use it as a local file dependency. The published package is the supported integration path.

The loader pattern, including the full `Lib` container shape and adapter selection, is documented in [Server Loader Architecture](https://github.com/superloomdev/superloom/blob/main/docs/server/server-loader.md). For one-time GitHub Packages registry setup, see the [npmrc setup guide](https://github.com/superloomdev/superloom/blob/main/docs/dev/npmrc-setup.md).

## Dependencies

This module has no direct runtime dependencies. The country data is generated and committed, so there is no runtime dependency on `libphonenumber-js`.

The data table is generated from `libphonenumber-js` metadata (MIT license) by `_data/generate.js` at build time. The output file (`basic.country-data.js`) is 20 KB, committed to the repository, and shipped as-is. Consumers never run the generator.

This module expects two peer modules in the `Lib` container, provided by the parent at load time:

| Peer | Purpose |
|---|---|
| `helper-utils` | Type checks and validation helpers |
| `helper-debug` | Structured logging |

## Testing Status

| Tier | Runtime | Status |
|---|---|---|
| Unit | Node.js `node --test` | [![Test](https://github.com/superloomdev/superloom/actions/workflows/ci-helper-modules.yml/badge.svg?branch=main)](https://github.com/superloomdev/superloom/actions/workflows/ci-helper-modules.yml) |

Test runtime details (no Docker, no service required) live in [Configuration - Testing Tiers](https://github.com/superloomdev/superloom/blob/main/src/helper-modules-core/js-helper-contact-phone-adapter-basic/docs/configuration.md#testing-tiers).

## License

MIT
