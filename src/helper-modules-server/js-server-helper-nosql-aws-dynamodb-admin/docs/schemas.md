# Schemas. `helper-nosql-aws-dynamodb-admin`

The validated contracts at the module boundary: what a caller must pass and what comes back. These contracts are enforced in `dynamodb-admin.validators.js` and are the module's hard edges. For the function reference see [API Reference](api.md). For configuration keys see [Configuration](configuration.md).

## On This Page

- [Throw Versus Return](#throw-versus-return)
- [CONFIG Schema](#config-schema)
- [Create-Table-Options Schema](#create-table-options-schema)
- [Wait-For-Table-Active-Options Schema](#wait-for-table-active-options-schema)
- [Enable-TTL-Options Schema](#enable-ttl-options-schema)
- [Delete-Table-Options Schema](#delete-table-options-schema)
- [Describe-Table-Options Schema](#describe-table-options-schema)
- [Response Envelope](#response-envelope)

---

## Throw Versus Return

| Category | Trigger | Mechanism | When |
|---|---|---|---|
| **Programmer error** | A missing required option, a wrong type, a malformed `CONFIG` | Throws synchronously (`TypeError`) | At the call site, or at construction for setup errors |
| **Operational error** | AWS API failure, table not found, TTL already configured | Returns `{ success: false, error }` through the response envelope | At runtime, on the awaited result |

---

## CONFIG Schema

The merged `CONFIG` object passed to the loader. Validated once, at construction, by `validateConfig`. A violation throws a `TypeError` before the instance is built.

| Field | Type | Required | Constraint |
|---|---|---|---|
| `AWS_REGION` | `string` | Yes | Non-empty. Region where the DynamoDB table lives |
| `AWS_ACCESS_KEY_ID` | `string` | No | If present, must be a string. Elevated IAM credentials with table-admin permissions |
| `AWS_SECRET_ACCESS_KEY` | `string` | No | If present, must be a string. Secret key for the elevated credentials |
| `ENDPOINT` | `string` | No | If present, must be a string. Set to `http://localhost:8001` for DynamoDB Local |
| `WAIT_TIMEOUT_SECONDS` | `number` | No | If present, must be a non-negative number. Default 60. How long to wait for table ACTIVE state |

---

## Create-Table-Options Schema

The options argument to `createTable`. Validated per call by `validateCreateTable`. A violation throws a `TypeError` at the call site.

| Option | Type | Required | Constraint |
|---|---|---|---|
| `table_name` | `string` | Yes | Non-empty. Name of the table to create |
| `attribute_definitions` | `array` | Yes | Non-empty array of DynamoDB attribute definitions |
| `key_schema` | `array` | Yes | Non-empty array of DynamoDB key schema elements |

---

## Wait-For-Table-Active-Options Schema

The options argument to `waitForTableActive`. Validated per call by `validateWaitForTableActive`.

| Option | Type | Required | Constraint |
|---|---|---|---|
| `table_name` | `string` | Yes | Non-empty. Name of the table to poll for ACTIVE status |

---

## Enable-TTL-Options Schema

The options argument to `enableTtl`. Validated per call by `validateEnableTtl`.

| Option | Type | Required | Constraint |
|---|---|---|---|
| `table_name` | `string` | Yes | Non-empty. Name of the table to enable TTL on |
| `attribute_name` | `string` | Yes | Non-empty. The attribute name to use as the TTL field |

---

## Delete-Table-Options Schema

The options argument to `deleteTable`. Validated per call by `validateDeleteTable`.

| Option | Type | Required | Constraint |
|---|---|---|---|
| `table_name` | `string` | Yes | Non-empty. Name of the table to delete |

---

## Describe-Table-Options Schema

The options argument to `describeTable`. Validated per call by `validateDescribeTable`.

| Option | Type | Required | Constraint |
|---|---|---|---|
| `table_name` | `string` | Yes | Non-empty. Name of the table to describe |

---

## Response Envelope

Every public async function returns the same envelope shape.

| Field | Type | Present on | Description |
|---|---|---|---|
| `success` | `boolean` | Always | `true` on success, `false` on operational failure |
| `error` | `object \| null` | Always | A frozen `{ type, message }` on failure, `null` on success |
| `table` | `object \| null` | `describeTable` success | The DynamoDB table description |

```js
// createTable success
{ success: true, error: null }

// createTable failure
{ success: false, error: { type: 'DYNAMODB_ADMIN CreateTableFailed', message: '...' } }

// describeTable success
{ success: true, table: { TableName: '...', TableStatus: 'ACTIVE', ... }, error: null }
```
