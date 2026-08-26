# @superloomdev/js-server-helper-nosql-aws-dynamodb-admin

AWS DynamoDB control-plane helper for table and TTL provisioning with admin credentials. Lazy-loaded SDK v3. Idempotent operations.

## Type
Server helper. Class C (driver wrapper, control-plane). Service-dependent (needs Docker for emulated, AWS for integration).

## Peer Dependencies
- `@superloomdev/js-helper-utils` - injected as `Lib.Utils`
- `@superloomdev/js-helper-debug` - injected as `Lib.Debug`
- `@superloomdev/js-server-helper-instance` - injected as `Lib.Instance`

## Direct Dependencies
- `@aws-sdk/client-dynamodb` - AWS SDK v3 DynamoDB client (lazy-loaded, shared across instances)

## Companion Files
- `dynamodb-admin.config.js` - default config (AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, ENDPOINT, WAIT_TIMEOUT_SECONDS)
- `dynamodb-admin.errors.js` - frozen error catalog (ADMIN_CONNECTION_FAILED, ADMIN_OPERATION_FAILED, ADMIN_TTL_CONFLICT, ADMIN_WAIT_TIMEOUT)
- `dynamodb-admin.validators.js` - config and per-call options validators singleton

## Loader Pattern (Factory)

```javascript
Lib.DynamoDBAdmin = require('@superloomdev/js-server-helper-nosql-aws-dynamodb-admin')(Lib, { /* config overrides */ });
```

Each loader call returns an independent DynamoDB admin interface with its own `Lib`, `CONFIG`, and DynamoDBClient instance. The admin credentials must have IAM permissions for CreateTable, DeleteTable, UpdateTimeToLive, DescribeTable, and ListTables.

## Config Keys
| Key | Type | Default | Required |
|---|---|---|---|
| AWS_REGION | String | 'us-east-1' | yes |
| AWS_ACCESS_KEY_ID | String | undefined | no (uses SDK default chain if omitted) |
| AWS_SECRET_ACCESS_KEY | String | undefined | no (uses SDK default chain if omitted) |
| ENDPOINT | String | undefined | no (set for DynamoDB Local) |
| WAIT_TIMEOUT_SECONDS | Number | 60 | no |

## Exported Functions (7 total)

All functions accept `instance` as their first argument for request context and performance logging. All provisioning functions are idempotent with ensure semantics.

### Table Management

createTable(instance, options) -> { success, data: { created }, error } | async:yes
  Create a DynamoDB table. Idempotent: already-exists returns created: false.
  options: { table_name: String, attribute_definitions: [{ name, type }], key_schema: [{ name, type }], billing_mode?: String, global_secondary_indexes?: Array, provisioned_throughput?: Object }

waitForTableActive(instance, options) -> { success, data: { table_name, status }, error } | async:yes
  Poll DescribeTable until ACTIVE or timeout. Timeout returns ADMIN_WAIT_TIMEOUT.
  options: { table_name: String, timeout_seconds?: Number }

enableTtl(instance, options) -> { success, data: { enabled }, error } | async:yes
  Enable TTL on an attribute. Idempotent on same attribute.
  TTL on a different attribute returns ADMIN_TTL_CONFLICT error.
  options: { table_name: String, attribute_name: String }

deleteTable(instance, options) -> { success, data: { deleted }, error } | async:yes
  Delete a table. Idempotent: missing table returns deleted: false.
  options: { table_name: String }

describeTable(instance, options) -> { success, data: { table }, error } | async:yes
  Describe a table. Returns normalized subset: table_name, status, key_schema, billing_mode, item_count, creation_date.
  options: { table_name: String }

### Lifecycle

ping(instance) -> { success, data: { ok }, error } | async:yes
  Round-trip check with admin credentials. Uses ListTables limit 1.

close(instance) -> { success, error } | async:yes
  Close the DynamoDB admin connection for this instance. Idempotent.
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
Programmer errors (missing required options, wrong types) throw TypeError. Operational failures (connection lost, permission denied, SDK error) return error envelopes.

## Connection Lifecycle

The DynamoDBClient is created lazily on the first call via `initIfNot(instance)` and shared for the process lifetime. On first creation, the module registers `DynamoDBAdmin.close` as a process-scoped cleanup routine with `Lib.Instance`. The module never decides when to close the connection. That decision belongs to the deployment:

| Deployment | CLOSE_ON_CLEANUP | When close runs |
|---|---|---|
| Persistent (Express, Docker, EC2) | false | On SIGTERM via `Lib.Instance.runProcessCleanup()` |
| Serverless (Lambda, Cloud Functions) | true | After every request via `Lib.Instance.runInstanceCleanup(instance)` |

## Patterns
- **Performance logging:** `Lib.Debug.performanceAuditLog` on every I/O function using a local `start_ms` captured at operation entry
- **Lazy loading:** AWS SDK v3 client loaded only when first function is called
- **Instance isolation:** Each factory call creates independent client
- **Idempotent provisioning:** All create/enable operations are safe to call repeatedly
- **TTL conflict detection:** enableTtl checks existing TTL configuration before modifying
- **Credential separation:** Admin credentials are distinct from data-plane module
- **Automatic cleanup:** close() is registered with Lib.Instance.addProcessCleanupRoutine on first client creation. The deployment's CLOSE_ON_CLEANUP config on helper-instance decides when it runs
