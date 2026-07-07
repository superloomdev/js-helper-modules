# helper-distinct-queue-store-mongodb

[![Test](https://github.com/superloomdev/js-helper-modules/actions/workflows/ci-publish-helper-modules.yml/badge.svg)](https://github.com/superloomdev/js-helper-modules/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js >=24](https://img.shields.io/badge/node-%3E%3D24-brightgreen.svg)](https://nodejs.org/)

MongoDB store adapter for [`helper-distinct-queue`](https://github.com/superloomdev/js-helper-modules).

Uses a **smart subdocument `_id` design** to enable efficient queue operations without secondary indexes. Records are retrieved using only `tenant_id` and `resource_id` via MongoDB's implicit `_id` index - no need to know `data_version` or `request_id`. Supports prefix queries, chronological sorting, and batch cleanup in single roundtrips.

## Usage

```javascript
// Load base helpers
Lib.Utils = require('helper-utils');
Lib.Debug = require('helper-debug')(Lib);
Lib.Instance = require('helper-instance')(Lib);

// Load MongoDB driver helper
Lib.MongoDB = require('helper-nosql-mongodb')(Lib, {
  CONNECTION_STRING: process.env.MONGODB_CONNECTION_STRING,
  DATABASE: process.env.MONGODB_DATABASE
});

// Load distinct-queue with the store factory and its config
Lib.DistinctQueue = require('helper-distinct-queue')(Lib, {
  STORE: require('helper-distinct-queue-store-mongodb'),
  STORE_CONFIG: {
    collection_name: 'queue_jobs',
    lib_mongodb: Lib.MongoDB
  }
});

// Optional: idempotent collection setup (run once at first deploy)
const Store = require('helper-distinct-queue-store-mongodb')(Lib, {
  collection_name: 'queue_jobs'
});
await Store.setupNewStore(Lib.Instance.initialize());
```

## Configuration

- **`collection_name`** - MongoDB collection name for queue records (required)
- `Lib.MongoDB` is read from the injected `Lib` container - no separate `lib_mongodb` config key

## Extended Documentation

- [`docs/api.md`](docs/api.md) - Store contract method signatures, return shapes, and lifecycle
- [`docs/schema.md`](docs/schema.md) - Document shape, index design, query patterns, and effort analysis
- [`docs/configuration.md`](docs/configuration.md) - Full loader pattern, configuration keys, and dependency table

## Testing

```bash
cd _test && npm install && npm test
```

Docker lifecycle (up before, down after) is managed automatically by `pretest`/`posttest` hooks.

## License

MIT
