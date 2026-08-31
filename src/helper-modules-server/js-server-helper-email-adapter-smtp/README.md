# @superloomdev/js-server-helper-email-adapter-smtp

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![Node.js 24+](https://img.shields.io/badge/Node.js-24%2B-brightgreen.svg)](https://nodejs.org)

SMTP transport adapter for `helper-email`. Uses Nodemailer to deliver email messages via an SMTP server. Part of [Superloom](https://superloom.dev).

## What This Is

A Class F transport adapter that implements the `send(instance, message)` contract defined by the `helper-email` parent module. It lazy-loads Nodemailer, builds a transporter from the SMTP config, and delegates message delivery to Nodemailer's `sendMail`.

## Usage

```javascript
import email from 'helper-email';
import smtpAdapter from 'helper-email-adapter-smtp';

Lib.Email = email(Lib, {
  Adapter: smtpAdapter(Lib, {
    SMTP_HOST: 'smtp.example.com',
    SMTP_PORT: 587,
    SMTP_USER: 'user',
    SMTP_PASS: 'pass'
  })
});
```

## Why Use This Module

- **Standard adapter contract.** Implements the one-method `send` contract defined by the parent email module. Swap to a different transport by changing one loader line.
- **Lazy-loaded Nodemailer.** The Nodemailer import is deferred to first `send` call, so the adapter adds zero startup cost if email is never sent.
- **Transporter caching.** The Nodemailer transporter is cached at module scope, keyed by SMTP config, so multiple instances with the same config share one transporter.

## Documentation

- [API Reference](docs/api.md) - adapter contract and error catalog
- [Configuration](docs/configuration.md) - config keys, peer dependencies, direct dependencies
