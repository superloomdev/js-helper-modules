# API Reference. `js-server-helper-nosql-aws-dynamodb-admin`

Every exported function with its signature, parameters, return shape, semantics, and examples. For configuration keys and runtime patterns see [Configuration](https://github.com/superloomdev/superloom/blob/main/src/helper-modules-server/js-server-helper-nosql-aws-dynamodb-admin/docs/configuration.md).

## On This Page

- [Conventions](#conventions)
- [Table Management](#table-management)
  - [`createTable`](#createtable)
  - [`waitForTableActive`](#waitfortableactive)
  - [`enableTtl`](#enablettl)
  - [`deleteTable`](#deletetable)
  - [`describeTable`](#describetable)
- [Lifecycle](#lifecycle)
  - [`ping`](#ping)
  - [`close`](#close)

---

## Conventions

All I/O functions are **async** and accept `instance` as their first argument. The `instance` is built once per request by `Lib.Instance.initialize()` and threaded through the call chain for request context and performance logging via `Lib.Debug.performanceAuditLog`.

Every function returns a consistent response envelope:

```javascript
{ success: true,  data: { /* result fields */ }, error: null }
{ success: false, data: { /* zeroed fields */ }, error: { type, message } }
```

All provisioning functions are **idempotent** with ensure semantics. Already-exists is `success: true` with `data.created: false`, never an error.

Operational failures (connection lost, permission denied, SDK error) never throw. They come back through `error` so the caller can branch without a try/catch. Programming errors (bad arguments, missing required options) throw `TypeError`, because those are bugs.

---

## Table Management

### `createTable`

```javascript
async createTable(instance, options) -> { success, data, error }
```

Create a DynamoDB table. Idempotent: if the table already exists, returns `data.created: false`.

| Parameter | Type | Description |
|---|---|---|
| `instance` | `Object` | Request instance from `Lib.Instance.initialize()` |
| `options.table_name` | `String` | Name of the table to create |
| `options.attribute_definitions` | `Array` | Attribute definitions `[{ name: String, type: 'S'|'N'|'B' }]` |
| `options.key_schema` | `Array` | Key schema `[{ name: String, type: 'HASH'|'RANGE' }]` |
| `options.billing_mode` | `String` *(optional)* | `'PAY_PER_REQUEST'` (default) or `'PROVISIONED'` |
| `options.global_secondary_indexes` | `Array` *(optional)* | GSI list with same attribute/key schema shape |
| `options.provisioned_throughput` | `Object` *(optional)* | Required if `billing_mode` is `'PROVISIONED'` |

**Returns:** `{ success: true, data: { created: Boolean }, error: null }` or `{ success: false, data: { created: false }, error: {...} }`.

---

### `waitForTableActive`

```javascript
async waitForTableActive(instance, options) -> { success, data, error }
```

Poll `DescribeTable` until the table reaches `ACTIVE` state or the timeout expires.

| Parameter | Type | Description |
|---|---|---|
| `instance` | `Object` | Request instance from `Lib.Instance.initialize()` |
| `options.table_name` | `String` | Name of the table to wait for |
| `options.timeout_seconds` | `Number` *(optional)* | Max wait time in seconds (default: config `WAIT_TIMEOUT_SECONDS`) |

**Returns:** `{ success: true, data: { table_name: String, status: 'ACTIVE' }, error: null }` or `{ success: false, data: { table_name: String, status: String|null }, error: {...} }`.

**Error types:**

| Error type | When |
|---|---|
| `ADMIN_WAIT_TIMEOUT` | Table did not reach ACTIVE before the timeout expired |
| `ADMIN_OPERATION_FAILED` | DescribeTable call failed (table not found, SDK error) |

---

### `enableTtl`

```javascript
async enableTtl(instance, options) -> { success, data, error }
```

Enable TTL on a table attribute. Idempotent: if TTL is already enabled on the same attribute, returns `data.enabled: false`. If TTL is enabled on a **different** attribute, returns `ADMIN_TTL_CONFLICT`.

| Parameter | Type | Description |
|---|---|---|
| `instance` | `Object` | Request instance from `Lib.Instance.initialize()` |
| `options.table_name` | `String` | Name of the table |
| `options.attribute_name` | `String` | Attribute to use for TTL |

**Returns:** `{ success: true, data: { enabled: Boolean }, error: null }` or `{ success: false, data: { enabled: false }, error: {...} }`.

**Error types:**

| Error type | When |
|---|---|
| `ADMIN_TTL_CONFLICT` | TTL is already enabled on a different attribute for this table |
| `ADMIN_OPERATION_FAILED` | SDK error during TTL describe or update |

---

### `deleteTable`

```javascript
async deleteTable(instance, options) -> { success, data, error }
```

Delete a DynamoDB table. Idempotent: if the table does not exist, returns `data.deleted: false`.

| Parameter | Type | Description |
|---|---|---|
| `instance` | `Object` | Request instance from `Lib.Instance.initialize()` |
| `options.table_name` | `String` | Name of the table to delete |

**Returns:** `{ success: true, data: { deleted: Boolean }, error: null }` or `{ success: false, data: { deleted: false }, error: {...} }`.

---

### `describeTable`

```javascript
async describeTable(instance, options) -> { success, data, error }
```

Describe a DynamoDB table. Returns a normalized subset of the table description.

| Parameter | Type | Description |
|---|---|---|
| `instance` | `Object` | Request instance from `Lib.Instance.initialize()` |
| `options.table_name` | `String` | Name of the table to describe |

**Returns:** `{ success: true, data: { table: { table_name, status, key_schema, billing_mode, item_count, creation_date } }, error: null }` or `{ success: false, data: { table: null }, error: {...} }`.

---

## Lifecycle

### `ping`

```javascript
async ping(instance) -> { success, data, error }
```

Round-trip check with admin credentials. Uses `ListTables` with a limit of 1 to verify the connection is alive and the credentials are valid.

| Parameter | Type | Description |
|---|---|---|
| `instance` | `Object` | Request instance from `Lib.Instance.initialize()` |

**Returns:** `{ success: true, data: { ok: true }, error: null }` or `{ success: false, data: { ok: false }, error: {...} }`.

---

### `close`

```javascript
async close(instance) -> { success, error }
```

Close the DynamoDB admin connection for this instance. Idempotent: closing an already-closed connection succeeds.

| Parameter | Type | Description |
|---|---|---|
| `instance` | `Object` | Request instance from `Lib.Instance.initialize()` |

**Returns:** `{ success: true, error: null }` or `{ success: false, error: {...} }`.
