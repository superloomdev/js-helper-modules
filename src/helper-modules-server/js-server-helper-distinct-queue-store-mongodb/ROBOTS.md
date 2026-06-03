# ROBOTS.md — js-server-helper-distinct-queue-store-mongodb

## Quick Reference

**Pattern:** Store adapter for adapter-backed module (Pattern 2 + Store)  
**Contract:** 4 methods (`writeRecord`, `queryByResourceId`, `queryByResourceIdPrefix`, `deleteByDataVersionLte`)  
**Storage:** MongoDB with subdocument `_id` index on `{ t, r, d, s }` (tenant_id, resource_id, data_version, random_suffix)

## Usage

```js
const StoreAdapter = require('@superloomdev/js-server-helper-distinct-queue-store-mongodb');

Lib.DistinctQueue = require('@superloomdev/js-server-helper-distinct-queue')(Lib, {
  STORE: StoreAdapter,
  STORE_CONFIG: {
    collection_name: 'queue_jobs',
    lib_mongodb: Lib.MongoDB
  }
});
```

## STORE_CONFIG

- `collection_name` — MongoDB collection name (string, required)
- `lib_mongodb` — Reference to `js-server-helper-nosql-mongodb` helper (object, required)

## Store Contract Methods

| Method | Purpose | MongoDB Operation |
|--------|---------|-------------------|
| `setupNewStore(instance)` | No-op (implicit _id index) | N/A |
| `writeRecord(instance, record)` | Append record | `insertOne` |
| `queryByResourceId(instance, tenant_id, resource_id)` | Get records for exact resource | `find` + `sort` |
| `queryByResourceIdPrefix(instance, tenant_id, prefix)` | Get records by prefix | `find` + `$regex` + `sort` |
| `deleteByDataVersionLte(instance, tenant_id, resource_id, boundary)` | Delete stale records | `deleteMany` |

## Error Handling

All methods return `{ success, error }` shape. On driver failure:
- Logs via `Lib.Debug.debug` with driver error details
- Returns `ERRORS.SERVICE_UNAVAILABLE` from parent module

## Dependencies

**Peer dependencies (must be in Lib container):**
- `Lib.Utils` — Type checking
- `Lib.Debug` — Logging
- `Lib.MongoDB` — MongoDB driver (passed via `STORE_CONFIG.lib_mongodb`)

**Parent module:**
- `js-server-helper-distinct-queue` — Provides `ERRORS` catalog

## Testing

Uses `store-contract-suite.js` — shared tests validate the 4-method contract against real MongoDB via Docker.

```bash
cd _test && docker-compose up -d && npm install && npm test
```

## Index Design

MongoDB's implicit `_id` index on subdocument `{ t, r, d, s }` supports all query patterns via dot notation:
- Exact resource: `find({ "_id.t": t, "_id.r": r }).sort({ "_id.d": 1 })`
- Prefix: `find({ "_id.t": t, "_id.r": { $regex: '^prefix' } }).sort({ "_id.d": 1 })`
- Delete: `deleteMany({ "_id.t": t, "_id.r": r, "_id.d": { $lte: N } })

No secondary indexes required.
