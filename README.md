<div align="center">
  <a href="https://superloom.dev">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/superloomdev/superloom/main/superloom.png" height="80">
      <img alt="Superloom" src="https://raw.githubusercontent.com/superloomdev/superloom/main/superloom.png" height="80">
    </picture>
  </a>
  <h1>js-helper-modules</h1>
  <p><strong>JavaScript helper modules for the Superloom framework.</strong></p>

  [![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
  [![Node.js 24+](https://img.shields.io/badge/Node.js-24%2B-brightgreen.svg)](https://nodejs.org)

</div>

## What's Here

30+ independently versioned helper modules across **databases** (Postgres, MySQL, SQLite, MongoDB, DynamoDB), **storage and queues** (S3, SQS), **auth and verification** (sessions, JWT, one-time codes with hot-swappable store adapters), **observability** (structured logging, compliance-friendly action logs), and **utilities** (crypto, HTTP, time, instance lifecycle).

Each module lives under `src/helper-modules-{category}/` and is independently testable and publishable.

| Category | Path | Published scope |
|---|---|---|
| Core (platform-agnostic) | `src/helper-modules-core/` | `@superloomdev/js-helper-*` |
| Server (Node.js runtime) | `src/helper-modules-server/` | `@superloomdev/js-server-helper-*` |
| Client (browser/mobile) | `src/helper-modules-client/` | `@superloomdev/js-*-helper-*` |

## Framework Conventions

All module conventions — structure, patterns, testing strategy, versioning, publishing, and coding standards — live in the **[superloom](https://github.com/superloomdev/superloom)** repository. Read that before contributing to or modifying any module here.

## Quick Links

| Resource | Link |
|---|---|
| Framework docs | [superloom.dev/docs](https://superloom.dev/docs/) |
| Module structure | [docs/modules/module-structure-js](https://superloom.dev/docs/modules/module-structure-js) |
| Testing guide | [docs/dev/testing-local-modules](https://superloom.dev/docs/dev/testing-local-modules) |
| Publishing guide | [docs/dev/cicd-publishing](https://superloom.dev/docs/dev/cicd-publishing) |

## License

[MIT](LICENSE) — free for commercial use.
