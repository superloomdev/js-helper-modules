# helper-cache-store-valkey

[![Test](https://github.com/superloomdev/js-helper-modules/actions/workflows/ci-publish-helper-modules.yml/badge.svg?branch=main)](https://github.com/superloomdev/js-helper-modules/actions/workflows/ci-publish-helper-modules.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![Node.js 24+](https://img.shields.io/badge/Node.js-24%2B-brightgreen.svg)](https://nodejs.org)

A Valkey/Redis-backed implementation of the [helper-cache](https://github.com/superloomdev/js-helper-modules/tree/main/src/helper-modules-server/js-server-helper-cache) module's storage contract. Configure and instantiate this adapter independently, then pass the ready-to-use store object to the parent's `Store` config; the Cache module's calling shape stays identical regardless of which storage backend is active. Part of [Superloom](https://superloom.dev).

## What This Is

A thin layer between the Cache parent module and a Valkey instance. Composes a flat Valkey key from `namespace` and `cache_code` using `KEY_PREFIX` and `KEY_SEPARATOR`, then delegates to `helper-kv-valkey`. TTL is native to Valkey - no application-side sweep is needed.

The adapter cannot stand alone. It is always loaded together with the Cache parent and the [`helper-kv-valkey`](https://github.com/superloomdev/js-helper-modules/tree/main/src/helper-modules-server/js-server-helper-kv-valkey) driver helper.

## Why Use This Module

- **Library updates won't break your code.** When the Valkey native driver ships a breaking change, only this adapter and the `kv-valkey` driver helper need updating.

- **Pre-tested at every release.** A full store-contract and Cache-lifecycle integration suite run against a Dockerized Valkey instance in CI on every push.

- **Native TTL.** Expired cache entries are deleted automatically by Valkey - no application scheduling required. `setCache` with a `ttl_seconds` value issues `SET key value EX ttl_seconds` under the hood.

- **O(1) single-entry operations.** `getCache`, `setCache`, and `deleteCache` are single-key operations with O(1) complexity.

## deleteCacheByPrefix, clearCache, and listCacheCodes Complexity

`deleteCacheByPrefix`, `clearCache`, and `listCacheCodes` use `SCAN MATCH prefix*`, which is **O(N) over the entire keyspace**. Redis and Valkey expose a flat keyspace with no partition or sort key, so no prefix-scoped index exists. On self-hosted Valkey and node-based ElastiCache this costs CPU only; on **serverless ElastiCache** it consumes ECPUs proportional to data scanned and can be expensive. Prefer targeted `deleteCache` calls for routine invalidation and treat `deleteCacheByPrefix`/`clearCache` as administrative operations.

See [Configuration](docs/configuration.md#deletecachebyprefix-clearcache-and-listcachecodes-complexity) for the full cost analysis.

## Aligned with Superloom Philosophy

If your project is built on Superloom conventions (the same loader pattern, the same response envelopes, the same testing model), this adapter slots in without you needing to learn anything new.

## Extended Documentation

- [API reference](docs/api.md). The store contract this adapter implements and Valkey-specific semantics
- [Configuration](docs/configuration.md). Configuration keys, peer dependencies, environment variables, deleteCacheByPrefix/clearCache/listCacheCodes complexity, testing tier
- [Schema](docs/schema.md). Key structure, value encoding, TTL, no secondary index
- [Cleanup](docs/cleanup.md). Native TTL, no sweep needed, explicit invalidation
- [Cache parent module](https://github.com/superloomdev/js-helper-modules/tree/main/src/helper-modules-server/js-server-helper-cache). The data model, error catalog, and Cache-side configuration this adapter plugs into

## Adding to Your Project

This adapter is installed alongside the Cache parent module and the `kv-valkey` driver helper. The loader pattern is documented in the Cache parent's README.

Do not vendor the source or use it as a local file dependency. The published package is the supported integration path.

## Dependencies

This module has no external dependencies.

It expects three modules in the `Lib` container supplied by the application (Utils, Debug, KV). For the full dependency breakdown, see [`docs/configuration.md`](docs/configuration.md).

## Testing Status

| Tier | Runtime | Status |
|---|---|---|
| Contract + Integration | Valkey via Docker Compose | [![Test](https://github.com/superloomdev/js-helper-modules/actions/workflows/ci-publish-helper-modules.yml/badge.svg?branch=main)](https://github.com/superloomdev/js-helper-modules/actions/workflows/ci-publish-helper-modules.yml) |

Docker lifecycle is fully automatic - `npm test` from `_test/` manages `pretest`/`posttest`. Test runtime details live in [Configuration - Testing Tier](docs/configuration.md#testing-tier).

## License

MIT
