# Configuration — js-server-helper-distinct-queue

## Loader Pattern

The module exports a factory function. Each call returns an independent
instance with its own `Lib`, `CONFIG`, and store. Config is validated at
construction time — misconfiguration throws synchronously at startup, never
at runtime.

```js
const DistinctQueueFactory = require('@superloomdev/js-server-helper-distinct-queue');

Lib.DistinctQueue = DistinctQueueFactory(Lib, {
  STORE:        require('@superloomdev/js-server-helper-distinct-queue-store-dynamodb'),
  STORE_CONFIG: { table_name: 'distinct_queue', lib_dynamodb: Lib.DynamoDB }
});
```

`CONFIG.STORE` is a **factory function**, not a string. The loader calls it as
`CONFIG.STORE(Lib, CONFIG, ERRORS)` and binds the returned store object to the
instance. Passing a string throws
`CONFIG.STORE is required and must be a store factory function`.

## Config Keys

| Key | Type | Required | Default | Description |
|---|---|---|---|---|
| `STORE` | Function | Yes | `null` | Store adapter factory. Pass `require(...)` for the chosen adapter package. |
| `STORE_CONFIG` | Object | Yes | `null` | Per-adapter configuration. Shape varies by adapter — see each adapter's README. |

## Per-Adapter `STORE_CONFIG` Shape

### DynamoDB

```js
STORE_CONFIG: {
  table_name: 'distinct_queue',
  lib_dynamodb: Lib.DynamoDB
}
```

Table schema: partition key `p` (String), sort key `id` (String). No GSI.
See `@superloomdev/js-server-helper-distinct-queue-store-dynamodb` README.

### MongoDB

```js
STORE_CONFIG: {
  collection_name: 'distinct_queue',
  lib_mongodb: Lib.MongoDB
}
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
`CONFIG.STORE_CONFIG`. The distinct-queue module never imports a database
driver directly.

## Testing Tier

The core module tests run at **Tier 2** — no Docker, no database. The
in-process `memory-store.js` fixture implements the full 4-method store
contract in a plain JavaScript array. Integration tests against real backends
live in each adapter package.
