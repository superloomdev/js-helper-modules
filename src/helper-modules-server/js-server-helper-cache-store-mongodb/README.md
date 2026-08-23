# helper-cache-store-mongodb

[![Test](https://github.com/superloomdev/js-helper-modules/actions/workflows/ci-publish-helper-modules.yml/badge.svg?branch=main)](https://github.com/superloomdev/js-helper-modules/actions/workflows/ci-publish-helper-modules.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![Node.js 24+](https://img.shields.io/badge/Node.js-24%2B-brightgreen.svg)](https://nodejs.org)

A MongoDB-backed implementation of the [helper-cache](https://github.com/superloomdev/js-helper-modules/tree/main/src/helper-modules-server/js-server-helper-cache) module's storage contract. Configure and instantiate this adapter independently, then pass the ready-to-use store object to the parent's `Store` config; the Cache module's calling shape stays identical regardless of which storage backend is active. Part of [Superloom](https://superloom.dev).

## What This Is

A thin layer between the Cache parent module and a MongoDB collection. Maps `namespace` and `cache_code` to a composite string `_id` (`namespace + '\u001F' + cache_code`), then delegates to `helper-nosql-mongodb`. TTL is handled via a MongoDB TTL index on the `EXPIRY_FIELD` attribute, with an application-side expiry check on read for immediate correctness.

The adapter cannot stand alone. It is always loaded together with the Cache parent and the [`helper-nosql-mongodb`](https://github.com/superloomdev/js-helper-modules/tree/main/src/helper-modules-server/js-server-helper-nosql-mongodb) driver helper.

## Why Use This Module

- **Library updates won't break your code.** When the MongoDB Node.js driver ships a breaking change, only this adapter and the `nosql-mongodb` driver helper need updating.

- **Pre-tested at every release.** A full store-contract and Cache-lifecycle integration suite run against a Dockerized MongoDB instance in CI on every push.

- **Namespace-scoped deleteCacheByPrefix, clearCache, and listCacheCodes.** These operations use left-anchored regex on the `_id` index, scoped to one namespace prefix. This is O(K) where K = matching documents, not O(N) over the entire collection.

- **Native TTL.** Expired cache entries are deleted automatically by MongoDB's TTL index background sweeper, typically within 60 seconds. The adapter also checks expiry on read so stale documents are treated as misses before the sweeper runs.

- **Atomic distributed locks.** `setCacheLock` uses `insertOne` with duplicate key detection for an atomic create-only write. No check-then-set race.

## Aligned with Superloom Philosophy

If your project is built on Superloom conventions (the same loader pattern, the same response envelopes, the same testing model), this adapter slots in without you needing to learn anything new.

## Extended Documentation

- [API reference](docs/api.md). The store contract this adapter implements and MongoDB-specific semantics
- [Configuration](docs/configuration.md). Configuration keys, peer dependencies, environment variables, testing tier
- [Schema](docs/schema.md). Collection design, key structure, value encoding, TTL, lock keys
- [Cleanup](docs/cleanup.md). Native TTL, expiry check on read, explicit invalidation
- [Cache parent module](https://github.com/superloomdev/js-helper-modules/tree/main/src/helper-modules-server/js-server-helper-cache). The data model, error catalog, and Cache-side configuration this adapter plugs into

## Adding to Your Project

This adapter is installed alongside the Cache parent module and the `nosql-mongodb` driver helper. The loader pattern is documented in the Cache parent's README.

Do not vendor the source or use it as a local file dependency. The published package is the supported integration path.

## Dependencies

This module has no external dependencies.

It expects three modules in the `Lib` container supplied by the application (Utils, Debug, MongoDB). For the full dependency breakdown, see [`docs/configuration.md`](docs/configuration.md).

## Testing Status

| Tier | Runtime | Status |
|---|---|---|
| Contract + Integration | MongoDB via Docker Compose | [![Test](https://github.com/superloomdev/js-helper-modules/actions/workflows/ci-publish-helper-modules.yml/badge.svg?branch=main)](https://github.com/superloomdev/js-helper-modules/actions/workflows/ci-publish-helper-modules.yml) |

Docker lifecycle is fully automatic - `npm test` from `_test/` manages `pretest`/`posttest`. Test runtime details live in [Configuration - Testing Tier](docs/configuration.md#testing-tier).

## License

MIT
