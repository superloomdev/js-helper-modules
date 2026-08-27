# helper-contact-address-adapter-basic

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![Node.js 24+](https://img.shields.io/badge/Node.js-24%2B-brightgreen.svg)](https://nodejs.org)

Basic address adapter for `helper-contact-address`. Postal code length bounds per country. No subdivision data. Part of [Superloom](https://superloom.dev).

## What This Is

The basic adapter for the contact-address family. Provides postal code length bounds for 245 countries, no subdivision data (always returns valid), and no regex pattern validation. Zero runtime dependencies.

## Extended Documentation

- [API reference](https://github.com/superloomdev/js-helper-modules/blob/main/src/helper-modules-core/js-helper-contact-address-adapter-basic/docs/api.md)
- [Configuration](https://github.com/superloomdev/js-helper-modules/blob/main/src/helper-modules-core/js-helper-contact-address-adapter-basic/docs/configuration.md)
- [Superloom](https://superloom.dev) - the framework

## Adding to Your Project

```javascript
import contactAddressAdapterBasic from 'helper-contact-address-adapter-basic';
import contactAddress from 'helper-contact-address';

const Adapter = contactAddressAdapterBasic(Lib, {});
Lib.ContactAddress = contactAddress(Lib, { Adapter });
```

## License

MIT
