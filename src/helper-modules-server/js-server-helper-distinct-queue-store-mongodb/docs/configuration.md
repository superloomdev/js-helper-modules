# Configuration - helper-distinct-queue-store-mongodb

## Loader Pattern

The adapter is a store implementation for `helper-distinct-queue`.
The parent module receives the store factory function and store config
separately, then calls the factory internally to instantiate the store.

```javascript
// Load the adapter factory and pass it to the parent module
Lib.DistinctQueue = require('helper-distinct-queue')(Lib, {
  STORE: require('helper-distinct-queue-store-mongodb'),
  STORE_CONFIG: {
    collection_name: 'queue_jobs',
    lib_mongodb: Lib.MongoDB
  }
});
```

## Configuration Keys

### `collection_name`

**Type:** `string`  
**Required:** Yes

The MongoDB collection name for queue records. MongoDB creates the collection
and implicit `_id` index automatically on first write.

```javascript
collection_name: 'myapp_queue_jobs'
```

## Injected Dependencies

The adapter reads these from the injected `Lib` container:

| `Lib.*` | Source | Used for |
|---|---|---|
| `Lib.Utils` | `helper-utils` | Type checks |
| `Lib.Debug` | `helper-debug` | Diagnostic logging on driver failures |
| `Lib.MongoDB` | `helper-nosql-mongodb` | The MongoDB driver used for all storage operations |

```javascript
Lib.MongoDB = require('helper-nosql-mongodb')(Lib, {
  CONNECTION_STRING: process.env.MONGODB_CONNECTION_STRING,
  DATABASE: process.env.MONGODB_DATABASE
});
```

## Full Configuration Example

```javascript
// 1. Load base helpers
Lib.Utils = require('helper-utils');
Lib.Debug = require('helper-debug')(Lib);
Lib.Instance = require('helper-instance')(Lib);

// 2. Load MongoDB helper
Lib.MongoDB = require('helper-nosql-mongodb')(Lib, {
  CONNECTION_STRING: process.env.MONGODB_CONNECTION_STRING,
  DATABASE: process.env.MONGODB_DATABASE
});

// 3. Load distinct-queue with the store factory and its config
Lib.DistinctQueue = require('helper-distinct-queue')(Lib, {
  STORE: require('helper-distinct-queue-store-mongodb'),
  STORE_CONFIG: {
    collection_name: 'queue_jobs',
    lib_mongodb: Lib.MongoDB
  }
});

// 4. Idempotent collection setup (no-op for MongoDB - run once at first deploy)
const Store = require('helper-distinct-queue-store-mongodb')(Lib, {
  collection_name: 'queue_jobs'
});
await Store.setupNewStore(Lib.Instance.initialize());
```

## Local Testing Configuration

Typical test environment variables:

```bash
MONGO_URL=mongodb://127.0.0.1:27020/?directConnection=true
MONGO_DATABASE=test_db
```

See the `_test/` directory for a complete Docker Compose setup with MongoDB.

## Validation

The adapter validates configuration at load time and throws if:

- `collection_name` is missing or empty
- `Lib.MongoDB` is not injected

```
[distinct-queue-store-mongodb] CONFIG.collection_name is required and must be a non-empty string
[distinct-queue-store-mongodb] Lib.MongoDB is required
```
