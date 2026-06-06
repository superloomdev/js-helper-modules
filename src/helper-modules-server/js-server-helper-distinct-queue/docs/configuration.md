# Configuration — js-server-helper-distinct-queue

## Loader Pattern

The module exports a factory function. Each call returns an independent
instance with its own `Lib`, `CONFIG`, and store. Config is validated at
construction time — misconfiguration throws synchronously at startup, never
at runtime.

```js
const DistinctQueueFactory = require('@superloomdev/js-server-helper-distinct-queue');

Lib.DistinctQueue = DistinctQueueFactory(Lib, {
  Store: require('@superloomdev/js-server-helper-distinct-queue-store-dynamodb')({
    table_name: 'distinct_queue',
    lib_dynamodb: Lib.DynamoDB
  })
});
```

`CONFIG.Store` is a **ready-to-use store object** from a fully-independent
adapter module. The adapter owns its own `Lib`, `Config`, and `ERRORS` internally.
The parent module uses the store object directly through the contract interface.
Passing a non-object throws `CONFIG.Store is required and must be a store object`.

## Config Keys

| Key | Type | Required | Default | Description |
|---|---|---|---|---|
| `Store` | Object | Yes | `null` | Ready-to-use store object from a fully-independent adapter module. |

## Per-Adapter Configuration

Each adapter owns its config. Pass the config object directly to the adapter's `configure()` call, not to this module.

### DynamoDB

```js
Store: require('@superloomdev/js-server-helper-distinct-queue-store-dynamodb')({
  table_name: 'distinct_queue',
  lib_dynamodb: Lib.DynamoDB
})
```

Table schema: partition key `p` (String), sort key `id` (String). No GSI.
See `@superloomdev/js-server-helper-distinct-queue-store-dynamodb` README.

### MongoDB

```js
Store: require('@superloomdev/js-server-helper-distinct-queue-store-mongodb')({
  collection_name: 'distinct_queue',
  lib_mongodb: Lib.MongoDB
})
```

Compound index: `{ tenant_id: 1, resource_id: 1, data_version: 1 }`.
See `@superloomdev/js-server-helper-distinct-queue-store-mongodb` README.

## Peer Dependencies

| `Lib.*` | Source | Used for |
|---|---|---|
| `Lib.Utils` | `@superloomdev/js-helper-utils` | Type checks (`isEmpty`, `isNullOrUndefined`, `isObject`, `isFunction`, `isInteger`) |
| `Lib.Debug` | `@superloomdev/js-helper-debug` | Diagnostic logging when store operations fail |
| `Lib.Instance` | `@superloomdev/js-server-helper-instance` | Request instance for lifecycle |

The store adapter (`CONFIG.Store`) is a fully independent module with its own
`Lib`, `Config`, and `ERRORS`. The distinct-queue module uses the store object
directly through the contract interface.

## Testing Tier

The core module tests run at **Tier 2** — no Docker, no database. The
in-process `memory-store.js` fixture implements the full 4-method store
contract in a plain JavaScript array. Integration tests against real backends
live in each adapter package.
