# @superloomdev/js-server-helper-nosql-aws-dynamodb-admin

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![Node.js 24+](https://img.shields.io/badge/Node.js-24%2B-brightgreen.svg)](https://nodejs.org)

An AWS DynamoDB control-plane helper for Node.js that provisions tables and TTL configuration with admin credentials, separate from the data-plane driver. Part of [Superloom](https://superloom.dev).

## What This Is

A thin, opinionated layer over the [AWS SDK v3 DynamoDB client](https://github.com/aws/aws-sdk-js-v3) that handles control-plane operations: creating and deleting tables, waiting for table active status, enabling TTL, and describing tables. It connects with elevated IAM credentials that are distinct from the read/write user the data-plane module uses.

Every operation returns the same envelope:

```
success / data / error
```

All provisioning functions are idempotent. Creating a table that already exists is a success, not an error. Enabling TTL on an attribute that already has TTL is a success, not an error. This makes the module safe to call at boot time on every startup without worrying about duplicates.

## Why Use This Module

- **Library updates won't break your code.** When the underlying SDK ships a breaking change, only this module needs updating. Your provisioning scripts stay exactly as they are.

- **Pre-tested at every release.** A full test suite runs against a real DynamoDB Local instance in Docker on every push. Your project trusts the wrapper instead of re-verifying admin plumbing on each release.

- **Designed for human review.** The code is laid out as clearly-marked visual sections (section banners, short functions, scoped comments) so a reviewer can read it top to bottom in order and finish without ever getting lost in dense logic. Open `dynamodb-admin.js` to see the structure.

- **Built-in observability.** Every operation can be timed against the active request and routed into your structured logs automatically. No instrumentation code to write.

- **Least-privilege credential separation.** The admin module uses a separate set of AWS credentials from the data-plane driver. Runtime deployments hold read/write credentials only. The elevated IAM policy (dynamodb:CreateTable, DeleteTable, UpdateTimeToLive, etc.) lives in a separate config that ships with migration runners or provisioning scripts, not with the application.

- **Idempotent provisioning.** Every function is safe to call repeatedly. Already-exists is a success with `created: false`, never an error. This means provisioning scripts can run on every boot without conditional checks.

## Connection Lifecycle

The DynamoDBClient is created lazily on the first call and shared for the process lifetime. Its teardown is registered with `helper-instance` so the deployment decides when it closes: at `SIGTERM` on a persistent server, or after every request on a serverless runtime. The module never decides when to close the connection.

## Aligned with Superloom Philosophy

If your project is built on Superloom conventions (the same loader pattern, the same response envelope, the same testing model), this module slots in without you needing to learn anything new. It is written using the same opinionated principles, so adopting it does not introduce inconsistency into your codebase.

If you are not yet using Superloom, the principles are documented at [superloom.dev](https://superloom.dev).

## Extended Documentation

Extended documentation lives alongside the source on GitHub:

- [API reference](https://github.com/superloomdev/superloom/blob/main/src/helper-modules-server/js-server-helper-nosql-aws-dynamodb-admin/docs/api.md) - every exported function with its signature, parameters, return shape, and worked examples
- [Configuration](https://github.com/superloomdev/superloom/blob/main/src/helper-modules-server/js-server-helper-nosql-aws-dynamodb-admin/docs/configuration.md) - all config keys, environment variables, credential separation, required IAM policies
- [Superloom](https://superloom.dev) - the framework

## Adding to Your Project

Install this module as a peer dependency in your project's `package.json` and inject its peer modules through the standard Superloom loader. Do not vendor the source or use it as a local file dependency. The published package is the supported integration path.

The peer-dependency / loader pattern, including the full `Lib` container shape, is documented in [Server Loader Architecture](https://github.com/superloomdev/superloom/blob/main/docs/server/server-loader.md). For one-time GitHub Packages registry setup, see the [npmrc setup guide](https://github.com/superloomdev/superloom/blob/main/docs/dev/npmrc-setup.md).

## Dependencies

This module bundles one runtime npm package:

- **`@aws-sdk/client-dynamodb`** (AWS SDK v3). DynamoDB client for control-plane commands (CreateTable, DeleteTable, DescribeTable, UpdateTimeToLive, DescribeTimeToLive, ListTables). Used because the AWS SDK handles request signing, retry logic, and endpoint resolution that cannot be reimplemented in-house

It expects three peer modules in the `Lib` container (Utils, Debug, Instance). For the full dependency breakdown, see [`docs/configuration.md`](https://github.com/superloomdev/superloom/blob/main/src/helper-modules-server/js-server-helper-nosql-aws-dynamodb-admin/docs/configuration.md).

## Testing Status

| Tier | Runtime | Status |
|---|---|---|
| Emulated | DynamoDB Local in Docker | [![Test](https://github.com/superloomdev/superloom/actions/workflows/ci-helper-modules.yml/badge.svg?branch=main)](https://github.com/superloomdev/superloom/actions/workflows/ci-helper-modules.yml) |
| Integration | Real AWS DynamoDB | ![Integration Tests](https://img.shields.io/badge/Integration_Tests-not_yet_tested-lightgrey) |

The emulated tier runs DynamoDB Local on port 8001 (offset from the data-plane module's 8000) so parallel local runs never collide. Test runtime details live in [Configuration - Testing Tiers](https://github.com/superloomdev/superloom/blob/main/src/helper-modules-server/js-server-helper-nosql-aws-dynamodb-admin/docs/configuration.md#testing-tiers).

## License

MIT
