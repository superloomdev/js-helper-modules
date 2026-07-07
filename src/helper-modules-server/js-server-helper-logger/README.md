# helper-logger

[![Test](https://github.com/superloomdev/superloom/actions/workflows/ci-helper-modules.yml/badge.svg?branch=main)](https://github.com/superloomdev/superloom/actions/workflows/ci-helper-modules.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![Node.js 24+](https://img.shields.io/badge/Node.js-24%2B-brightgreen.svg)](https://nodejs.org)

Compliance-friendly action log for Superloom applications. One immutable row per log-worthy event records *who* acted (`actor_type` / `actor_id`), *on what* (`entity_type` / `entity_id`), doing *which* action (dot-notation string), with structured per-action `data` and optional IP / user-agent capture for regulator-facing audit trails. The storage backend is chosen at construction time through a pluggable Class F adapter. Part of the [Superloom](https://github.com/superloomdev/superloom) framework.

## What It Does

The logger solves three problems every audit-logging surface faces, in one module:

- **Don't block the request.** `log()` returns immediately by default. The row commits asynchronously via `Lib.Instance.backgroundRoutine`. Compliance callers opt in to durable writes with `options.await: true`.
- **Mix retention policies in one table.** Every row is either `'persistent'` (never deleted) or `{ ttl_seconds: N }` (auto-deleted at `created_at + N`). A single table happily mixes forever-rows ("user created") with short-retention rows ("login event").
- **Encrypt sensitive data at rest.** Set `CONFIG.IP_ENCRYPT_KEY` and IP addresses are AES-encrypted transparently. Audit reviewers still see the data; attackers with database access see only ciphertext.

## Why

- **No string-dispatched backends.** The chosen storage adapter is constructed independently and passed as a ready-to-use object via `CONFIG.Store`. Unused backends never get loaded, never pull their npm dependencies, and the module has no internal `switch` block to maintain.
- **One factory call. One independent instance.** No singletons. Multiple Logger instances run in the same process when genuinely needed (rare; one suffices for almost every project).
- **No correctness dependency on cleanup.** List queries return whatever rows exist. If the cleanup cron is paused for a week, queries still work; expired rows are just included until the next sweep.
- **Out-of-scope by design.** The logger is not a metrics system, not a structured request logger, not a notification dispatcher. It records audit-trail events. [`Lib.Debug`](https://github.com/superloomdev/superloom/tree/main/src/helper-modules-core/js-helper-debug), Datadog / Prometheus, and a separate notification surface handle the rest.

## Architecture Overview

```
Logger instance
 ├─ CONFIG.Store          (ready-to-use store object, constructed by the adapter before passing in)
 ├─ CONFIG.IP_ENCRYPT_KEY (optional AES key)
 └─ store                 (CONFIG.Store used directly; reads/writes log rows)
```

Each store adapter is a fully independent module. Construct it first with its own config, then pass the ready-to-use object as `CONFIG.Store`. The logger never imports database drivers or invokes adapter factories internally.

For the full data-model walk-through and design rationale, see [`docs/data-model.md`](docs/data-model.md). For per-backend index, TTL, and config details, see each adapter package's own README (linked below).

## Storage Adapters

Five storage adapters are available, each a separate package. A project installs only the one it needs.

| Adapter | Backend |
|---|---|
| [`helper-logger-store-sqlite`](https://github.com/superloomdev/superloom/tree/main/src/helper-modules-server/js-server-helper-logger-store-sqlite) | SQLite (embedded, in-process) |
| [`helper-logger-store-postgres`](https://github.com/superloomdev/superloom/tree/main/src/helper-modules-server/js-server-helper-logger-store-postgres) | PostgreSQL |
| [`helper-logger-store-mysql`](https://github.com/superloomdev/superloom/tree/main/src/helper-modules-server/js-server-helper-logger-store-mysql) | MySQL or MariaDB |
| [`helper-logger-store-mongodb`](https://github.com/superloomdev/superloom/tree/main/src/helper-modules-server/js-server-helper-logger-store-mongodb) | MongoDB |
| [`helper-logger-store-dynamodb`](https://github.com/superloomdev/superloom/tree/main/src/helper-modules-server/js-server-helper-logger-store-dynamodb) | AWS DynamoDB |

**Each application selects the adapter that matches its own database.** A Postgres-backed app uses `logger-store-postgres`, a MongoDB app uses `logger-store-mongodb`, and so on. The logger module's calling shape is identical across all five backends, so the choice is operational, not application-code.

A legitimate deviation is using a NoSQL adapter in a SQL-backed application when the audit log has different scaling characteristics from the rest of the app (very high write volume, append-only access pattern, separate retention policies). Mixing SQL families (Postgres app with MySQL or SQLite logger) is not a useful pattern.

Each adapter package ships its own README with the backend-specific schema, indexes, TTL behaviour, IaC provisioning notes, and config key shape. The logger module itself owns no per-backend documentation: every adapter is the authoritative source for its own backend.

## Aligned with Superloom Philosophy

A project built on Superloom conventions (the same loader pattern, the same testing model, the same `instance`-first call shape) adopts this module without learning anything new. Every function takes `instance` as its first argument. Background writes use `Lib.Instance.backgroundRoutine`.

The principles are documented at [superloom.dev](https://superloom.dev) for projects not yet using Superloom.

## Extended Documentation

- [API reference](docs/api.md). Every exported function with its signature, parameters, return shape, options, and error catalog
- [Configuration](docs/configuration.md). Loader pattern, every configuration key, adapter integration pattern, IP-encryption key handling, peer dependencies, testing tier
- [Schemas](docs/schemas.md). The validated input contracts (CONFIG, log options, list options), the five-method store contract, and the response envelope
- [Data model](docs/data-model.md). Every record field, core concepts (entity, actor, scope, action), the `sort_key` design, retention quick reference, design decisions
- [Runtime](docs/runtime.md). The runtime-shape differences for the logger: background-write lifecycle in serverless versus persistent server, scheduled cleanup mechanism
- [Superloom](https://superloom.dev). The framework

## Adding to Your Project

This module and the one storage adapter it needs are declared as dependencies in the project's `package.json` and loaded through the standard Superloom loader. The published packages are the supported integration path; vendoring the source or using a local file dependency is not.

The adapter is configured and instantiated independently, then passed to the logger loader as a ready-to-use `CONFIG.Store` object. The adapter list is in the [Storage Adapters](#storage-adapters) section above, and the per-backend config key shape is in each adapter package's own README. The loader pattern, including the full `Lib` container shape, is documented in [Server Loader Architecture](https://github.com/superloomdev/superloom/blob/main/docs/server/server-loader.md). One-time GitHub Packages registry setup is in the [npmrc setup guide](https://github.com/superloomdev/superloom/blob/main/docs/dev/npmrc-setup.md).

## Dependencies

This module has no third-party npm packages.

It expects four peer modules in the `Lib` container (Utils, Debug, Crypto, Instance) and one optional peer adapter package for the storage backend. For the full dependency breakdown, see [`docs/configuration.md`](docs/configuration.md).

## Testing Status

| Tier | Runtime | Status |
|---|---|---|
| Unit (offline) | Node.js `node --test` against an in-process memory store | [![Test](https://github.com/superloomdev/superloom/actions/workflows/ci-helper-modules.yml/badge.svg?branch=main)](https://github.com/superloomdev/superloom/actions/workflows/ci-helper-modules.yml) |

The logger module's own tests use the in-process memory fixture (`_test/memory-store.js`) which implements the full five-method store contract (`setupNewStore`, `addLog`, `getLogsByEntity`, `getLogsByActor`, `cleanupExpiredLogs`). There is no Docker dependency in this package and no database driver is required. Integration tests for each storage backend live in the corresponding adapter package (`helper-logger-store-*`) and run the shared store-contract suite against real backends.

## License

MIT
