# @superloomdev/js-server-helper-nosql-mongodb-admin

MongoDB control-plane helper for collection, index, and TTL provisioning with admin credentials. Lazy-loaded native driver. Idempotent operations.

## Type
Server helper. Class C (driver wrapper, control-plane). Service-dependent (needs Docker for emulated, Atlas for integration).

## Peer Dependencies
- `@superloomdev/js-helper-utils` - injected as `Lib.Utils`
- `@superloomdev/js-helper-debug` - injected as `Lib.Debug`
- `@superloomdev/js-server-helper-instance` - injected as `Lib.Instance`

## Direct Dependencies
- `mongodb` - Native MongoDB driver (lazy-loaded, shared across instances)

## Companion Files
- `mongodb-admin.config.js` - default config (CONNECTION_STRING, DATABASE_NAME, CONNECT_TIMEOUT_MS)
- `mongodb-admin.errors.js` - frozen error catalog (ADMIN_CONNECTION_FAILED, ADMIN_OPERATION_FAILED, ADMIN_TTL_CONFLICT)
- `mongodb-admin.validators.js` - config and per-call options validators singleton

## Loader Pattern (Factory)

```javascript
import nosqlMongodbAdmin from '@superloomdev/js-server-helper-nosql-mongodb-admin';

Lib.MongoDBAdmin = nosqlMongodbAdmin(Lib, { /* config overrides */ });
```

Each loader call returns an independent MongoDB admin interface with its own `Lib`, `CONFIG`, and MongoClient instance. The admin connection string must authenticate as a user with `dbAdmin` or `root` role.

## Config Keys
| Key | Type | Default | Required |
|---|---|---|---|
| CONNECTION_STRING | String | 'mongodb://localhost:27018' | yes (override) |
| DATABASE_NAME | String | 'test' | yes (override) |
| CONNECT_TIMEOUT_MS | Number | 5000 | no |

## Exported Functions (7 total)

All functions accept `instance` as their first argument for request context and performance logging. All provisioning functions are idempotent with ensure semantics.

### Collection Management

createCollection(instance, options) -> { success, data: { created }, error } | async:yes
  Create a collection. Idempotent: already-exists returns created: false.
  options: { collection_name: String, collection_options?: Object }

deleteCollection(instance, options) -> { success, data: { dropped }, error } | async:yes
  Drop a collection. Idempotent: missing collection returns dropped: false.
  options: { collection_name: String }

### Index Management

createIndexes(instance, options) -> { success, data: { created: String[], skipped: String[] }, error } | async:yes
  Create one or more indexes. Idempotent: existing identical indexes counted in skipped.
  options: { collection_name: String, indexes: [{ keys: Object, index_options?: Object }] }

enableTtlIndex(instance, options) -> { success, data: { enabled }, error } | async:yes
  Enable a sparse TTL index on a Date field. Idempotent on same field.
  TTL on a different field returns ADMIN_TTL_CONFLICT error.
  options: { collection_name: String, field_name: String, expire_after_seconds: Number }

listIndexes(instance, options) -> { success, data: { indexes: Array }, error } | async:yes
  List all indexes on a collection.
  options: { collection_name: String }

### Lifecycle

ping(instance) -> { success, data: { ok }, error } | async:yes
  Round-trip check with admin credentials. Verifies connection and authentication.

close(instance) -> { success, error } | async:yes
  Close the MongoDB admin connection for this instance. Idempotent.
  Teardown is registered with Lib.Instance.addProcessCleanupRoutine on first client creation. The deployment's CLOSE_ON_CLEANUP config on helper-instance decides when it runs: at SIGTERM on a persistent server, or after every request on a serverless runtime. A caller normally never calls close() directly.

## Error Handling
All functions return standardized response format:
```javascript
{
  success: boolean,
  data: { /* operation-specific fields */ },
  error: { type: 'ERROR_TYPE', message: string } | null
}
```
Programmer errors (missing required options, wrong types) throw TypeError. Operational failures (connection lost, permission denied, driver error) return error envelopes.

## Connection Lifecycle

The MongoClient is created lazily on the first call via `initIfNot(instance)` and shared for the process lifetime. On first creation, the module registers `MongoDBAdmin.close` as a process-scoped cleanup routine with `Lib.Instance`. The module never decides when to close the connection. That decision belongs to the deployment:

| Deployment | CLOSE_ON_CLEANUP | When close runs |
|---|---|---|
| Persistent (Express, Docker, EC2) | false | On SIGTERM via `Lib.Instance.runProcessCleanup()` |
| Serverless (Lambda, Cloud Functions) | true | After every request via `Lib.Instance.runInstanceCleanup(instance)` |

## Patterns
- **Performance logging:** `Lib.Debug.performanceAuditLog` on every I/O function using a local `start_ms` captured at operation entry
- **Lazy loading:** MongoDB driver loaded only when first function is called
- **Instance isolation:** Each factory call creates independent connection
- **Idempotent provisioning:** All create/enable operations are safe to call repeatedly
- **TTL conflict detection:** enableTtlIndex checks existing indexes before creating
- **Credential separation:** Admin connection string is distinct from data-plane module
- **Automatic cleanup:** close() is registered with Lib.Instance.addProcessCleanupRoutine on first client creation. The deployment's CLOSE_ON_CLEANUP config on helper-instance decides when it runs
