# helper-contact-address-adapter-extended

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![Node.js 24+](https://img.shields.io/badge/Node.js-24%2B-brightgreen.svg)](https://nodejs.org)

Extended address adapter for `helper-contact-address`. Postal code regex patterns and ISO 3166-2 subdivision lists. Part of [Superloom](https://superloom.dev).

## What This Is

The extended adapter for the contact-address family. Provides postal code regex pattern validation for 174 countries and ISO 3166-2 subdivision lists for 24 countries. Zero runtime dependencies (data is generated at build time from `postal-code-checker`).

## Extended Documentation

- [API reference](https://github.com/superloomdev/js-helper-modules/blob/main/src/helper-modules-core/js-helper-contact-address-adapter-extended/docs/api.md)
- [Configuration](https://github.com/superloomdev/js-helper-modules/blob/main/src/helper-modules-core/js-helper-contact-address-adapter-extended/docs/configuration.md)
- [Superloom](https://superloom.dev) - the framework

## Adding to Your Project

```javascript
const Adapter = require('helper-contact-address-adapter-extended')(Lib, {});
Lib.ContactAddress = require('helper-contact-address')(Lib, { Adapter });
```

## License

MIT
