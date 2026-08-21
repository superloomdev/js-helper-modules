# helper-cache-store-dynamodb

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![Node.js 24+](https://img.shields.io/badge/Node.js-24%2B-brightgreen.svg)](https://nodejs.org)

A DynamoDB-backed implementation of the [helper-cache](https://github.com/superloomdev/superloom/tree/main/src/helper-modules-server/js-server-helper-cache) module's storage contract. Configure and instantiate this adapter independently, then pass the ready-to-use store object to the parent's `Store` config; the Cache module's calling shape stays identical regardless of which storage backend is active. Part of [Superloom](https://superloom.dev).

## What This Is

A thin layer between the Cache parent module and a DynamoDB table. Maps `namespace` and `cache_code` to a DynamoDB composite primary key (`PARTITION_KEY` + `SORT_KEY`), then delegates to `helper-nosql-aws-dynamodb`. TTL is handled via DynamoDB native TTL on the `EXPIRY_FIELD` attribute, with an application-side expiry check on read for immediate correctness.

The adapter cannot stand alone. It is always loaded together with the Cache parent and the [`helper-nosql-aws-dynamodb`](https://github.com/superloomdev/superloom/tree/main/src/helper-modules-server/js-server-helper-nosql-aws-dynamodb) driver helper.

## Why Use This Module

- **Library updates won't break your code.** When the AWS SDK ships a breaking change, only this adapter and the `nosql-aws-dynamodb` driver helper need updating.

- **Pre-tested at every release.** A full store-contract and Cache-lifecycle integration suite run against a Dockerized DynamoDB Local instance in CI on every push.

- **Partition-scoped clear and list.** Unlike the flat-keyspace Valkey adapter, `clear` and `list` are scoped to one partition key (namespace), not the entire table. This is O(N) over the partition, not O(N) over all keys.

- **Native TTL.** Expired cache entries are deleted automatically by DynamoDB's TTL sweeper. The adapter also checks expiry on read so stale items are treated as misses before the sweeper runs.

- **Atomic distributed locks.** `setLock` uses `PutItem` with `attribute_not_exists` condition for an atomic create-only write. No check-then-set race.

## Aligned with Superloom Philosophy

If your project is built on Superloom conventions (the same loader pattern, the same response envelopes, the same testing model), this adapter slots in without you needing to learn anything new.

## Extended Documentation

- [API reference](docs/api.md). The store contract this adapter implements and DynamoDB-specific semantics
- [Configuration](docs/configuration.md). Configuration keys, peer dependencies, environment variables, testing tier
- [Schema](docs/schema.md). Table design, key structure, value encoding, TTL, lock keys
- [Cleanup](docs/cleanup.md). Native TTL, expiry check on read, explicit invalidation
- [Cache parent module](https://github.com/superloomdev/superloom/tree/main/src/helper-modules-server/js-server-helper-cache). The data model, error catalog, and Cache-side configuration this adapter plugs into

## Adding to Your Project

This adapter is installed alongside the Cache parent module and the `nosql-aws-dynamodb` driver helper. The loader pattern is documented in the Cache parent's README.

Do not vendor the source or use it as a local file dependency. The published package is the supported integration path.

## Dependencies

This module has no external dependencies.

It expects three modules in the `Lib` container supplied by the application (Utils, Debug, DynamoDB). For the full dependency breakdown, see [`docs/configuration.md`](docs/configuration.md).

## Testing Status

| Tier | Runtime | Status |
|---|---|---|
| Contract + Integration | DynamoDB Local via Docker Compose | [![Test](https://github.com/superloomdev/superloom/actions/workflows/ci-helper-modules.yml/badge.svg?branch=main)](https://github.com/superloomdev/superloom/actions/workflows/ci-helper-modules.yml) |

Docker lifecycle is fully automatic - `npm test` from `_test/` manages `pretest`/`posttest`. Test runtime details live in [Configuration - Testing Tier](docs/configuration.md#testing-tier).

## License

MIT
