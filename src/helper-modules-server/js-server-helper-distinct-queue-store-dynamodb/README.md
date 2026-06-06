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

// Load distinct-queue with pre-configured DynamoDB adapter
// The adapter owns its configuration internally; pass it to the parent module
Lib.DistinctQueue = require('@superloomdev/js-server-helper-distinct-queue')(Lib, {
  STORE: require('@superloomdev/js-server-helper-distinct-queue-store-dynamodb')({
    table_name: 'queue_jobs',
    lib_dynamodb: Lib.DynamoDB
  })
});

// Optional: idempotent table setup
await Lib.DistinctQueue.Store.setupNewStore(Lib.Instance.initialize());
```

## Configuration

The adapter owns its configuration internally, like any standalone module. Pass configuration when requiring the adapter:

- **`table_name`** — DynamoDB table name for queue records (required)
- **`lib_dynamodb`** — Reference to the `js-server-helper-nosql-aws-dynamodb` instance (required)

The parent module calls `CONFIG.STORE(Lib, ERRORS)` to get the live store; the adapter validates its config at that point.

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
