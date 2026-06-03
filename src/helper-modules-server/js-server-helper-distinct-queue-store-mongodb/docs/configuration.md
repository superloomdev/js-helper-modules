# Configuration — js-server-helper-distinct-queue-store-mongodb

## STORE_CONFIG Keys

The adapter requires a `STORE_CONFIG` object passed to the distinct-queue loader:

```javascript
Lib.DistinctQueue = require('@superloomdev/js-server-helper-distinct-queue')(Lib, {
  STORE: require('@superloomdev/js-server-helper-distinct-queue-store-mongodb'),
  STORE_CONFIG: {
    collection_name: 'queue_jobs',
    lib_mongodb: Lib.MongoDB
  }
});
```

### Required Keys

- **`collection_name`** — MongoDB collection name for queue records
- **`lib_mongodb`** — Reference to the `js-server-helper-nosql-mongodb` instance

## Peer Dependencies

The adapter expects these helpers in the `Lib` container:

- `Lib.Utils` — Type checking and validation
- `Lib.Debug` — Diagnostic logging
- `Lib.MongoDB` — MongoDB driver helper (passed via `STORE_CONFIG.lib_mongodb`)

## Environment Variables

No direct environment variable reads in the adapter. The MongoDB connection string and credentials are handled by the `js-server-helper-nosql-mongodb` driver helper.

Typical test environment:

```bash
MONGODB_CONNECTION_STRING=mongodb://localhost:27017/?directConnection=true
MONGODB_DATABASE=test_db
```

## Example Bootstrap

```javascript
// 1. Load base helpers
Lib.Utils = require('@superloomdev/js-helper-utils');
Lib.Debug = require('@superloomdev/js-helper-debug')(Lib);
Lib.MongoDB = require('@superloomdev/js-server-helper-nosql-mongodb')(Lib, {
  CONNECTION_STRING: process.env.MONGODB_CONNECTION_STRING,
  DATABASE: process.env.MONGODB_DATABASE
});

// 2. Load distinct-queue with MongoDB adapter
const StoreAdapter = require('@superloomdev/js-server-helper-distinct-queue-store-mongodb');
Lib.DistinctQueue = require('@superloomdev/js-server-helper-distinct-queue')(Lib, {
  STORE: StoreAdapter,
  STORE_CONFIG: {
    collection_name: 'queue_jobs',
    lib_mongodb: Lib.MongoDB
  }
});

// 3. Initialize collection (one-time setup)
const instance = Lib.Instance.initialize();
const setup_result = await Lib.DistinctQueue.setupNewStore(instance);
if (!setup_result.success) {
  console.error('Failed to setup MongoDB store:', setup_result.error);
}
```

## Index Creation

The `setupNewStore()` method is a no-op for this adapter. MongoDB's implicit `_id` index covers all queries. Run once at application startup:

```javascript
// Application bootstrap
await Lib.DistinctQueue.setupNewStore(instance);
```

The index creation is idempotent — safe to call on every startup.
