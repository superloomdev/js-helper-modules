# ROBOTS.md — js-server-helper-distinct-queue-store-dynamodb

## Quick Reference

**Pattern:** Store adapter for adapter-backed module (Pattern 2 + Store)  
**Contract:** 5 methods (`setupNewStore`, `writeRecord`, `queryByResourceId`, `queryByResourceIdPrefix`, `deleteByDataVersionLte`)  
**Storage:** DynamoDB with composite key `(p, id)` — (tenant_id, sort_key)

## Usage

```js
// Configure the adapter (adapter-local config pattern)
const StoreAdapter = require('@superloomdev/js-server-helper-distinct-queue-store-dynamodb')({
  table_name: 'queue_jobs',
  lib_dynamodb: Lib.DynamoDB
});

// Pass the pre-configured adapter to the parent module
Lib.DistinctQueue = require('@superloomdev/js-server-helper-distinct-queue')(Lib, {
  STORE: StoreAdapter
});
```

## Adapter Configuration

Pass configuration when requiring the adapter. Required keys:

- `table_name` — DynamoDB table name (string, required)
- `lib_dynamodb` — Reference to `js-server-helper-nosql-aws-dynamodb` helper (object, required)

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
- Returns `ERRORS.SERVICE_UNAVAILABLE` from parent module

## Dependencies

**Peer dependencies (must be in Lib container):**
- `Lib.Utils` — Type checking
- `Lib.Debug` — Logging
- `Lib.DynamoDB` — DynamoDB driver (passed via adapter config `lib_dynamodb`)

**Parent module:**
- `js-server-helper-distinct-queue` — Provides `ERRORS` catalog

## Testing

Uses `store-contract-suite.js` — shared tests validate the 5-method contract against real DynamoDB via Docker.

```bash
cd _test && npm install && npm test
```

## Key Design

DynamoDB composite key `(p, id)` supports all query patterns:
- Exact resource: `Query(p=tenant, begins_with(id, resource + '\u001F'))`
- Prefix: `Query(p=tenant, begins_with(id, prefix))`
- Delete: `Query` then `BatchWriteItem` (DynamoDB has no range delete)

No Global Secondary Indexes required.
