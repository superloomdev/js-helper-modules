# js-server-helper-distinct-queue-store-dynamodb

[![Test](https://github.com/superloomdev/js-helper-modules/actions/workflows/ci-publish-helper-modules.yml/badge.svg)](https://github.com/superloomdev/js-helper-modules/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js >=24](https://img.shields.io/badge/node-%3E%3D24-brightgreen.svg)](https://nodejs.org/)

DynamoDB store adapter for [`js-server-helper-distinct-queue`](https://github.com/superloomdev/js-helper-modules).

Uses a **composite primary key design** (`p` = tenant_id, `id` = sort key with `\u001F` delimiter) to enable efficient queue operations without Global Secondary Indexes. Records are retrieved using `begins_with` queries on the sort key — no need to know `data_version` or `request_id`. Supports prefix queries, chronological sorting, and batch cleanup.

## Installation

```bash
npm install @superloomdev/js-server-helper-distinct-queue-store-dynamodb
```

## Usage

```javascript
// Load base helpers
Lib.Utils = require('@superloomdev/js-helper-utils');
Lib.Debug = require('@superloomdev/js-helper-debug')(Lib);
Lib.Instance = require('@superloomdev/js-server-helper-instance')(Lib);

// Load DynamoDB driver helper
Lib.DynamoDB = require('@superloomdev/js-server-helper-nosql-aws-dynamodb')(Lib, {
  REGION: process.env.AWS_REGION,
  KEY: process.env.AWS_ACCESS_KEY_ID,
  SECRET: process.env.AWS_SECRET_ACCESS_KEY
});

// Load the DynamoDB store adapter
Lib.DistinctQueueStore = require('@superloomdev/js-server-helper-distinct-queue-store-dynamodb')(Lib, {
  table_name: 'queue_jobs'
});

// Load distinct-queue with the ready-to-use store object
Lib.DistinctQueue = require('@superloomdev/js-server-helper-distinct-queue')(Lib, {
  Store: Lib.DistinctQueueStore
});

// Optional: idempotent table setup
await Lib.DistinctQueue.Store.setupNewStore(Lib.Instance.initialize());
```

## Configuration

The adapter is a store implementation for `js-server-helper-distinct-queue`.
It is loaded with dependency injection: the project loader provides `Lib`
(including `Lib.DynamoDB`), and the adapter owns its own configuration:

- **`table_name`** — DynamoDB table name for queue records (required)
- **`KEY_DELIMITER`** — Sort key field separator (default: `\u001F`, override with care)

The adapter returns a ready-to-use store object that the parent module
consumes via its `CONFIG.Store` key.

See [`docs/schema.md`](docs/schema.md) for detailed schema documentation and key design.
See [`docs/configuration.md`](docs/configuration.md) for complete configuration options.

## Testing

```bash
cd _test
npm install
npm test
```

DynamoDB Local is managed automatically via Docker Compose (port 8000).

## License

MIT
