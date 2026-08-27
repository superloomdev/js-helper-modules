# helper-contact-email-adapter-basic

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![Node.js 24+](https://img.shields.io/badge/Node.js-24%2B-brightgreen.svg)](https://nodejs.org)

Basic email adapter for `helper-contact-email`. Own regex syntax validation. No disposable data. Gmail-only canonicalization. Part of [Superloom](https://superloom.dev).

## What This Is

The basic adapter for the contact-email family. Provides email syntax validation using a simple regex, Gmail-only canonicalization (dot/plus-tag folding), and always returns `false` for disposable domain checks (no disposable data).

Zero runtime dependencies. Choose this adapter for browser bundles and React Native apps.

## Extended Documentation

- [API reference](https://github.com/superloomdev/js-helper-modules/blob/main/src/helper-modules-core/js-helper-contact-email-adapter-basic/docs/api.md)
- [Configuration](https://github.com/superloomdev/js-helper-modules/blob/main/src/helper-modules-core/js-helper-contact-email-adapter-basic/docs/configuration.md)
- [Superloom](https://superloom.dev) - the framework

## Adding to Your Project

```javascript
import contactEmailAdapterBasic from 'helper-contact-email-adapter-basic';
import contactEmail from 'helper-contact-email';

const Adapter = contactEmailAdapterBasic(Lib, {});
Lib.ContactEmail = contactEmail(Lib, { Adapter });
```

## License

MIT
