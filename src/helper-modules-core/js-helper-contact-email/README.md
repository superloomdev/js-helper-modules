# helper-contact-email

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![Node.js 24+](https://img.shields.io/badge/Node.js-24%2B-brightgreen.svg)](https://nodejs.org)

Email address validation, sanitization, canonicalization, and disposable domain checking for Node.js and the browser. Part of [Superloom](https://superloom.dev).

## What This Is

A port module for email address handling that requires a swappable adapter for validation depth. The core owns no email data and has zero runtime dependencies.

Two adapters ship:
- **Basic** - own regex, no disposable data, Gmail-only canonicalize. Zero runtime dependencies.
- **Extended** - `validator.isEmail()` for syntax, committed disposable domain list (~5K), all-provider canonicalize via `validator.normalizeEmail()`.

Both adapters expose the same contract. Swapping an adapter changes validation depth, never call sites.

## Extended Documentation

- [API reference](https://github.com/superloomdev/js-helper-modules/blob/main/src/helper-modules-core/js-helper-contact-email/docs/api.md)
- [Configuration](https://github.com/superloomdev/js-helper-modules/blob/main/src/helper-modules-core/js-helper-contact-email/docs/configuration.md)
- [Schemas](https://github.com/superloomdev/js-helper-modules/blob/main/src/helper-modules-core/js-helper-contact-email/docs/schemas.md)
- [Data model](https://github.com/superloomdev/js-helper-modules/blob/main/src/helper-modules-core/js-helper-contact-email/docs/data-model.md)
- [Superloom](https://superloom.dev) - the framework

## Adding to Your Project

```javascript
import contactEmailAdapterBasic from 'helper-contact-email-adapter-basic';
import contactEmail from 'helper-contact-email';

const Adapter = contactEmailAdapterBasic(Lib, {});
Lib.ContactEmail = contactEmail(Lib, { Adapter });
```

## Dependencies

This module has no external dependencies.

This module expects one peer module in the `Lib` container (Utils).

## License

MIT
