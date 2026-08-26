# @superloomdev/js-server-helper-kv-valkey

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![Node.js 24+](https://img.shields.io/badge/Node.js-24%2B-brightgreen.svg)](https://nodejs.org)

A Valkey and Redis key-value driver for Node.js that insulates your application from client library changes and ships pre-tested, so your project never has to re-verify key-value connectivity. Part of [Superloom](https://superloom.dev).

**Compatible with Valkey 7.2+ and Redis OSS 2.x through 7.2.x.** Valkey 7.2.4 is a fork of Redis OSS 7.2.4, so the two are the same engine: identical RESP wire protocol, identical command set, and interchangeable RDB and AOF file formats. Existing Redis client libraries connect to Valkey with no code change. This module talks RESP and never inspects which engine answered.

**Redis Community Edition 7.4 and later are out of scope**, for licensing reasons. Redis Inc. relicensed Redis away from open source at 7.4, which is the event that caused the Valkey fork. This module targets the open-source lineage. RDB files written by Redis CE 7.4+ are not readable by Valkey, so the two are not interchangeable at the data-file level. The module will usually function against a CE 7.4+ server, but that configuration is untested and unsupported.

**Single instance only.** Cluster mode is not supported. The reason is that cross-shard multi-key writes cannot be atomic, so `setMany` would lose its guarantee under sharding. Use a managed service if sharding is required. ElastiCache with cluster mode disabled is supported; cluster mode enabled is not.

## What This Is

A thin, opinionated layer over the [ioredis](https://github.com/redis/ioredis) client with built-in lazy connection, request-level timing, key prefix isolation, JSON serialization, and a single consistent response shape across every operation.

Every read and every write returns the same envelope:

```
success / data / error
```

Error handling, result reading, and exception expectations are the same in every place you touch the key-value store. There are no surprises between functions, and operational failures never throw.

## Why Use This Module

- **Library updates won't break your code.** When the underlying client ships a breaking change, only this module needs updating. Your application code stays exactly as it is.

- **Pre-tested at every release.** A full test suite runs against a real Valkey instance in Docker in CI on every push. Your project trusts the wrapper instead of re-verifying key-value plumbing on each release.

- **Designed for human review.** The code is laid out as clearly-marked visual sections so a reviewer can read it top to bottom in order.

- **Built-in observability.** Every operation is timed against the active request and routed into your structured logs automatically.

- **Key prefix isolation.** `KEY_PREFIX` gives every loader call its own keyspace without separate servers, and the prefix is transparently stripped from all read results including `scan`.

## Connection Lifecycle

The ioredis client is created lazily on the first call and shared for the process lifetime. Its teardown is registered with `helper-instance` so the deployment decides when it closes: at `SIGTERM` on a persistent server, or after every request on a serverless runtime. The module never decides when to close the connection.

## Hot-Swappable with Other Backends

This module is part of a key-value family. The `Lib.KV` container slot is family-generic: any future `kv-*` sibling with the same API surface satisfies the same slot.

## Extended Documentation

Extended documentation lives alongside the source on GitHub:

- [API reference](https://github.com/superloomdev/superloom/blob/main/src/helper-modules-server/js-server-helper-kv-valkey/docs/api.md) - every exported function with its signature, parameters, return shape, and worked examples
- [Configuration](https://github.com/superloomdev/superloom/blob/main/src/helper-modules-server/js-server-helper-kv-valkey/docs/configuration.md) - all config keys, environment variables, ElastiCache setup, TLS, alternative clients
- [Superloom](https://superloom.dev) - the framework

## Adding to Your Project

Install this module as a peer dependency in your project's `package.json` and inject its peer modules through the standard Superloom loader. Do not vendor the source or use it as a local file dependency. The published package is the supported integration path.

## Dependencies

This module bundles one runtime npm package:

- **`ioredis`** - Pure JavaScript Redis/Valkey client. Used because the RESP wire protocol is simple and well-documented, and a pure JS client avoids per-platform native binaries.

It expects three peer modules in the `Lib` container (Utils, Debug, Instance). For the full dependency breakdown, see [`docs/configuration.md`](docs/configuration.md).

## Testing Status

| Tier | Runtime | Status |
|---|---|---|
| Emulated | Valkey in Docker | [![Test](https://github.com/superloomdev/superloom/actions/workflows/ci-helper-modules.yml/badge.svg?branch=main)](https://github.com/superloomdev/superloom/actions/workflows/ci-helper-modules.yml) |
| Integration | Real Valkey or Redis OSS server | ![Integration Tests](https://img.shields.io/badge/Integration_Tests-not_yet_tested-lightgrey) |

A Valkey container is the same engine as Redis OSS, so if the suite passes against local Valkey, the module works against any Redis OSS 7.2- or Valkey 7.2+ server. ElastiCache with cluster mode disabled is verified by the local Valkey suite and is not tested against AWS directly.

## License

MIT
