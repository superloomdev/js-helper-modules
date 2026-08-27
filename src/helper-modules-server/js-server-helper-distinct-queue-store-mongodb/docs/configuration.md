# Configuration - helper-distinct-queue-store-mongodb

## Loader Pattern

The adapter is a store implementation for `helper-distinct-queue`.
The project loader injects `Lib` (including `Lib.MongoDB`), and the adapter
owns its own configuration. It returns a ready-to-use store object that
you provide to the parent module's `CONFIG.Store` key.

```javascript
// Load the adapter with Lib injected and its own config
import distinctQueueStoreMongodb from 'helper-distinct-queue-store-mongodb';
import distinctQueue from 'helper-distinct-queue';

const Store = distinctQueueStoreMongodb(Lib, {
  COLLECTION_NAME: 'distinct_queue_jobs'
});

// Pass the ready-to-use store to the parent module
Lib.DistinctQueue = distinctQueue(Lib, {
  Store: Store
});
```

## Configuration Keys

### `COLLECTION_NAME`

**Type:** `string`  
**Required:** Yes

The MongoDB collection name for queue records. MongoDB creates the collection
and implicit `_id` index automatically on first write.

```javascript
COLLECTION_NAME: 'myapp_queue_jobs'
```

## Injected Dependencies

The adapter reads these from the injected `Lib` container:

| `Lib.*` | Source | Used for |
|---|---|---|
| `Lib.Utils` | `helper-utils` | Type checks |
| `Lib.Debug` | `helper-debug` | Diagnostic logging on driver failures |
| `Lib.MongoDB` | `helper-nosql-mongodb` | The MongoDB driver used for all storage operations |

```javascript
import nosqlMongodb from 'helper-nosql-mongodb';

Lib.MongoDB = nosqlMongodb(Lib, {
  CONNECTION_STRING: process.env.MONGODB_CONNECTION_STRING,
  DATABASE: process.env.MONGODB_DATABASE
});
```

## Full Configuration Example

```javascript
// 1. Load base helpers
import utils from 'helper-utils';
import debug from 'helper-debug';
import instance from 'helper-instance';

// 2. Load MongoDB helper
import nosqlMongodb from 'helper-nosql-mongodb';

// 3. Load the store adapter (Lib injected), then the parent module
import distinctQueueStoreMongodb from 'helper-distinct-queue-store-mongodb';
import distinctQueue from 'helper-distinct-queue';

Lib.Utils = utils;
Lib.Debug = debug(Lib);
Lib.Instance = instance(Lib);

Lib.MongoDB = nosqlMongodb(Lib, {
  CONNECTION_STRING: process.env.MONGODB_CONNECTION_STRING,
  DATABASE: process.env.MONGODB_DATABASE
});

const Store = distinctQueueStoreMongodb(Lib, {
  COLLECTION_NAME: 'queue_jobs'
});
Lib.DistinctQueue = distinctQueue(Lib, {
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

- `COLLECTION_NAME` is missing or empty
- `Lib.MongoDB` is not injected

```
[distinct-queue-store-mongodb] CONFIG.collection_name is required and must be a non-empty string
[distinct-queue-store-mongodb] Lib.MongoDB is required
```
