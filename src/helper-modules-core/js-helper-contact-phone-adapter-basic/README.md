# helper-contact-phone-adapter-basic

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![Node.js 24+](https://img.shields.io/badge/Node.js-24%2B-brightgreen.svg)](https://nodejs.org)

Lean phone adapter for `helper-contact-phone`. Country calling codes and length bounds. No pattern validation, no number type. Part of [Superloom](https://superloom.dev).

## What This Is

The basic adapter for the contact-phone family. Provides a lean country table (~20 KB) with calling codes and national number length bounds, plus digit charset validation. No runtime third-party dependencies.

Choose this adapter when bundle size matters more than validation depth: browser builds, React Native apps, edge runtimes.

## Why Use This Adapter

- **~20 KB data.** Generated from `libphonenumber-js` metadata at build time. The generated file is committed, so consumers need no build step.
- **Zero runtime dependencies.** No `libphonenumber-js` in your bundle. The data is extracted at build time and shipped as a static JavaScript object.
- **Length + charset validation.** Catches typos and wrong-length inputs. Does not catch invalid digit patterns (use the extended adapter for that).
- **245 countries.** Every country recognized by Google's PhoneNumberMetadata.

## When to Choose Extended Instead

- You need digit pattern validation (e.g., Indian numbers must start with 6, 7, 8, or 9)
- You need number type classification (mobile vs fixed line)
- You are on a server where ~145 KB of metadata is acceptable

## Extended Documentation

- [API reference](https://github.com/superloomdev/js-helper-modules/blob/main/src/helper-modules-core/js-helper-contact-phone-adapter-basic/docs/api.md) - adapter contract methods
- [Configuration](https://github.com/superloomdev/js-helper-modules/blob/main/src/helper-modules-core/js-helper-contact-phone-adapter-basic/docs/configuration.md) - loader pattern, data source, testing
- [Superloom](https://superloom.dev) - the framework

## Adding to Your Project

```javascript
const Adapter = require('helper-contact-phone-adapter-basic')(Lib, {});
Lib.ContactPhone = require('helper-contact-phone')(Lib, { Adapter });
```

## Dependencies

This module has no runtime dependencies.

This module expects one peer module in the `Lib` container (Utils). For the full dependency breakdown, see [Configuration](https://github.com/superloomdev/js-helper-modules/blob/main/src/helper-modules-core/js-helper-contact-phone-adapter-basic/docs/configuration.md).

## License

MIT
