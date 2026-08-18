# helper-contact-email-adapter-extended

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![Node.js 24+](https://img.shields.io/badge/Node.js-24%2B-brightgreen.svg)](https://nodejs.org)

Extended email adapter for `helper-contact-email`. `validator.isEmail()` syntax, disposable domain list (~5K), all-provider canonicalization. Part of [Superloom](https://superloom.dev).

## What This Is

The extended adapter for the contact-email family. Uses `validator.isEmail()` for robust syntax validation, a committed list of ~5K disposable domains for disposable checking, and `validator.normalizeEmail()` for all-provider canonicalization (Gmail, Outlook, iCloud, Yahoo, Fastmail).

## Extended Documentation

- [API reference](https://github.com/superloomdev/js-helper-modules/blob/main/src/helper-modules-core/js-helper-contact-email-adapter-extended/docs/api.md)
- [Configuration](https://github.com/superloomdev/js-helper-modules/blob/main/src/helper-modules-core/js-helper-contact-email-adapter-extended/docs/configuration.md)
- [Superloom](https://superloom.dev) - the framework

## Adding to Your Project

```javascript
const Adapter = require('helper-contact-email-adapter-extended')(Lib, {});
Lib.ContactEmail = require('helper-contact-email')(Lib, { Adapter });
```

## Dependencies

Runtime: `validator`. Build-time: `disposable-email-domains-js` (for domain list generation).

## License

MIT
