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

This repository contains all JavaScript helper modules in the Superloom framework. Modules cover databases, storage, queues, auth, verification, logging, and utilities. Each module is versioned and tested on its own.

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

## Aligned with Superloom Philosophy

These modules follow Superloom conventions. If your project already uses Superloom, these modules slot in without new patterns to learn.

## Extended Documentation

- [Framework docs](https://superloom.dev/docs/) — architecture, patterns, standards
- [Getting started](https://superloom.dev/docs/guide/getting-started) — how to add modules to your project
- [Module structure](https://superloom.dev/docs/modules/module-structure-js) — how modules are organized
- [Testing guide](https://superloom.dev/docs/dev/testing-local-modules) — how to run module tests

## Adding to Your Project

Modules install as peer dependencies through the Superloom loader pattern. See [Getting Started](https://superloom.dev/docs/guide/getting-started) for the three integration approaches.

## License

MIT — free for commercial use.
