# helper-contact-address

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![Node.js 24+](https://img.shields.io/badge/Node.js-24%2B-brightgreen.svg)](https://nodejs.org)

Postal address validation and field policy management for Node.js and the browser. Part of [Superloom](https://superloom.dev).

## What This Is

A port module for postal address handling that requires a swappable adapter for postal code and subdivision validation depth. The core owns no country data and has zero runtime dependencies.

Two adapters ship:
- **Basic** - postal length bounds only, no subdivisions. Zero runtime dependencies.
- **Extended** - postal regex patterns + subdivision lists from `iso-3166-2`.

## Extended Documentation

- [API reference](https://github.com/superloomdev/js-helper-modules/blob/main/src/helper-modules-core/js-helper-contact-address/docs/api.md)
- [Configuration](https://github.com/superloomdev/js-helper-modules/blob/main/src/helper-modules-core/js-helper-contact-address/docs/configuration.md)
- [Schemas](https://github.com/superloomdev/js-helper-modules/blob/main/src/helper-modules-core/js-helper-contact-address/docs/schemas.md)
- [Data model](https://github.com/superloomdev/js-helper-modules/blob/main/src/helper-modules-core/js-helper-contact-address/docs/data-model.md)
- [Superloom](https://superloom.dev) - the framework

## Adding to Your Project

```javascript
const Adapter = require('helper-contact-address-adapter-basic')(Lib, {});
Lib.ContactAddress = require('helper-contact-address')(Lib, { Adapter });
```

## License

MIT
