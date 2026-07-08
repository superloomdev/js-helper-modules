# helper-verify

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![Node.js 24+](https://img.shields.io/badge/Node.js-24%2B-brightgreen.svg)](https://nodejs.org)

One-time verification code lifecycle for Superloom applications. Three create interfaces (numeric pin, alphanumeric code, URL-safe token) over one shared flow, plus one `verify` function that consumes any of them. The storage backend is chosen at construction time through a pluggable Class F adapter. Part of the [Superloom](https://github.com/superloomdev/superloom) framework. 

## What It Does

The verify module solves the one-time-code problem with three independent defenses against abuse:

- **Cooldown on creation.** A minimum gap between successive codes for the same `(scope, key)`. Prevents an attacker from flooding the delivery channel.
- **Expiry (TTL).** Codes become useless after `expires_at`, regardless of whether the cleanup sweep has run. The expiry check is enforced at consume time.
- **Per-record fail counter.** Too many wrong attempts and the code locks out (`VERIFY_MAX_FAILS`). The counter resets on every successful create.

A successful `verify(...)` deletes the record in the background, making the code strictly one-time. The same value cannot be re-submitted.

## Why

- **No string-dispatched backends.** The chosen storage adapter is configured and instantiated independently, then passed as a ready-to-use object via `CONFIG.Store`. Unused backends never get loaded, never pull their npm dependencies, and the module has no internal `switch (STORE) { ... }` block to maintain.
- **One factory call. One independent instance.** No singletons. Multiple verify instances run in parallel when different flows need different cooldowns or charsets.
- **Cleanup is hygiene, not correctness.** The consume-time `instance.time > record.expires_at` check guarantees expired codes are rejected even when the sweep is delayed.
- **Three charsets for three surfaces.** Numeric pins for SMS, Crockford Base32 for spoken or printed codes (omits visually ambiguous characters), URL-safe alphanumeric for magic links. Same call shape; same `verify` function.

## Architecture Overview

```
Verify instance
 ├─ CONFIG.Store          (ready-to-use store object, e.g. require('helper-verify-store-postgres')(config))
 ├─ CONFIG.PIN_CHARSET    ('0123456789' by default)
 ├─ CONFIG.CODE_CHARSET   (Crockford Base32 by default)
 ├─ CONFIG.TOKEN_CHARSET  ('a-zA-Z0-9' by default)
 └─ Store                 (passed directly; reads/writes verification records)
```

`CONFIG.Store` is the ready-to-use store object itself. Configure and instantiate the adapter independently, then pass the resulting store object directly. Each adapter is a fully independent module that owns its own Lib, Config, and ERRORS, so adding a new backend never changes the call-site code.

For the full data-model walk-through and design rationale, see [`docs/data-model.md`](docs/data-model.md). For per-backend index, TTL, and configuration details, see each adapter package's own README (linked below).

## Storage Adapters

Five storage adapters are available, each a separate package. A project installs only the one it needs.

| Adapter | Backend |
|---|---|
| [`helper-verify-store-sqlite`](https://github.com/superloomdev/superloom/tree/main/src/helper-modules-server/js-server-helper-verify-store-sqlite) | SQLite (embedded, in-process) |
| [`helper-verify-store-postgres`](https://github.com/superloomdev/superloom/tree/main/src/helper-modules-server/js-server-helper-verify-store-postgres) | PostgreSQL |
| [`helper-verify-store-mysql`](https://github.com/superloomdev/superloom/tree/main/src/helper-modules-server/js-server-helper-verify-store-mysql) | MySQL or MariaDB |
| [`helper-verify-store-mongodb`](https://github.com/superloomdev/superloom/tree/main/src/helper-modules-server/js-server-helper-verify-store-mongodb) | MongoDB |
| [`helper-verify-store-dynamodb`](https://github.com/superloomdev/superloom/tree/main/src/helper-modules-server/js-server-helper-verify-store-dynamodb) | AWS DynamoDB |

**Each application selects the adapter that matches its own database.** A Postgres-backed app uses `verify-store-postgres`, a MongoDB app uses `verify-store-mongodb`, and so on. The verify module's calling shape is identical across all five backends, so the choice is operational, not application-code.

A legitimate deviation is using a NoSQL adapter in a SQL-backed application when the verification table has different scaling characteristics from the rest of the app (very high write volume during user-onboarding bursts, short TTLs that benefit from native sweepers). Mixing SQL families (Postgres app with MySQL or SQLite verify) is not a useful pattern.

Each adapter package ships its own README with the backend-specific schema, indexes, TTL behaviour, IaC provisioning notes, and configuration shape. The verify module itself owns no per-backend documentation: every Class F adapter is the authoritative source for its own backend.

## Aligned with Superloom Philosophy

A project built on Superloom conventions (the same loader pattern, the same testing model, the same `instance`-first call shape) adopts this module without learning anything new. Every function takes `instance` as its first argument. The post-verify record delete uses `Lib.Instance.backgroundRoutine`.

The principles are documented at [superloom.dev](https://superloom.dev) for projects not yet using Superloom.

## Extended Documentation

- [API reference](docs/api.md). Every exported function with its signature, parameters, return shape, options, lifecycle, and error catalog
- [Configuration](docs/configuration.md). Loader pattern, every configuration key, charset overrides, per-backend configuration shape, peer dependencies, testing tier
- [Schemas](docs/schemas.md). The validated input contracts (CONFIG, create options, verify options), the store contract, and the response envelope
- [Data model](docs/data-model.md). Every record field, core concepts (scope, key, cooldown, fail counter), scope-and-key design guide, design decisions
- [Runtime](docs/runtime.md). The runtime-shape differences for the verify module: post-verify background delete caveat in serverless, scheduled cleanup mechanism
- [Superloom](https://superloom.dev). The framework

## Adding to Your Project

This module and the one storage adapter it needs are declared as dependencies in the project's `package.json` and loaded through the standard Superloom loader. The published packages are the supported integration path; vendoring the source or using a local file dependency is not.

The adapter is configured and instantiated independently, then passed to the verify loader as a ready-to-use `CONFIG.Store` object. The full wiring and the per-backend configuration shape are in [Configuration](docs/configuration.md). The loader pattern, including the full `Lib` container shape, is documented in [Server Loader Architecture](https://github.com/superloomdev/superloom/blob/main/docs/server/server-loader.md). One-time GitHub Packages registry setup is in the [npmrc setup guide](https://github.com/superloomdev/superloom/blob/main/docs/dev/npmrc-setup.md).

## Dependencies

This module has no external dependencies.

It expects four peer modules in the `Lib` container (Utils, Debug, Crypto, Instance) and one optional peer adapter package for the storage backend. For the full dependency breakdown, see [`docs/configuration.md`](docs/configuration.md).

## Testing Status

| Tier | Runtime | Status |
|---|---|---|
| Unit (offline) | Node.js `node --test` against an in-process memory store | [![Test](https://github.com/superloomdev/superloom/actions/workflows/ci-helper-modules.yml/badge.svg?branch=main)](https://github.com/superloomdev/superloom/actions/workflows/ci-helper-modules.yml) |

The verify module's own tests use the in-process memory fixture (`_test/memory-store.js`) which implements the full six-method store contract (`setupNewStore`, `getRecord`, `setRecord`, `incrementFailCount`, `deleteRecord`, `cleanupExpiredRecords`). There is no Docker dependency in this package and no database driver is required. Integration tests for each storage backend live in the corresponding adapter package (`helper-verify-store-*`) and run the shared store-contract suite against real backends.

## License

MIT
