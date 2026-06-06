# Configuration — js-server-helper-distinct-queue-store-dynamodb

## STORE_CONFIG

The adapter requires a `STORE_CONFIG` object passed to the core module:

```javascript
const StoreAdapter = require('@superloomdev/js-server-helper-distinct-queue-store-dynamodb');

Lib.DistinctQueue = require('@superloomdev/js-server-helper-distinct-queue')(Lib, {
  STORE: StoreAdapter,
  STORE_CONFIG: {
    table_name: 'distinct_queue_jobs',
    lib_dynamodb: Lib.DynamoDB
  }
});
```

## Required Keys

### `table_name`

**Type:** `string`  
**Required:** Yes

The DynamoDB table name for queue records. The table will be created automatically by `setupNewStore()` if it doesn't exist.

```javascript
table_name: 'myapp_queue_jobs'
```

### `lib_dynamodb`

**Type:** `object`  
**Required:** Yes

Reference to the `js-server-helper-nosql-aws-dynamodb` instance. This is typically `Lib.DynamoDB` after loading the helper.

```javascript
Lib.DynamoDB = require('@superloomdev/js-server-helper-nosql-aws-dynamodb')(Lib, {
  REGION: process.env.AWS_REGION,
  KEY: process.env.AWS_ACCESS_KEY_ID,
  SECRET: process.env.AWS_SECRET_ACCESS_KEY
});
```

## Full Configuration Example

```javascript
// 1. Load base helpers
Lib.Utils = require('@superloomdev/js-helper-utils');
Lib.Debug = require('@superloomdev/js-helper-debug')(Lib);
Lib.Instance = require('@superloomdev/js-server-helper-instance')(Lib);

// 2. Load DynamoDB helper
Lib.DynamoDB = require('@superloomdev/js-server-helper-nosql-aws-dynamodb')(Lib, {
  REGION: process.env.AWS_REGION || 'us-east-1',
  KEY: process.env.AWS_ACCESS_KEY_ID,
  SECRET: process.env.AWS_SECRET_ACCESS_KEY
});

// 3. Load distinct-queue with DynamoDB adapter
const StoreAdapter = require('@superloomdev/js-server-helper-distinct-queue-store-dynamodb');
Lib.DistinctQueue = require('@superloomdev/js-server-helper-distinct-queue')(Lib, {
  STORE: StoreAdapter,
  STORE_CONFIG: {
    table_name: 'queue_jobs',
    lib_dynamodb: Lib.DynamoDB
  }
});

// 4. Idempotent table setup (run once at app startup)
await Lib.DistinctQueue.Store.setupNewStore(Lib.Instance.initialize());
```

## Local Testing Configuration

For DynamoDB Local (emulated testing):

```javascript
Lib.DynamoDB = require('@superloomdev/js-server-helper-nosql-aws-dynamodb')(Lib, {
  REGION: 'us-east-1',
  KEY: 'local',
  SECRET: 'local',
  ENDPOINT: 'http://127.0.0.1:8000'
});
```

See the `_test/` directory for a complete Docker Compose setup with DynamoDB Local.

## Validation

The adapter validates `STORE_CONFIG` at construction time and throws if:

- `STORE_CONFIG` is not an object
- `table_name` is missing or empty
- `lib_dynamodb` is not provided

```
[js-server-helper-distinct-queue-store-dynamodb] STORE_CONFIG must be an object
[js-server-helper-distinct-queue-store-dynamodb] STORE_CONFIG.table_name is required
[js-server-helper-distinct-queue-store-dynamodb] STORE_CONFIG.lib_dynamodb is required (pass Lib.DynamoDB)
```
