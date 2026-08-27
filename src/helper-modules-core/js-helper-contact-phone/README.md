# helper-contact-phone

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![Node.js 24+](https://img.shields.io/badge/Node.js-24%2B-brightgreen.svg)](https://nodejs.org)

Phone number validation, formatting, and ID management for Node.js and the browser. Part of [Superloom](https://superloom.dev).

## What This Is

A port module for phone number handling that requires a swappable adapter for country data and validation depth. The core owns no country data and has zero runtime dependencies. The adapter provides country metadata, syntax validation, and number type classification.

Two adapters ship:
- **Basic** - lean country table, length + charset validation. ~20 KB. No runtime third-party dependencies.
- **Extended** - wraps `libphonenumber-js` with max metadata. Pattern validation + number type classification. ~145 KB.

Both adapters expose the same contract. Swapping an adapter changes validation depth, never call sites.

## Why Use This Module

- **Choose your depth.** A browser bundle wires the basic adapter and ships ~20 KB. A server wires the extended adapter and gets full `libphonenumber-js` validation. The calling code is identical.

- **Zero core dependencies.** The core module adds zero packages to your dependency tree. The supply chain audit for the core ends at the core itself.

- **Runs everywhere.** Pure JavaScript with no platform-specific globals. Node.js, browser, edge runtime, Lambda, Cloudflare Worker.

- **Validation explains itself.** Every `validateSyntax` call returns a `{ success, error }` envelope with a stable error type string. The caller learns why, not just whether.

- **Database-friendly IDs.** `createPhoneId` encodes numbers as `country_code + '.' + reversed(national_number)`, enabling prefix queries (`begins_with("in.")`) in MongoDB and DynamoDB.

## Adapters

| Adapter | Package | Depth | Bundle |
|---|---|---|---|
| Basic | `helper-contact-phone-adapter-basic` | Length + charset | ~20 KB |
| Extended | `helper-contact-phone-adapter-extended` | Length + charset + pattern + type | ~145 KB |

## Extended Documentation

- [API reference](https://github.com/superloomdev/js-helper-modules/blob/main/src/helper-modules-core/js-helper-contact-phone/docs/api.md) - every exported function with its signature, parameters, return shape, and worked examples
- [Configuration](https://github.com/superloomdev/js-helper-modules/blob/main/src/helper-modules-core/js-helper-contact-phone/docs/configuration.md) - loader pattern, dependency notes, adapter contract, testing tier
- [Schemas](https://github.com/superloomdev/js-helper-modules/blob/main/src/helper-modules-core/js-helper-contact-phone/docs/schemas.md) - return conventions, adapter contract schema, error catalog
- [Data model](https://github.com/superloomdev/js-helper-modules/blob/main/src/helper-modules-core/js-helper-contact-phone/docs/data-model.md) - country codes, calling codes, phone ID encoding, number types
- [Superloom](https://superloom.dev) - the framework

## Adding to Your Project

```javascript
import contactPhoneAdapterBasic from 'helper-contact-phone-adapter-basic';
import contactPhone from 'helper-contact-phone';

// 1. Load the adapter first
const Adapter = contactPhoneAdapterBasic(Lib, {});

// 2. Pass it to the core
Lib.ContactPhone = contactPhone(Lib, { Adapter });
```

The loader pattern, including the full `Lib` container shape, is documented in [Server Loader Architecture](https://github.com/superloomdev/superloom/blob/main/docs/server/server-loader.md). For one-time GitHub Packages registry setup, see the [npmrc setup guide](https://github.com/superloomdev/superloom/blob/main/docs/dev/npmrc-setup.md).

## Dependencies

This module has no external dependencies.

This module expects one peer module in the `Lib` container (Utils). For the full dependency breakdown, see [Configuration](https://github.com/superloomdev/js-helper-modules/blob/main/src/helper-modules-core/js-helper-contact-phone/docs/configuration.md).

## Testing Status

| Tier | Runtime | Status |
|---|---|---|
| Unit | Node.js `node --test` | [![Test](https://github.com/superloomdev/js-helper-modules/actions/workflows/ci-publish-helper-modules.yml/badge.svg?branch=main)](https://github.com/superloomdev/js-helper-modules/actions/workflows/ci-publish-helper-modules.yml) |

## License

MIT
