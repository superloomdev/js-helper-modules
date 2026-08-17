# helper-contact-phone

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![Node.js 24+](https://img.shields.io/badge/Node.js-24%2B-brightgreen.svg)](https://nodejs.org)

Phone number validation, sanitization, and E.164 formatting with swappable adapter depth. Part of [Superloom](https://superloom.dev).

## What This Is

A phone number helper that validates, sanitizes, formats, and parses national and international phone numbers. The core holds no country data. A required adapter supplies calling codes, length bounds, and validation logic. The caller chooses adapter depth at the composition root.

Ten functions cover sanitization (strip disallowed characters), predicates (is a country known), lookups (list countries, get metadata), validation (check a number against adapter rules), E.164 formatting and parsing, and phone ID creation and parsing for storage layers.

## Architecture Overview

The module is a factory. Each loader call wires a dependency container (`Lib`) and a ready-to-use adapter into an independent `ContactPhone` interface. The core never imports country data directly.

```
Lib (Utils, Debug)
  |
  v
loader(Lib, { Adapter })
  |
  +-- validateConfig(CONFIG)          -- throws if Adapter is missing
  +-- validateAdapterContract(adapter) -- throws if contract methods are missing
  |
  v
ContactPhone interface
  |
  +-- sanitizeNumber / sanitizeFullNumber   (pure string cleaning)
  +-- isKnownCountry                         (delegates to adapter.listCountries)
  +-- listCountries / getCountryMetadata     (delegates to adapter)
  +-- validateNumber                         (delegates to adapter.validateNumber)
  +-- formatE164 / parseE164                 (uses adapter.getMetadata, adapter.listCountries)
  +-- createPhoneId / parsePhoneId           (pure string transform, no adapter)
```

The adapter is the only source of country data. Swapping adapters changes validation depth without touching the core or the call sites.

## Validation Adapters

Two adapter packages are available, each implementing the same 3-method contract (`listCountries`, `getMetadata`, `validateNumber`):

- **helper-contact-phone-adapter-basic.** A lean adapter with a static country table. Checks country existence, digit charset, and length bounds. Emits four reason codes: `UNKNOWN_COUNTRY`, `CHARSET`, `TOO_SHORT`, `TOO_LONG`. Suitable for browser bundles where bundle size matters more than validation depth.

- **helper-contact-phone-adapter-libphonenumber.** An adapter backed by Google's libphonenumber library. Adds number pattern matching and assigned-range checks on top of the basic checks. Emits all six reason codes including `PATTERN` and `NOT_ASSIGNED`. Suitable for server-side validation where accuracy matters more than bundle size.

The caller constructs the chosen adapter first, then passes the ready-to-use object as `Adapter` to the phone module loader.

## Why Use This Module

- **Swappable validation depth.** The same core works with a 5 KB basic adapter in the browser or a full libphonenumber adapter on the server. The call sites do not change.

- **No country data in the core.** The core module stays small. Country data lives in the adapter, which is chosen and constructed at the composition root.

- **Pre-tested at every release.** A full test suite runs in CI on every push. Tests use a stub adapter with a known country set, so they exercise the core without depending on any real adapter package.

- **Designed for human review.** The code is laid out as clearly-marked visual sections (section banners, short functions, scoped comments) so a reviewer can read it top to bottom in order. Open `phone.js` to see the structure.

## Aligned with Superloom Philosophy

If a project is built on Superloom conventions (the same loader pattern, the same `Lib` container, the same testing model), this module slots in without requiring anything new. It depends on `helper-utils` and `helper-debug` as peers, the same foundation every other Superloom helper uses.

For projects not yet using Superloom, the principles are documented at [superloom.dev](https://superloom.dev).

## Extended Documentation

- [API reference](https://github.com/superloomdev/superloom/blob/main/src/helper-modules-core/js-helper-contact-phone/docs/api.md) - every exported function with its signature, parameters, return shape, and worked examples
- [Configuration](https://github.com/superloomdev/superloom/blob/main/src/helper-modules-core/js-helper-contact-phone/docs/configuration.md) - the adapter contract, reason codes, peer dependencies, and testing tier
- [Schemas](https://github.com/superloomdev/superloom/blob/main/src/helper-modules-core/js-helper-contact-phone/docs/schemas.md) - adapter contract schema, return envelope shapes, and throw-versus-return discipline
- [Data Model](https://github.com/superloomdev/superloom/blob/main/src/helper-modules-core/js-helper-contact-phone/docs/data-model.md) - phone ID encoding, E.164 format, and the shared calling code limitation
- [Superloom](https://superloom.dev) - the framework

## Integration

Install this module as a peer dependency in the project's `package.json` and load it through the standard Superloom loader. Do not vendor the source or use it as a local file dependency. The published package is the supported integration path.

The loader pattern, including the full `Lib` container shape, is documented in [Server Loader Architecture](https://github.com/superloomdev/superloom/blob/main/docs/server/server-loader.md). For one-time GitHub Packages registry setup, see the [npmrc setup guide](https://github.com/superloomdev/superloom/blob/main/docs/dev/npmrc-setup.md).

## Dependencies

This module has no direct dependencies. It expects two peer modules in the `Lib` container: `helper-utils` (type checks and null guards) and `helper-debug` (structured logging).

One adapter package must be installed and constructed separately. The adapter packages are declared as optional peer dependencies because the caller chooses which one to use.

## Testing Status

| Tier | Runtime | Status |
|---|---|---|
| Unit | Node.js `node --test` | [![Test](https://github.com/superloomdev/superloom/actions/workflows/ci-helper-modules.yml/badge.svg?branch=main)](https://github.com/superloomdev/superloom/actions/workflows/ci-helper-modules.yml) |

Tests use a stub adapter with a known country set. No Docker, no service required. Test runtime details live in [Configuration](https://github.com/superloomdev/superloom/blob/main/src/helper-modules-core/js-helper-contact-phone/docs/configuration.md#testing-tiers).

## License

MIT
