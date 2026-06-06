# Configuration — js-server-helper-distinct-queue-store-dynamodb

## Adapter-Local Configuration

This adapter owns its configuration internally, like any standalone module.
You pass configuration when requiring the adapter; the resulting factory
function is what you provide to the parent module's `CONFIG.STORE` key.

```javascript
// Configure the adapter with its required settings
const StoreAdapter = require('@superloomdev/js-server-helper-distinct-queue-store-dynamodb')({
  table_name: 'distinct_queue_jobs',
  lib_dynamodb: Lib.DynamoDB
});

// Pass the pre-configured adapter to the parent module
Lib.DistinctQueue = require('@superloomdev/js-server-helper-distinct-queue')(Lib, {
  STORE: StoreAdapter
});
```

## Required Configuration Keys

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

The adapter merges your configuration over its internal defaults and validates at stage 2 (when the parent module calls `CONFIG.STORE(Lib, ERRORS)`).

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

// 3. Configure and load distinct-queue with DynamoDB adapter
// The adapter owns its config; just pass the configured factory to STORE
Lib.DistinctQueue = require('@superloomdev/js-server-helper-distinct-queue')(Lib, {
  STORE: require('@superloomdev/js-server-helper-distinct-queue-store-dynamodb')({
    table_name: 'queue_jobs',
    lib_dynamodb: Lib.DynamoDB
  })
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

The adapter validates its merged configuration in stage 2 (when the parent module calls `CONFIG.STORE(Lib, ERRORS)`) and throws if:

- `Config` is not an object
- `table_name` is missing or empty
- `lib_dynamodb` is not provided

```
[js-server-helper-distinct-queue-store-dynamodb] Config must be an object
[js-server-helper-distinct-queue-store-dynamodb] Config.table_name is required
[js-server-helper-distinct-queue-store-dynamodb] Config.lib_dynamodb is required (pass Lib.DynamoDB)
```
