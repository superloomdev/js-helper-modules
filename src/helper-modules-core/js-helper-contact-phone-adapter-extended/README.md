# helper-contact-phone-adapter-extended

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![Node.js 24+](https://img.shields.io/badge/Node.js-24%2B-brightgreen.svg)](https://nodejs.org)

Extended phone adapter for `helper-contact-phone`. Wraps `libphonenumber-js` with max metadata. Pattern validation, number type classification. Part of [Superloom](https://superloom.dev).

## What This Is

The extended adapter for the contact-phone family. Wraps `libphonenumber-js` with max metadata (~145 KB) for full validation depth: digit pattern validation and number type classification (mobile, fixed line, toll free, etc.).

Choose this adapter on servers where validation depth matters more than bundle size.

## Why Use This Adapter

- **Full pattern validation.** Catches numbers with correct length but wrong digit patterns (e.g., Indian mobile numbers must start with 6, 7, 8, or 9).
- **Number type classification.** `getNumberType` returns the actual type: `MOBILE`, `FIXED_LINE`, `TOLL_FREE`, etc.
- **Google's metadata.** The same PhoneNumberMetadata.xml used by Stripe, Twilio, and WhatsApp. Updated regularly.
- **245 countries.** Every country recognized by Google's metadata.

## When to Choose Basic Instead

- You are building a browser bundle or React Native app where ~145 KB of metadata is too much
- You only need length + charset validation
- You do not need number type classification

## Extended Documentation

- [API reference](https://github.com/superloomdev/js-helper-modules/blob/main/src/helper-modules-core/js-helper-contact-phone-adapter-extended/docs/api.md) - adapter contract methods
- [Configuration](https://github.com/superloomdev/js-helper-modules/blob/main/src/helper-modules-core/js-helper-contact-phone-adapter-extended/docs/configuration.md) - loader pattern, dependencies, testing
- [Superloom](https://superloom.dev) - the framework

## Adding to Your Project

```javascript
const Adapter = require('helper-contact-phone-adapter-extended')(Lib, {});
Lib.ContactPhone = require('helper-contact-phone')(Lib, { Adapter });
```

## Dependencies

This module has one runtime dependency: `libphonenumber-js`.

This module expects one peer module in the `Lib` container (Utils). For the full dependency breakdown, see [Configuration](https://github.com/superloomdev/js-helper-modules/blob/main/src/helper-modules-core/js-helper-contact-phone-adapter-extended/docs/configuration.md).

## License

MIT
