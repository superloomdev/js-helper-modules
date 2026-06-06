# Configuration — js-server-helper-distinct-queue

## Loader Pattern

The module exports a factory function. Each call returns an independent
instance with its own `Lib`, `CONFIG`, and store. Config is validated at
construction time — misconfiguration throws synchronously at startup, never
at runtime.

```js
const DistinctQueueFactory = require('@superloomdev/js-server-helper-distinct-queue');

Lib.DistinctQueue = DistinctQueueFactory(Lib, {
  STORE: require('@superloomdev/js-server-helper-distinct-queue-store-dynamodb')(
    { table_name: 'distinct_queue', lib_dynamodb: Lib.DynamoDB }
  )
});
```

`CONFIG.STORE` is a **pre-configured factory function** — the result of calling
the adapter's own `configure(store_config)` export. The parent loader then calls
`CONFIG.STORE(Lib, ERRORS)` to produce the live store object. Adapter config
(table name, driver reference, key format) is closed over inside the factory and
never passes through this module. Passing a non-function throws
`CONFIG.STORE is required and must be a store factory function`.

## Config Keys

| Key | Type | Required | Default | Description |
|---|---|---|---|---|
| `STORE` | Function | Yes | `null` | Pre-configured store adapter factory. Call the adapter's `configure()` export and pass the result here. |

## Per-Adapter Configuration

Each adapter owns its config. Pass the config object directly to the adapter's `configure()` call, not to this module.

### DynamoDB

```js
STORE: require('@superloomdev/js-server-helper-distinct-queue-store-dynamodb')(
  { table_name: 'distinct_queue', lib_dynamodb: Lib.DynamoDB }
)
```

Table schema: partition key `p` (String), sort key `id` (String). No GSI.
See `@superloomdev/js-server-helper-distinct-queue-store-dynamodb` README.

### MongoDB

```js
STORE: require('@superloomdev/js-server-helper-distinct-queue-store-mongodb')(
  { collection_name: 'distinct_queue', lib_mongodb: Lib.MongoDB }
)
```

Compound index: `{ tenant_id: 1, resource_id: 1, data_version: 1 }`.
See `@superloomdev/js-server-helper-distinct-queue-store-mongodb` README.

## Peer Dependencies

| `Lib.*` | Source | Used for |
|---|---|---|
| `Lib.Utils` | `@superloomdev/js-helper-utils` | Type checks (`isEmpty`, `isNullOrUndefined`, `isObject`, `isFunction`, `isInteger`) |
| `Lib.Debug` | `@superloomdev/js-helper-debug` | Diagnostic logging when store operations fail |
| `Lib.Instance` | `@superloomdev/js-server-helper-instance` | Request instance for lifecycle |

The store adapter (`CONFIG.STORE`) consumes its own driver helper through
the config object passed to its `configure()` call. The distinct-queue
module never imports a database driver directly.

## Testing Tier

The core module tests run at **Tier 2** — no Docker, no database. The
in-process `memory-store.js` fixture implements the full 4-method store
contract in a plain JavaScript array. Integration tests against real backends
live in each adapter package.
