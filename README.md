<div align="center">
  <a href="https://superloom.dev">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/superloomdev/superloom/main/superloom.png" height="80">
      <img alt="Superloom" src="https://raw.githubusercontent.com/superloomdev/superloom/main/superloom.png" height="80">
    </picture>
  </a>
  <h1>JavaScript Helper Modules</h1>
  <p>All JavaScript helper modules for the Superloom framework. Part of <a href="https://superloom.dev">Superloom</a>.</p>

  [![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
  [![Node.js 24+](https://img.shields.io/badge/Node.js-24%2B-brightgreen.svg)](https://nodejs.org)

</div>

## What this is

This repository contains all JavaScript helper modules in the Superloom framework, built to the specifications in the [framework documentation](https://superloom.dev/docs/languages/js/index). Modules cover databases, storage, queues, auth, verification, logging, and utilities. Each module is versioned and tested on its own.

## Why use these modules

- **Library updates won't break your code.** When the underlying driver or SDK changes, only the module needs updating. Your application code stays exactly as it is.

- **Pre-tested at every release.** Every module has a full test suite that runs in CI on every push. Your project trusts the wrapper instead of re-verifying connectivity code.

- **Designed for human review.** The code uses section banners, short functions, and scoped comments. A reviewer can read any module top to bottom and spot what an AI got wrong. Open any module file to see the structure.

- **Hot-swappable backends.** Switch from Postgres to MySQL or from MongoDB to DynamoDB by changing one loader line. The rest of your code keeps working.

- **Explicit credentials.** Credentials pass through the loader config, not from ambient environment chains. This prevents accidentally connecting to the wrong account from a developer machine or CI runner.

## Module Organization

Modules are organized into three categories:

| Category | Path | Use case |
|---|---|---|
| **Core** | `src/helper-modules-core/` | Utilities that run in any JavaScript environment |
| **Server** | `src/helper-modules-server/` | Modules that need Node.js (databases, HTTP, crypto) |
| **Client** | `src/helper-modules-client/` | Browser and mobile environments |

## Family Packages

Every module in the repository. Class definitions are in [module-classes.md](https://superloom.dev/docs/languages/js/module-classes).

### Core

| Package | Description | Class |
|---|---|---|
| [`@superloomdev/js-helper-utils`](src/helper-modules-core/js-helper-utils) | Utility functions for type checks, validation, sanitization, and data manipulation | A |
| [`@superloomdev/js-helper-debug`](src/helper-modules-core/js-helper-debug) | Structured logging library with log levels, dual output formats, and performance audit support | A |
| [`@superloomdev/js-helper-time`](src/helper-modules-core/js-helper-time) | Date/Time utility library. Platform-agnostic date math, timezone conversion, and formatting | A |
| [`@superloomdev/js-helper-money`](src/helper-modules-core/js-helper-money) | Money utility library. Currency metadata, float-safe rounding, formatting, and aggregation | A |

### Server

| Package | Description | Class |
|---|---|---|
| [`@superloomdev/js-server-helper-instance`](src/helper-modules-server/js-server-helper-instance) | Request instance lifecycle manager. Initialize, cleanup, and background routine tracking | B |
| [`@superloomdev/js-server-helper-crypto`](src/helper-modules-server/js-server-helper-crypto) | Server-side cryptography utilities for Node.js. Hashing, encryption, UUID, random strings | B |
| [`@superloomdev/js-server-helper-http`](src/helper-modules-server/js-server-helper-http) | Outgoing HTTP client for Node.js. Native fetch wrapper with auth support and timeouts | B |
| [`@superloomdev/js-server-helper-sql-postgres`](src/helper-modules-server/js-server-helper-sql-postgres) | PostgreSQL client with connection pooling (Postgres 15+). Async/await, multi-DB capable | C |
| [`@superloomdev/js-server-helper-sql-mysql`](src/helper-modules-server/js-server-helper-sql-mysql) | MySQL client with connection pooling (MySQL 8+). Async/await, multi-DB capable | C |
| [`@superloomdev/js-server-helper-sql-sqlite`](src/helper-modules-server/js-server-helper-sql-sqlite) | SQLite client built on Node.js built-in node:sqlite module. Async/await, multi-DB capable | C |
| [`@superloomdev/js-server-helper-nosql-mongodb`](src/helper-modules-server/js-server-helper-nosql-mongodb) | MongoDB CRUD, batch, query, scan, transactions. Lazy-loaded native driver. Connection pooling | C |
| [`@superloomdev/js-server-helper-nosql-aws-dynamodb`](src/helper-modules-server/js-server-helper-nosql-aws-dynamodb) | AWS DynamoDB CRUD, batch, query, scan. Lazy-loaded SDK v3. Explicit credentials | D |
| [`@superloomdev/js-server-helper-storage-aws-s3`](src/helper-modules-server/js-server-helper-storage-aws-s3) | AWS S3 wrapper for cloud file storage. List, upload, download, delete, copy, move | D |
| [`@superloomdev/js-server-helper-storage-aws-s3-url-signer`](src/helper-modules-server/js-server-helper-storage-aws-s3-url-signer) | S3 presigned URL signer for direct browser uploads and downloads | D |
| [`@superloomdev/js-server-helper-queue-aws-sqs`](src/helper-modules-server/js-server-helper-queue-aws-sqs) | AWS SQS message queue wrapper. Send, receive, delete, and schedule messages | D |
| [`@superloomdev/js-server-helper-auth`](src/helper-modules-server/js-server-helper-auth) | Session lifecycle and authentication. Multi-instance per actor_type. Store adapters are separate packages | E |
| [`@superloomdev/js-server-helper-verify`](src/helper-modules-server/js-server-helper-verify) | One-time verification code lifecycle: generate, store, validate, consume. Pluggable storage adapters | E |
| [`@superloomdev/js-server-helper-logger`](src/helper-modules-server/js-server-helper-logger) | Compliance-friendly action log with structured per-action data and optional IP/user-agent capture | E |
| [`@superloomdev/js-server-helper-distinct-queue`](src/helper-modules-server/js-server-helper-distinct-queue) | Last-write-wins coalescing queue keyed by tenant and resource. Built-in stores for DynamoDB and MongoDB | E |
| [`@superloomdev/js-server-helper-http-gateway`](src/helper-modules-server/js-server-helper-http-gateway) | Incoming HTTP gateway. Normalizes raw runtime request data into a per-request instance. Runtime adapters are separate packages | E |
| [`@superloomdev/js-server-helper-auth-store-sqlite`](src/helper-modules-server/js-server-helper-auth-store-sqlite) | SQLite session store adapter for helper-auth. 8-method store contract | F |
| [`@superloomdev/js-server-helper-auth-store-postgres`](src/helper-modules-server/js-server-helper-auth-store-postgres) | Postgres session store adapter for helper-auth. 8-method store contract | F |
| [`@superloomdev/js-server-helper-auth-store-mysql`](src/helper-modules-server/js-server-helper-auth-store-mysql) | MySQL session store adapter for helper-auth. 8-method store contract | F |
| [`@superloomdev/js-server-helper-auth-store-mongodb`](src/helper-modules-server/js-server-helper-auth-store-mongodb) | MongoDB session store adapter for helper-auth. 8-method store contract | F |
| [`@superloomdev/js-server-helper-auth-store-dynamodb`](src/helper-modules-server/js-server-helper-auth-store-dynamodb) | DynamoDB session store adapter for helper-auth. 8-method store contract | F |
| [`@superloomdev/js-server-helper-verify-store-sqlite`](src/helper-modules-server/js-server-helper-verify-store-sqlite) | SQLite store adapter for helper-verify. 6-method store contract | F |
| [`@superloomdev/js-server-helper-verify-store-postgres`](src/helper-modules-server/js-server-helper-verify-store-postgres) | Postgres store adapter for helper-verify. 6-method store contract | F |
| [`@superloomdev/js-server-helper-verify-store-mysql`](src/helper-modules-server/js-server-helper-verify-store-mysql) | MySQL store adapter for helper-verify. 6-method store contract | F |
| [`@superloomdev/js-server-helper-verify-store-mongodb`](src/helper-modules-server/js-server-helper-verify-store-mongodb) | MongoDB store adapter for helper-verify. 6-method store contract | F |
| [`@superloomdev/js-server-helper-verify-store-dynamodb`](src/helper-modules-server/js-server-helper-verify-store-dynamodb) | DynamoDB store adapter for helper-verify. 6-method store contract | F |
| [`@superloomdev/js-server-helper-logger-store-sqlite`](src/helper-modules-server/js-server-helper-logger-store-sqlite) | SQLite store adapter for helper-logger. 5-method store contract | F |
| [`@superloomdev/js-server-helper-logger-store-postgres`](src/helper-modules-server/js-server-helper-logger-store-postgres) | Postgres store adapter for helper-logger. 5-method store contract | F |
| [`@superloomdev/js-server-helper-logger-store-mysql`](src/helper-modules-server/js-server-helper-logger-store-mysql) | MySQL store adapter for helper-logger. 5-method store contract | F |
| [`@superloomdev/js-server-helper-logger-store-mongodb`](src/helper-modules-server/js-server-helper-logger-store-mongodb) | MongoDB store adapter for helper-logger. 5-method store contract | F |
| [`@superloomdev/js-server-helper-logger-store-dynamodb`](src/helper-modules-server/js-server-helper-logger-store-dynamodb) | DynamoDB store adapter for helper-logger. 5-method store contract | F |
| [`@superloomdev/js-server-helper-distinct-queue-store-dynamodb`](src/helper-modules-server/js-server-helper-distinct-queue-store-dynamodb) | DynamoDB store adapter for helper-distinct-queue. 4-method store contract | F |
| [`@superloomdev/js-server-helper-distinct-queue-store-mongodb`](src/helper-modules-server/js-server-helper-distinct-queue-store-mongodb) | MongoDB store adapter for helper-distinct-queue. 4-method store contract | F |
| [`@superloomdev/js-server-helper-http-gateway-adapter-aws-apigateway`](src/helper-modules-server/js-server-helper-http-gateway-adapter-aws-apigateway) | AWS Lambda + API Gateway adapter for helper-http-gateway. 3-method adapter contract | F |
| [`@superloomdev/js-server-helper-http-gateway-adapter-express`](src/helper-modules-server/js-server-helper-http-gateway-adapter-express) | Express adapter for helper-http-gateway. 3-method adapter contract | F |

### Client

| Package | Description | Class |
|---|---|---|
| [`@superloomdev/js-client-helper-crypto`](src/helper-modules-client/js-client-helper-crypto) | Client-side crypto utilities. UUID generation, random strings, base64 helpers | A |
| [`@superloomdev/js-client-helper-styler`](src/helper-modules-client/js-client-helper-styler) | Pure JavaScript styling engine. Theme derivation from template + base + variant | G |
| [`@superloomdev/js-client-helper-styler-ext-react`](src/helper-modules-client/js-client-helper-styler-ext-react) | React extension for js-client-helper-styler. ThemeProvider, useTheme, useStyles hooks | H |

## Aligned with Superloom Philosophy

These modules implement the patterns documented in the [Superloom framework](https://superloom.dev/docs/principles/engineering-philosophy): one loader shape, one response envelope, one testing contract. If your project already uses Superloom, these modules slot in without new patterns to learn. The documentation is the source of truth; this repository is the reference implementation built from it.

## Extended Documentation

- [Framework docs](https://superloom.dev/docs/) - architecture, patterns, standards
- [Getting started](https://superloom.dev/docs/guide/getting-started) - how to add modules to your project
- [Module structure](https://superloom.dev/docs/languages/js/module-structure) - how modules are organized
- [Module catalogs](https://superloom.dev/docs/languages/js/catalog-core) - [core](https://superloom.dev/docs/languages/js/catalog-core), [server](https://superloom.dev/docs/languages/js/catalog-server), and [client](https://superloom.dev/docs/languages/js/catalog-client) module tiers
- [Testing guide](https://superloom.dev/docs/dev/testing-local-modules) - how to run module tests

## Adding to Your Project

Modules install as peer dependencies through the Superloom loader pattern. See [Getting Started](https://superloom.dev/docs/guide/getting-started) for the three integration approaches.

## License

MIT - free for commercial use.
