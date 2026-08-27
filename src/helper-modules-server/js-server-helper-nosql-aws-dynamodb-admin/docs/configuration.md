# Configuration. `js-server-helper-nosql-aws-dynamodb-admin`

Every loader option, every environment variable, dependency expectations, and the runtime patterns that combine them. For the function reference see [API Reference](https://github.com/superloomdev/superloom/blob/main/src/helper-modules-server/js-server-helper-nosql-aws-dynamodb-admin/docs/api.md).

The page is split into two halves: a **reference** block (what you can set) at the top, and a **patterns** block (worked examples that combine those settings) at the bottom.

## On This Page

**Reference**

- [Loader Pattern](#loader-pattern)
- [Configuration Keys](#configuration-keys)
- [Environment Variables](#environment-variables)
- [Peer Dependencies (Injected)](#peer-dependencies-injected)
- [Direct Dependencies (Bundled)](#direct-dependencies-bundled)

**Patterns and Examples**

- [Least-Privilege Credential Separation](#least-privilege-credential-separation)
- [Required IAM Policy](#required-iam-policy)
- [Testing Tiers](#testing-tiers)

---

## Loader Pattern

The module is a factory. Each loader call returns an independent public interface with its own `DynamoDBClient`, config, and lifecycle. The SDK client is cached at the module scope and shared across instances because it is stateless. Only the client reference holds state.

```javascript
import nosqlAwsDynamodbAdmin from '@superloomdev/js-server-helper-nosql-aws-dynamodb-admin';

Lib.DynamoDBAdmin = nosqlAwsDynamodbAdmin(Lib, {
  AWS_REGION: process.env.AWS_REGION,
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY
});
```

Loader call semantics:

- The first argument is the `Lib` container. The module reads `Lib.Utils`, `Lib.Debug`, and `Lib.Instance` from it (see [Peer Dependencies](#peer-dependencies-injected)).
- The second argument is the config override. Missing keys fall back to defaults.
- The `DynamoDBClient` is **not** created at loader time. It is created lazily on the first call. This keeps cold-start fast in serverless deployments.

---

## Configuration Keys

| Key | Type | Required | Default | Description |
|---|---|---|---|---|
| `AWS_REGION` | `String` | Yes | `'us-east-1'` | AWS region where the DynamoDB table lives |
| `AWS_ACCESS_KEY_ID` | `String` | No | `undefined` | Access key with elevated IAM permissions. If omitted, the SDK default credential chain is used |
| `AWS_SECRET_ACCESS_KEY` | `String` | No | `undefined` | Secret access key. If omitted, the SDK default credential chain is used |
| `ENDPOINT` | `String` | No | `undefined` | Custom endpoint for DynamoDB Local (e.g. `'http://localhost:8001'`). Leave undefined for real AWS DynamoDB |
| `WAIT_TIMEOUT_SECONDS` | `Number` | No | `60` | How long `waitForTableActive` polls before returning `ADMIN_WAIT_TIMEOUT` |

`AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` default to undefined so the SDK default credential chain (env vars, shared config, IAM role) is used when they are not explicitly set. For the admin module, you should inject explicit credentials from a secrets manager to keep the elevated set separate from the runtime deployment.

---

## Environment Variables

Environment variables are consumed only by `_test/loader.js`. The module itself never reads `process.env` directly. All configuration flows through the loader.

| Variable | Used by | Description |
|---|---|---|
| `AWS_REGION` | `_test/loader.js` | Region for the test DynamoDB instance |
| `AWS_ACCESS_KEY_ID` | `_test/loader.js` | Access key for testing (dummy value `local` for DynamoDB Local) |
| `AWS_SECRET_ACCESS_KEY` | `_test/loader.js` | Secret key for testing (dummy value `local` for DynamoDB Local) |
| `DYNAMODB_ADMIN_ENDPOINT` | `_test/loader.js` | Endpoint for the test DynamoDB Local instance |

---

## Peer Dependencies (Injected)

The module receives these through the `Lib` container, not through `dependencies` in `package.json`. The project loader is responsible for loading them and passing them in.

| Peer | Package | Role |
|---|---|---|
| `Lib.Utils` | `@superloomdev/js-helper-utils` | Utility functions (`isNullOrUndefined`, `isEmpty`, `getUnixTimeInMilliSeconds`) |
| `Lib.Debug` | `@superloomdev/js-helper-debug` | Logging and performance audit |
| `Lib.Instance` | `@superloomdev/js-server-helper-instance` | Process cleanup registration. The module registers its connection teardown with `Lib.Instance.addProcessCleanupRoutine` on first client creation. The deployment's `CLOSE_ON_CLEANUP` config on `helper-instance` controls when teardown runs, not this module |

The `Lib.Instance` peer is required. The module registers its connection teardown with `Lib.Instance.addProcessCleanupRoutine` on first client creation. The deployment's `CLOSE_ON_CLEANUP` config lives on `helper-instance`, not on this module.

---

## Direct Dependencies (Bundled)

| Package | Version | Role |
|---|---|---|
| `@aws-sdk/client-dynamodb` | `^3.1032.0` | AWS SDK v3 DynamoDB client. Provides `DynamoDBClient` and control-plane commands |

---

## Least-Privilege Credential Separation

The admin module uses a **separate set of AWS credentials** from the data-plane `nosql-aws-dynamodb` module. This is intentional:

- The data-plane module connects with a read/write user. It handles CRUD, queries, and transactions.
- The admin module connects with a user that has CreateTable, DeleteTable, UpdateTimeToLive, DescribeTable, and ListTables permissions.
- Separate config means separate credentials. The elevated set never ships in the runtime deployment.

In a typical project loader:

```javascript
import nosqlAwsDynamodb from '@superloomdev/js-server-helper-nosql-aws-dynamodb';
import nosqlAwsDynamodbAdmin from '@superloomdev/js-server-helper-nosql-aws-dynamodb-admin';

// Data-plane: read/write user
Lib.DynamoDB = nosqlAwsDynamodb(Lib, {
  REGION: process.env.AWS_REGION,
  KEY: process.env.AWS_ACCESS_KEY_ID,
  SECRET: process.env.AWS_SECRET_ACCESS_KEY
});

// Control-plane: admin user (only loaded in provisioning scripts or migration runners)
Lib.DynamoDBAdmin = nosqlAwsDynamodbAdmin(Lib, {
  AWS_REGION: process.env.AWS_REGION,
  AWS_ACCESS_KEY_ID: process.env.DYNAMODB_ADMIN_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY: process.env.DYNAMODB_ADMIN_SECRET_ACCESS_KEY
});
```

---

## Required IAM Policy

The admin credentials must have the following IAM permissions:

| Permission | Used by |
|---|---|
| `dynamodb:CreateTable` | `createTable` |
| `dynamodb:DeleteTable` | `deleteTable` |
| `dynamodb:DescribeTable` | `describeTable`, `waitForTableActive` |
| `dynamodb:DescribeTimeToLive` | `enableTtl` (check phase) |
| `dynamodb:UpdateTimeToLive` | `enableTtl` (update phase) |
| `dynamodb:ListTables` | `ping` |

Example IAM policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:CreateTable",
        "dynamodb:DeleteTable",
        "dynamodb:DescribeTable",
        "dynamodb:DescribeTimeToLive",
        "dynamodb:UpdateTimeToLive",
        "dynamodb:ListTables"
      ],
      "Resource": "*"
    }
  ]
}
```

For production, scope the `Resource` to specific table ARNs rather than `*`.

---

## Testing Tiers

The test suite uses Docker with DynamoDB Local (image `amazon/dynamodb-local:latest`). The compose project is named `superloom-test-dynamodb-admin` and uses host port 8001 to avoid collisions with the data-plane module's tests on port 8000.

| Tier | Command | What it covers |
|---|---|---|
| Unit (Docker) | `npm test` from `_test/` | All provisioning functions, idempotency, TTL conflict, wait for active, validator TypeErrors, config validation, operational failure envelope |
