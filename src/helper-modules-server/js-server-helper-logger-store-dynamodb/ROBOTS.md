# helper-logger-store-dynamodb. AI Reference

AWS DynamoDB storage adapter for `helper-logger`. Fully independent - owns its own Lib, CONFIG, and ERRORS. Constructed first by application code and passed as a ready-to-use store object to the Logger parent.

Requires a DynamoDB table provisioned **out-of-band** (CloudFormation, CDK, Terraform, AWS Console). The adapter does not create the table - `setupNewStore` is a no-op that returns success. Uses `helper-nosql-aws-dynamodb` (native driver wrapper) injected via `shared_libs.DynamoDB`.

## Construction

```js
const Store = require('@superloomdev/js-server-helper-logger-store-dynamodb')(Lib, {
  table_name: 'action_log'  // required. one table per logger instance
});

Lib.Logger = require('@superloomdev/js-server-helper-logger')(Lib, {
  Store: Store
});
```

`table_name` is required. The loader throws an `Error` if it is missing, null, or empty. `Lib.DynamoDB` must be present on the injected `shared_libs` container.

## Table Design

| Attribute | DynamoDB type | Role |
|-----------|---------------|------|
| `pk` | String (S) | Partition key (PK) of the base table - written as `"{scope}#{entity_type}#{entity_id}"` |
| `sort_key` | String (S) | Sort key (SK) of the base table - timestamp-based unique string |
| `actor_pk` | String (S) | Partition key of the GSI - written as `"{scope}#{actor_type}#{actor_id}"` |
| `expires_at` | Number (N) | TTL attribute (Unix epoch seconds). Enable TTL out-of-band. |

GSI name: `actor_pk-sort_key-index`. GSI keys: PK=`actor_pk`, SK=`sort_key`.

## Store Contract

| Method | Signature | Returns |
|---|---|---|
| `setupNewStore` | `(instance)` | `{ success, error }` |
| `addLog` | `(instance, record)` | `{ success, error }` |
| `getLogsByEntity` | `(instance, query)` | `{ success, records, next_cursor, error }` |
| `getLogsByActor` | `(instance, query)` | `{ success, records, next_cursor, error }` |
| `cleanupExpiredLogs` | `(instance)` | `{ success, deleted_count, error }` |

## Behaviors That Must Not Be Violated When Generating Code

1. **Construct the adapter before the Logger.** The adapter is fully independent. Pass the returned store object as `CONFIG.Store` to the Logger parent.

2. **`setupNewStore` is a no-op.** Returns `{ success: true, error: null }` without calling DynamoDB. The table and GSI must be provisioned out-of-band (CloudFormation, CDK, Terraform, AWS Console). The contract is satisfied so the Logger parent's idempotent setup flow still works.

3. **`addLog` uses `PutItem` and computes the keys at write time.** The adapter assigns `pk = "{scope}#{entity_type}#{entity_id}"` and `actor_pk = "{scope}#{actor_type}#{actor_id}"` to the record before writing. The `sort_key` carries a random suffix making collisions effectively impossible - no UPSERT logic needed.

4. **`getLogsByEntity` queries the base table** with `pkName: 'pk'`, `pk` set to `"{scope}#{entity_type}#{entity_id}"`, sort key descending, optional `sort_key` cursor.

5. **`getLogsByActor` queries the GSI** with `indexName: 'actor_pk-sort_key-index'`, `pkName: 'actor_pk'`, `pk` set to `"{scope}#{actor_type}#{actor_id}"`, sort key descending.

6. **`cleanupExpiredLogs` does a full table `Scan` (no `FilterExpression`) then filters client-side and `BatchWriteItem` deletes.** Delete keys are `{ pk, sort_key }`. Native TTL handles automatic expiry (~48h) - this method provides deterministic `deleted_count` for tests and immediate cleanup.

7. **Enable TTL out-of-band.** The adapter does not call `UpdateTimeToLive`. Enable TTL on `expires_at` via the AWS Console, IaC, or AWS CLI as part of table provisioning.

8. **Test environment uses DynamoDB Local on port 8002.** Set `AWS_ACCESS_KEY_ID=local AWS_SECRET_ACCESS_KEY=local AWS_REGION=us-east-1` to avoid the EC2 credential chain timeout.

9. **IAM permissions required:** `PutItem`, `Query`, `Scan`, `BatchWriteItem` on the table ARN and `Query` on the `actor_pk-sort_key-index` GSI ARN.

## Dependencies

All three dependencies are injected via `shared_libs`:
```
shared_libs.Utils    - helper-utils             (type checks)
shared_libs.Debug    - helper-debug             (structured logging)
shared_libs.DynamoDB - helper-nosql-aws-dynamodb (DynamoDB driver wrapper)
```

## Error Catalog

| Error | When |
|---|---|
| `SERVICE_UNAVAILABLE` | Driver-level call failed. Logged via `Lib.Debug.debug`, returned as `{ success: false, error }` |

## Single Source of Truth

The store's source file is `store.js`; the config validator is `store.validators.js`; the error catalog is `store.errors.js`. Base table PK attribute: `pk`. GSI: `actor_pk-sort_key-index` (PK: `actor_pk`, SK: `sort_key`). TTL attribute: `expires_at`. `setupNewStore` is a no-op.
