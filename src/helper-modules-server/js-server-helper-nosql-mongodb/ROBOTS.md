# @superloomdev/js-server-helper-nosql-mongodb

MongoDB CRUD, batch, query, scan, transactions. Lazy-loaded native driver. Connection pooling.

## Type
Server helper. Service-dependent (needs Docker for emulated, Atlas for integration).

## Peer Dependencies
- `@superloomdev/js-helper-utils` - injected as `Lib.Utils`
- `@superloomdev/js-helper-debug` - injected as `Lib.Debug`
- `@superloomdev/js-server-helper-instance` - injected as `Lib.Instance`

## Direct Dependencies
- `mongodb` - Native MongoDB driver (lazy-loaded)

## Companion Files
- `mongodb.config.js` - default config (CONNECTION_STRING, DATABASE_NAME, MAX_POOL_SIZE, SERVER_SELECTION_TIMEOUT)
- `mongodb.errors.js` - frozen error catalog (DATABASE_WRITE_FAILED, DATABASE_READ_FAILED, DATABASE_UPDATE_FAILED, DATABASE_DELETE_FAILED, DATABASE_BATCH_GET_FAILED, DATABASE_BATCH_WRITE_FAILED, DATABASE_BATCH_DELETE_FAILED, DATABASE_BATCH_WRITE_DELETE_FAILED, DATABASE_TRANSACTION_FAILED, DATABASE_CONNECTION_FAILED, DATABASE_QUERY_FAILED)
- `mongodb.validators.js` - config validators singleton

## Loader Pattern (Factory)

```javascript
Lib.MongoDB = require('@superloomdev/js-server-helper-nosql-mongodb')(Lib, { /* config overrides */ });
```

Each loader call returns an independent MongoDB interface with its own `Lib`, `CONFIG`, and MongoClient instance.

## Config Keys
| Key | Type | Default | Required |
|---|---|---|---|
| CONNECTION_STRING | String | 'mongodb://localhost:27017' | yes |
| DATABASE_NAME | String | 'test' | yes |
| MAX_POOL_SIZE | Number | 10 | no |
| SERVER_SELECTION_TIMEOUT | Number | 5000 | no |

## Exported Functions (16 total)

All functions accept `instance` as their first argument for request context and performance logging.

### Convenience (single-record CRUD)

getRecord(instance, collection, filter, options?) → { success, document, error } | async:yes
  Get a single record by filter (typically `_id`). Options: projection, sort, etc.

writeRecord(instance, collection, filter, document) → { success, matchedCount, modifiedCount, upsertedId, error } | async:yes
  Write (create or replace) a single record. Always upsert.
  Filter identifies the record (typically `{ _id: ... }`). Document is full replacement (no `$` operators).

insertRecordIfNotExists(instance, collection, document) → { success, applied, insertedId, error } | async:yes
  Insert a document only if no document with the same _id exists. Returns `applied: true` on insert, `applied: false` on duplicate (not an error).
  Document must include `_id`. Uses insertOne; catches E11000 duplicate key error.

deleteRecord(instance, collection, filter) → { success, deletedCount, error } | async:yes
  Delete a single record.

updateRecord(instance, collection, filter, update) → { success, modifiedCount, error } | async:yes
  Update fields in a single record. Uses MongoDB update operators (e.g. `{ $set: { field: value } }`).

### Query / Count / Scan

query(instance, collection, filter, options?) → { success, documents, error } | async:yes
  Query multiple records. Throws TypeError on empty/null/undefined filter (safety net).
  Use scan() for intentional full-collection reads.

count(instance, collection, filter) → { success, count, error } | async:yes
  Count documents matching filter. Throws TypeError on empty filter.

scan(instance, collection, filter?, options?) → { success, documents, count, error } | async:yes
  Full-collection read. Permits empty/null filter. Optional filter narrows results.
  Use sparingly on large collections.

### MongoDB-Unique

deleteRecordsByFilter(instance, collection, filter) → { success, deletedCount, error } | async:yes
  Filter-based bulk delete (wraps deleteMany). No DynamoDB equivalent.
  Throws TypeError on empty filter.

### Batch Operations (multi-collection)

All batch functions accept a map of `{ collectionName: [...] }`.
MongoDB does not natively support cross-collection batch operations.
These functions internally loop through each collection and merge results.

batchGetRecords(instance, idsByCollection) → { success, documents: { col: [...] }, error } | async:yes
  Batch get by _id from one or more collections. idsByCollection = { col: [id1, id2] }

batchWriteAndDeleteRecords(instance, operationsByCollection) → { success, results: { col: { insertedCount, deletedCount } }, error } | async:yes
  Mixed put/delete via bulkWrite per collection. operationsByCollection = { col: [{ put: doc }, { delete: filter }] }

batchWriteRecords(instance, documentsByCollection) → { success, results: { col: { insertedCount } }, error } | async:yes
  Batch insert across collections. documentsByCollection = { col: [doc1, doc2] }

batchDeleteRecords(instance, idsByCollection) → { success, results: { col: { deletedCount } }, error } | async:yes
  Batch delete by explicit _id from one or more collections. idsByCollection = { col: [id1, id2] }

### Transactions

transactWriteRecords(instance, callback) → { success, result, error } | async:yes
  Atomic multi-collection write. callback = async function(session, db) { ... }
  All operations inside callback must pass { session } as option.
  Requires replica set (Atlas has this by default; local Docker: --replSet rs0).

### Indexes

createIndex(instance, collection, spec, options?) → { success, index_name, error } | async:yes
  Create or verify an index. Idempotent when the same name+spec is used.
  spec: key map (e.g. { field: 1 } ascending, { field: 'text' } text)
  options: { name, unique, sparse, expireAfterSeconds }

### Lifecycle

close(instance) → { success, error } | async:yes
  Close the MongoDB connection for this instance. Idempotent.
  Teardown is registered with Lib.Instance.addProcessCleanupRoutine on first client creation. The deployment's CLOSE_ON_CLEANUP config on helper-instance decides when it runs: at SIGTERM on a persistent server, or after every request on a serverless runtime. A caller normally never calls close() directly.

## Error Handling
All functions return standardized response format:
```javascript
{
  success: boolean,
  data: any,        // operation-specific field(s)
  error: { type: 'ERROR_TYPE', message: string } | null
}
```

## Connection Lifecycle

The MongoClient is created lazily on the first call via `initIfNot(instance)` and shared for the process lifetime. On first creation, the module registers `MongoDB.close` as a process-scoped cleanup routine with `Lib.Instance`. The module never decides when to close the connection. That decision belongs to the deployment:

| Deployment | CLOSE_ON_CLEANUP | When close runs |
|---|---|---|
| Persistent (Express, Docker, EC2) | false | On SIGTERM via `Lib.Instance.runProcessCleanup()` |
| Serverless (Lambda, Cloud Functions) | true | After every request via `Lib.Instance.runInstanceCleanup(instance)` |

## Patterns
- **Performance logging:** `Lib.Debug.performanceAuditLog` on every I/O function using a local `start_ms` captured at operation entry.
- **Lazy loading:** MongoDB driver loaded only when first function is called
- Connection pooling: Configurable pool size (MAX_POOL_SIZE)
- Instance isolation: Each factory call creates independent connection
- Automatic cleanup: close() is registered with Lib.Instance.addProcessCleanupRoutine on first client creation. The deployment's CLOSE_ON_CLEANUP config on helper-instance decides when it runs
- Safety nets: query(), count(), deleteRecordsByFilter() throw TypeError on empty filter
- Intentional scans: scan() permits empty filter for full-collection reads
- Upsert by default: writeRecord() always uses upsert (insert or replace)
- Multi-collection batch: batch functions loop internally since MongoDB lacks native cross-collection batch
- Transactions: require replica set; use Convenient Transaction API (withSession + withTransaction)
