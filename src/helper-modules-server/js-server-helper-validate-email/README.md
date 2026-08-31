# @superloomdev/js-server-helper-validate-email

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![Node.js 24+](https://img.shields.io/badge/Node.js-24%2B-brightgreen.svg)](https://nodejs.org)

Email deliverability verification for Node.js. Checks whether a domain can receive email (MX records) and whether a specific mailbox is reachable (SMTP RCPT TO probe). Part of [Superloom](https://superloom.dev).

## What This Is

A server-side email deliverability checker built on Node's `dns` and `net` modules. It resolves MX records for a domain, connects to the highest-priority mail server, and runs an SMTP RCPT TO probe to check whether a mailbox is reachable. Zero npm dependencies - everything uses Node.js built-ins.

## Behavior

The module provides four functions:

- **`checkDomainMx`** - resolve MX records for a domain. Handles null MX (RFC 7505) and A/AAAA fallback (RFC 5321).
- **`getDomainMx`** - thin getter that returns raw MX records without SMTP probing.
- **`checkMailbox`** - full SMTP RCPT TO probe against the domain's MX servers. Includes catch-all domain detection and greylisting (4xx) handling.
- **`checkEmailDeliverability`** - composite check: syntax + MX + SMTP in one call.

### Catch-All Detection

When `CHECK_CATCH_ALL` is true (default), the module probes with a random nonsense address after a successful RCPT TO. If the server also accepts the random address, the domain is catch-all (accepts all addresses regardless of mailbox existence). The result includes a `catch_all` boolean field.

### Greylisting (4xx) Handling

When an SMTP server returns a 4xx response (greylisting), the module returns `reachable: null` (unknown verdict) by default. When `GREYLIST_RETRY_MS` is set to a positive number, the probe retries once after the configured delay before returning the unknown verdict.

## Hot-Swappable with the Syntax-Only Sibling

This module is the server-side deliverability member of an email validation pair. The existing `helper-contact-email` module (Class A, browser-compatible) handles syntax validation and disposable domain checking. This module (Class B, server-only) adds MX and SMTP verification. An application uses both: `contact-email` for syntax, `validate-email` for deliverability.

## Why Use This Module

- **Zero npm dependencies.** Built on Node's `dns` and `net` modules, which ship with the runtime.
- **Honest about limitations.** SMTP verification is inherently unreliable (greylisting, catch-all domains, provider blocks). The module documents these limitations rather than pretending verification is definitive.
- **Pre-tested at every release.** A full test suite with DNS stubs and an in-process SMTP server runs in CI on every push.
- **Designed for human review.** The code is laid out as clearly-marked visual sections so a reviewer can read it top to bottom without getting lost.

## Aligned with Superloom Philosophy

If your project is built on Superloom conventions (the same loader pattern, the same testing model), this module slots in without you needing to learn anything new.

## Documentation

- [API Reference](docs/api.md) - every exported function, parameter, and return shape
- [Configuration](docs/configuration.md) - loader pattern, config keys, peer dependencies
