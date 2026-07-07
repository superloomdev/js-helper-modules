# Configuration - helper-distinct-queue-store-mongodb

## Loader Pattern

The adapter is a store implementation for `helper-distinct-queue`.
The project loader injects `Lib` (including `Lib.MongoDB`), and the adapter
owns its own configuration. It returns a ready-to-use store object that
you provide to the parent module's `CONFIG.Store` key.

```javascript
// Load the adapter with Lib injected and its own config
const Store = require('helper-distinct-queue-store-mongodb')(Lib, {
  collection_name: 'distinct_queue_jobs'
});

// Pass the ready-to-use store to the parent module
Lib.DistinctQueue = require('helper-distinct-queue')(Lib, {
  Store: Store
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

// 3. Load the store adapter (Lib injected), then the parent module
const Store = require('helper-distinct-queue-store-mongodb')(Lib, {
  collection_name: 'queue_jobs'
});
Lib.DistinctQueue = require('helper-distinct-queue')(Lib, {
  Store: Store
});

// 4. Idempotent collection setup (no-op for MongoDB - run once at first deploy)
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
