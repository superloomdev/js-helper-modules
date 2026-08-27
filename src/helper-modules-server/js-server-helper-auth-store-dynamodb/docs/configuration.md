# Configuration

The DynamoDB store adapter receives a `Lib` container and config to produce a ready-to-use store object, which is then passed as `Store` to the Auth parent.

## On This Page

- [Loader Pattern](#loader-pattern)
- [Config Keys](#config-keys)
- [IAM Permissions](#iam-permissions)
- [Peer Dependencies](#peer-dependencies)
- [Environment Variables](#environment-variables)
- [Testing Tier](#testing-tier)

## Loader Pattern

```js
import nosqlAwsDynamodb from '@superloomdev/js-server-helper-nosql-aws-dynamodb';
import authStoreDynamodb from '@superloomdev/js-server-helper-auth-store-dynamodb';
import auth from '@superloomdev/js-server-helper-auth';

Lib.DynamoDB = nosqlAwsDynamodb(Lib, {
  ENDPOINT: process.env.DYNAMO_ENDPOINT,  // optional: for local emulator
  REGION:   process.env.AWS_REGION        // required: AWS region
});

const Store = authStoreDynamodb(Lib, {
  TABLE_NAME: 'sessions_user'
});

Lib.AuthUser = auth(Lib, {
  Store:      Store,
  ACTOR_TYPE: 'user',
  TTL_SECONDS: 2592000
});
```

The adapter receives the `Lib` container and picks `Lib.Utils`, `Lib.Debug`, and `Lib.DynamoDB` by reference. It defines its own `CONFIG` and `ERRORS` internally, then returns a ready-to-use store object. The Auth parent receives that object via `CONFIG.Store` and uses it directly.

The AWS SDK client is **not** created at loader time. `Lib.DynamoDB` lazy-initializes on the first operation. The adapter does not open any connection during construction either.

## Config Keys

| Key | Type | Required | Description |
|---|---|---|---|
| `TABLE_NAME` | String | Yes | Name of the DynamoDB table. Must match the table name provisioned out-of-band |

The validator throws an `Error` at loader time if `TABLE_NAME` is missing, null, undefined, or the empty string. The throw is intentional. Misconfiguration must fail at boot, never silently at first request.

The table must exist before the adapter is used. When `Lib.DynamoDBAdmin` is injected (from `js-server-helper-nosql-aws-dynamodb-admin`), `setupNewStore` creates the table with the correct PK/SK schema, waits for ACTIVE, and enables native TTL on `expires_at` - all idempotently. When no admin is injected, `setupNewStore` returns `NOT_IMPLEMENTED` and the table must be provisioned out-of-band via IaC or AWS Console. See [schema.md](schema.md) for the exact table definition.

## IAM Permissions

The adapter uses specific DynamoDB actions. The application's IAM policy (or the local emulator's unrestricted policy) must allow these:

| Adapter Method | DynamoDB Action | Resource |
|---|---|---|
| `setupNewStore` | `dynamodb:CreateTable` + `dynamodb:DescribeTable` + `dynamodb:UpdateTimeToLive` + `dynamodb:DescribeTimeToLive` + `dynamodb:ListTables` (when `Lib.DynamoDBAdmin` is injected) | `arn:aws:dynamodb:<region>:<account>:table/<table_name>` |
| `getSession` | `dynamodb:GetItem` | `arn:aws:dynamodb:<region>:<account>:table/<table_name>` |
| `listSessionsByActor` | `dynamodb:Query` | `arn:aws:dynamodb:<region>:<account>:table/<table_name>` |
| `setSession` | `dynamodb:PutItem` | `arn:aws:dynamodb:<region>:<account>:table/<table_name>` |
| `updateSessionActivity` | `dynamodb:UpdateItem` | `arn:aws:dynamodb:<region>:<account>:table/<table_name>` |
| `deleteSession` | `dynamodb:DeleteItem` | `arn:aws:dynamodb:<region>:<account>:table/<table_name>` |
| `deleteSessions` | `dynamodb:BatchWriteItem` | `arn:aws:dynamodb:<region>:<account>:table/<table_name>` |
| `cleanupExpiredSessions` | `dynamodb:Scan` + `dynamodb:BatchWriteItem` | `arn:aws:dynamodb:<region>:<account>:table/<table_name>` |

### Minimum IAM Policy Example

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:Query",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
        "dynamodb:BatchWriteItem",
        "dynamodb:Scan"
      ],
      "Resource": "arn:aws:dynamodb:us-east-1:123456789012:table/sessions_user"
    }
  ]
}
```

If you run multiple Auth instances (different `actor_type` values) against different tables, the Resource ARN must cover all of them (wildcard or explicit list).

The adapter does not interact with IAM credential acquisition. The driver helper (`Lib.DynamoDB`) handles the AWS SDK client configuration, including credential chain, region, and endpoint. This adapter simply uses the provided client.

## Peer Dependencies

The adapter does not import these packages directly. It accesses them through `Lib`, which the application populates before constructing the Auth parent.

| Package | Reads via `Lib` |
|---|---|
| `@superloomdev/js-helper-utils` | `Lib.Utils` for type checks in `store.validators.js` |
| `@superloomdev/js-helper-debug` | `Lib.Debug` for driver-error logging |
| `@superloomdev/js-server-helper-nosql-aws-dynamodb` | `Lib.DynamoDB` injected by the caller |
| `@superloomdev/js-server-helper-nosql-aws-dynamodb-admin` | `Lib.DynamoDBAdmin` optional, injected for `setupNewStore` delegation |

The driver helper carries its own dependency on the AWS SDK for JavaScript v3. The adapter never imports the AWS SDK directly; applications that never use this store never load the DynamoDB client.

## Environment Variables

The adapter reads no environment variables at runtime. The variables below are consumed by `_test/loader.js` and `_test/package.json` only; production deployments pass configuration directly through the `Lib.DynamoDB` loader.

| Variable | Default (Docker) | Purpose |
|---|---|---|
| `AWS_REGION` | `us-east-1` | AWS region for the SDK client |
| `AWS_ACCESS_KEY_ID` | `local` | Dummy credential for local emulator |
| `AWS_SECRET_ACCESS_KEY` | `local` | Dummy credential for local emulator |
| `DYNAMO_ENDPOINT` | `http://127.0.0.1:8001` | Endpoint override for DynamoDB Local emulator |

The endpoint port is **8001**, not 8000. This avoids collision with other local services. The test `package.json` hardcodes `http://127.0.0.1:8001`; override via `DYNAMO_ENDPOINT` if your local setup differs.

## Testing Tier

Service-dependent. The contract test suite runs against the DynamoDB Local emulator via Docker.

```bash
npm install && npm test
```

Docker lifecycle is fully automated by `npm test`:
- `pretest`: `docker compose down -v --remove-orphans` (defensive cleanup), then `docker compose up -d --wait` to start the `amazon/dynamodb-local` container on port 8001
- `test`: Runs the contract suite with dummy AWS credentials (`local`/`local`) against the emulator
- `posttest`: Removes containers and volumes (the image stays cached)

No manual `docker compose up` step is required. No real AWS account is required; the emulator handles all DynamoDB operations locally.

The test entry point is `_test/test.js`. It loads `_test/store-contract-suite.js`, which contains a local copy of the shared contract suite maintained by the Auth parent module. Keeping the suite local (rather than fetching from the parent at test time) means the adapter's test harness is self-contained and records which contract version it was built against.

The suite covers two tiers:

- **Tier 1. Adapter unit tests.** Store loader config validation; PK/SK construction; `custom_data` native Map storage; hash-mismatch "not found" behavior; `updateSessionActivity` identity blocklist (including `session_key`); upsert immutability; `cleanupExpiredSessions` deleted count
- **Tier 3. Full Auth lifecycle integration.** Every public Auth API path driven against the real DynamoDB Local backend through the store contract suite. Catches integration bugs that the unit tests cannot see (parent-side ordering, error envelope propagation, TTL interaction)

Tier 2 (an in-process emulated backend) is not applicable to DynamoDB. The emulator provides a real DynamoDB API surface; emulating it in-process would require reimplementing the AWS SDK.
