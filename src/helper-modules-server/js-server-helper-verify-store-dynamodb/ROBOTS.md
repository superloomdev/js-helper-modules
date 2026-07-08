# helper-verify-store-dynamodb. AI Reference

Class F storage adapter. AWS DynamoDB backend for `helper-verify`. Fully independent module that owns its own CONFIG, ERRORS, and Validators. Standard factory shape: `(shared_libs, config)`. Configured and instantiated independently, then passed to the Verify parent as a ready-to-use store object.

The adapter provisions the table itself via `setupNewStore` using `PAY_PER_REQUEST` billing mode. Uses `helper-nosql-aws-dynamodb` injected via `shared_libs.DynamoDB`.

## Adapter Factory

```js
const Store = require('@superloomdev/js-server-helper-verify-store-dynamodb')(Lib, {
  table_name: 'verification_codes'
});
```

| Argument | Type | Required | Description |
|---|---|---|---|
| `shared_libs` | Object | Yes | Dependency container (Utils, Debug, DynamoDB) |
| `table_name` | String | Yes | Name of the DynamoDB table |

Returns a ready-to-use Store interface. The Verify parent receives this object and calls the contract methods.

## Configuration

```js
{
  table_name: 'verification_codes'  // required. one table per verify instance
}
```

`table_name` is required. The loader throws an `Error` if it is missing, null, or empty. The DynamoDB driver is injected via `shared_libs.DynamoDB`.

## Store Contract

| Method | Signature | Returns |
|---|---|---|
| `setupNewStore` | `(instance)` | `{ success, error }` |
| `getRecord` | `(instance, scope, key)` | `{ success, record, error }` |
| `setRecord` | `(instance, scope, key, record)` | `{ success, error }` |
| `incrementFailCount` | `(instance, scope, key)` | `{ success, error }` |
| `deleteRecord` | `(instance, scope, key)` | `{ success, error }` |
| `cleanupExpiredRecords` | `(instance)` | `{ success, deleted_count, error }` |

All methods are async. `instance` is the per-request scope object from `Lib.Instance.initialize()`.

## Key Schema

| Attribute | DynamoDB type | Role |
|-----------|---------------|------|
| `scope` | String (S) | Partition key (PK) |
| `id` | String (S) | Sort key (SK). Called `key` in the store contract; stored as `id`. |
| `expires_at` | Number (N) | TTL attribute (Unix epoch seconds). Enable TTL out-of-band via AWS Console or IaC. |

## Behaviors That Must Not Be Violated When Generating Code

1. **Never call the adapter directly from application code.** Always go through the parent Verify module. The adapter is configured independently and passed as a ready-to-use store object to the Verify parent.

2. **`getRecord` returns `record: null` on a miss.** Not an error.

3. **`setRecord` is a full `PutItem`.** Replaces all attributes for the given `(scope, id)` key. There are no partial updates in `setRecord`.

4. **`incrementFailCount` uses `UpdateItem` with `SET #fail_count = #fail_count + :one`.** Atomic. Does not read the current value before writing.

5. **`deleteRecord` is idempotent.** DynamoDB `DeleteItem` on a missing key is a no-op success.

6. **`setupNewStore` provisions the DynamoDB table** using `createTable` with `PAY_PER_REQUEST` billing. It is safe to call on every boot - the adapter handles the `ResourceInUseException` (table already exists) as success.

7. **`cleanupExpiredRecords` does a full `Scan` then `BatchDelete`.** DynamoDB native TTL handles automatic expiry asynchronously (~48h sweep lag). The explicit scan+delete provides deterministic `deleted_count` reporting.

8. **Enable TTL out-of-band.** The adapter does not call `UpdateTimeToLive`. After `setupNewStore`, enable TTL on `expires_at` via the AWS Console, IaC (CloudFormation/CDK), or AWS CLI.

9. **Test environment uses DynamoDB Local.** Default endpoint is `http://127.0.0.1:8002`. Set `AWS_ACCESS_KEY_ID=local AWS_SECRET_ACCESS_KEY=local AWS_REGION=us-east-1` even for local tests to avoid the EC2 credential chain timeout.

## Peer Dependencies

```
helper-utils                (type checks - via shared_libs.Utils)
helper-debug                (structured logging - via shared_libs.Debug)
helper-nosql-aws-dynamodb   (DynamoDB wrapper - via shared_libs.DynamoDB)
```

All are loaded into `Lib` by the application before the Verify parent is loaded. The adapter never requires any of them directly; it picks them from the injected container.

## Error Catalog

This adapter owns its own `store.errors.js`. Only one type:

| Error | When |
|---|---|
| `ERRORS.SERVICE_UNAVAILABLE` | Driver-level call failed. Logged via `Lib.Debug.debug`, never surfaced to caller |

## Single Source of Truth

The store's source file is `store.js`; the config validator is `store.validators.js`. PK is `scope`, SK is `id`. TTL attribute is `expires_at`.
