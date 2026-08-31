# @superloomdev/js-server-helper-email

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![Node.js 24+](https://img.shields.io/badge/Node.js-24%2B-brightgreen.svg)](https://nodejs.org)

Email sending module with swappable transport adapters for Node.js. Owns the message model, deliverability headers, and the transport adapter contract. Part of [Superloom](https://superloom.dev).

## What This Is

A server-side email sending module that separates the message model from the transport mechanism. The parent module owns message validation, recipient normalization, and deliverability headers (transactional vs promotional, RFC 8058 one-click unsubscribe). The actual delivery is delegated to a transport adapter chosen by the caller at loader time.

## Behavior

The module provides three functions:

- **`sendEmail`** - validate, normalize, apply deliverability headers, and dispatch through the transport adapter.
- **`buildTransactionalHeaders`** - build the header set for transactional messages.
- **`buildPromotionalHeaders`** - build the header set for promotional messages with RFC 8058 one-click unsubscribe.

## Transport Adapters

The parent module does not send email itself. The caller passes a ready-to-use adapter object as `CONFIG.Adapter`:

```javascript
import email from 'helper-email';
import smtpAdapter from 'helper-email-adapter-smtp';

Lib.Email = email(Lib, {
  Adapter: smtpAdapter(Lib, { SMTP_HOST: 'smtp.example.com', SMTP_PORT: 587 })
});
```

Available adapters:

- `helper-email-adapter-smtp` - SMTP transport via Nodemailer

## Why Use This Module

- **Adapter pattern.** Switch from SMTP to SendGrid or AWS SES by changing one loader line. The message model and deliverability headers stay the same.
- **Deliverability built in.** Transactional and promotional header sets are applied automatically. RFC 8058 one-click unsubscribe is included for bulk senders.
- **Pre-tested at every release.** A full test suite with a stub adapter runs in CI on every push.
- **Designed for human review.** The code is laid out as clearly-marked visual sections so a reviewer can read it top to bottom without getting lost.

## Aligned with Superloom Philosophy

If your project is built on Superloom conventions (the same loader pattern, the same testing model), this module slots in without you needing to learn anything new.

## Documentation

- [API Reference](docs/api.md) - every exported function, parameter, and return shape
- [Configuration](docs/configuration.md) - loader pattern, config keys, adapter contract
