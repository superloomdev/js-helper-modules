# Configuration - helper-distinct-queue-store-dynamodb

## Loader Pattern

The adapter is a store implementation for `helper-distinct-queue`.
The project loader injects `Lib` (including `Lib.DynamoDB`), and the adapter
owns its own configuration. It returns a ready-to-use store object that
you provide to the parent module's `CONFIG.Store` key.

```javascript
// Load the adapter with Lib injected and its own config
const Store = require('helper-distinct-queue-store-dynamodb')(Lib, {
  table_name: 'distinct_queue_jobs'
});

// Pass the ready-to-use store to the parent module
Lib.DistinctQueue = require('helper-distinct-queue')(Lib, {
  Store: Store
});
```

## Configuration Keys

### `table_name`

**Type:** `string`  
**Required:** Yes

The DynamoDB table name for queue records. The table will be created automatically by `setupNewStore()` if it doesn't exist.

```javascript
table_name: 'myapp_queue_jobs'
```

### `KEY_DELIMITER`

**Type:** `string`  
**Required:** No (default: `\u001F`)

The sort key field separator. The default `\u001F` is the ASCII Unit Separator,
a non-printable control character that never appears in caller-supplied
resource_ids. Changing this after records exist would make stored sort keys
unreadable - override only with full understanding of the migration implications.

```javascript
KEY_DELIMITER: '\u001F'
```

## Injected Dependencies

The adapter reads these from the injected `Lib` container:

| `Lib.*` | Source | Used for |
|---|---|---|
| `Lib.Utils` | `helper-utils` | Type checks |
| `Lib.Debug` | `helper-debug` | Diagnostic logging on driver failures |
| `Lib.DynamoDB` | `helper-nosql-aws-dynamodb` | The DynamoDB driver used for all storage operations |

```javascript
Lib.DynamoDB = require('helper-nosql-aws-dynamodb')(Lib, {
  REGION: process.env.AWS_REGION,
  KEY: process.env.AWS_ACCESS_KEY_ID,
  SECRET: process.env.AWS_SECRET_ACCESS_KEY
});
```

## Full Configuration Example

```javascript
// 1. Load base helpers
Lib.Utils = require('helper-utils')();
Lib.Debug = require('helper-debug')(Lib);
Lib.Instance = require('helper-instance')(Lib);

// 2. Load DynamoDB helper
Lib.DynamoDB = require('helper-nosql-aws-dynamodb')(Lib, {
  REGION: process.env.AWS_REGION || 'us-east-1',
  KEY: process.env.AWS_ACCESS_KEY_ID,
  SECRET: process.env.AWS_SECRET_ACCESS_KEY
});

// 3. Load the store adapter (Lib injected), then the parent module
const Store = require('helper-distinct-queue-store-dynamodb')(Lib, {
  table_name: 'queue_jobs'
});
Lib.DistinctQueue = require('helper-distinct-queue')(Lib, {
  Store: Store
});

// 4. Idempotent table setup (run once at app startup)
await Store.setupNewStore(Lib.Instance.initialize());
```

## Local Testing Configuration

For DynamoDB Local (emulated testing):

```javascript
Lib.DynamoDB = require('helper-nosql-aws-dynamodb')(Lib, {
  REGION: 'us-east-1',
  KEY: 'local',
  SECRET: 'local',
  ENDPOINT: 'http://127.0.0.1:8000'
});
```

See the `_test/` directory for a complete Docker Compose setup with DynamoDB Local.

## Validation

The adapter validates configuration at load time and throws if:

- `table_name` is missing or empty
- `KEY_DELIMITER` is missing or empty
- `Lib.DynamoDB` is not injected

```
[distinct-queue-store-dynamodb] CONFIG.table_name is required and must be a non-empty string
[distinct-queue-store-dynamodb] CONFIG.KEY_DELIMITER is required and must be a non-empty string
[distinct-queue-store-dynamodb] Lib.DynamoDB is required
```
