# ROBOTS.md - helper-distinct-queue-store-dynamodb

## Quick Reference

**Pattern:** Store adapter for adapter-backed module (Pattern 2 + Store)  
**Contract:** 4 methods (`writeRecord`, `queryByResourceId`, `queryByResourceIdPrefix`, `deleteByDataVersionLte`) + `setupNewStore` provisioning  
**Storage:** DynamoDB with composite key `(p, id)` - (tenant_id, sort_key)

## Usage

```js
// Load the adapter with Lib injected
const Store = require('helper-distinct-queue-store-dynamodb')(Lib, {
  table_name: 'queue_jobs'
});

// Pass the ready-to-use store object to the parent module
Lib.DistinctQueue = require('helper-distinct-queue')(Lib, {
  Store: Store
});
```

## Adapter Configuration

Loaded via `loader(shared_libs, config)`. Config keys:

- `table_name` - DynamoDB table name (string, required)
- `KEY_DELIMITER` - Sort key field separator (string, default `\u001F` - override with care)

The DynamoDB driver is taken from the injected `Lib.DynamoDB`.

## Store Contract Methods

| Method | Purpose | DynamoDB Operation |
|--------|---------|-------------------|
| `setupNewStore(instance)` | Idempotent table creation | `createTable` |
| `writeRecord(instance, record)` | Append record | `PutItem` |
| `queryByResourceId(instance, tenant_id, resource_id)` | Get records for exact resource | `Query` with `begins_with(id, resource_id + '\\u001F')` |
| `queryByResourceIdPrefix(instance, tenant_id, prefix)` | Get records by prefix | `Query` with `begins_with(id, prefix)` |
| `deleteByDataVersionLte(instance, tenant_id, resource_id, boundary)` | Delete stale records | `Query` + `BatchWriteItem` (delete) |

## Error Handling

All methods return `{ success, error }` shape. On driver failure:
- Logs via `Lib.Debug.debug` with driver error details
- Returns `ERRORS.SERVICE_UNAVAILABLE` from the adapter's own error catalog (`store.errors.js`)

## Dependencies

**Injected via Lib container:**
- `Lib.Utils` - Type checking
- `Lib.Debug` - Logging
- `Lib.DynamoDB` - DynamoDB driver used for all storage operations

**Parent module:**
- `helper-distinct-queue` - Consumes the store object via `CONFIG.Store`

## Testing

Uses `store-contract-suite.js` - shared tests validate the 4-method contract against real DynamoDB via Docker.

```bash
cd _test && npm install && npm test
```

## Key Design

DynamoDB composite key `(p, id)` supports all query patterns:
- Exact resource: `Query(p=tenant, begins_with(id, resource + '\u001F'))`
- Prefix: `Query(p=tenant, begins_with(id, prefix))`
- Delete: `Query` then `BatchWriteItem` (DynamoDB has no range delete)

No Global Secondary Indexes required.
