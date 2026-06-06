# js-server-helper-distinct-queue-store-mongodb

[![Test](https://github.com/superloomdev/js-helper-modules/actions/workflows/ci-publish-helper-modules.yml/badge.svg)](https://github.com/superloomdev/js-helper-modules/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js >=24](https://img.shields.io/badge/node-%3E%3D24-brightgreen.svg)](https://nodejs.org/)

MongoDB store adapter for [`js-server-helper-distinct-queue`](https://github.com/superloomdev/js-helper-modules).

Uses a **smart subdocument `_id` design** to enable efficient queue operations without secondary indexes. Records are retrieved using only `tenant_id` and `resource_id` via MongoDB's implicit `_id` index — no need to know `data_version` or `request_id`. Supports prefix queries, chronological sorting, and batch cleanup in single roundtrips.

## Installation

```bash
npm install @superloomdev/js-server-helper-distinct-queue-store-mongodb
```

## Usage

```javascript
// Load base helpers
Lib.Utils = require('@superloomdev/js-helper-utils');
Lib.Debug = require('@superloomdev/js-helper-debug')(Lib);
Lib.Instance = require('@superloomdev/js-server-helper-instance')(Lib);

// Load MongoDB driver helper
Lib.MongoDB = require('@superloomdev/js-server-helper-nosql-mongodb')(Lib, {
  CONNECTION_STRING: process.env.MONGODB_CONNECTION_STRING,
  DATABASE: process.env.MONGODB_DATABASE
});

// Load the store adapter (owns its own Lib, Config, and ERRORS)
const Store = require('@superloomdev/js-server-helper-distinct-queue-store-mongodb')(Lib, {
  collection_name: 'queue_jobs'
});

// Pass the ready-to-use store to the parent module
Lib.DistinctQueue = require('@superloomdev/js-server-helper-distinct-queue')(Lib, {
  Store: Store
});

// Initialize collection (one-time provisioning — run only on first setup, not on every boot)
const instance = Lib.Instance.initialize();
await Store.setupNewStore(instance);
```

## Configuration

- **`collection_name`** — MongoDB collection name for queue records (required)
- `Lib.MongoDB` is read from the injected `Lib` container — no separate `lib_mongodb` config key

See [`docs/schema.md`](docs/schema.md) for detailed schema documentation and index design.

## Testing

```bash
cd _test && npm install && npm test
```

Docker lifecycle (up before, down after) is managed automatically by `pretest`/`posttest` hooks.

## License

MIT
