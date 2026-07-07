# API - helper-distinct-queue-store-dynamodb

## Store Contract Methods

All methods are async and return a result envelope. The adapter implements the 4-method store contract consumed by `helper-distinct-queue` via `CONFIG.Store`.

### setupNewStore(instance)

Idempotent table provisioning. Creates the DynamoDB table with composite key `{ p, id }` if it does not exist. Uses pay-per-request billing.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `instance` | `Object` | Request instance from `Lib.Instance.initialize()` |

**Returns:** `{ success: Boolean, error: Object|null }`

On failure, `error` is `ERRORS.SERVICE_UNAVAILABLE` and the driver error is logged via `Lib.Debug.debug`.

### writeRecord(instance, record)

Appends a record to the table using `PutItem`. The item has composite key `{ p, id }` plus `payload`, `action`, and `toc`.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `instance` | `Object` | Request instance |
| `record` | `Object` | Record with `tenant_id`, `resource_id`, `data_version`, `request_id`, `payload`, `action`, `toc` |

**Returns:** `{ success: Boolean, error: Object|null }`

### queryByResourceId(instance, tenant_id, resource_id)

Returns all records matching `(tenant_id, resource_id)`, sorted by `data_version` ascending (chronological order).

Uses `Query` with `PK = tenant_id` and `begins_with(SK, resource_id + KEY_DELIMITER)`.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `instance` | `Object` | Request instance |
| `tenant_id` | `String` | Partition key |
| `resource_id` | `String` | Exact resource identifier |

**Returns:** `{ success: Boolean, records: Array, error: Object|null }`

`records` is an array of reconstructed record objects with `tenant_id`, `resource_id`, `data_version`, `request_id`, `payload`, `action`, and `toc` fields.

### queryByResourceIdPrefix(instance, tenant_id, resource_id_prefix)

Returns all records for `tenant_id` whose `resource_id` starts with the given prefix, sorted by `data_version` ascending.

Uses `Query` with `PK = tenant_id` and `begins_with(SK, prefix)`.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `instance` | `Object` | Request instance |
| `tenant_id` | `String` | Partition key |
| `resource_id_prefix` | `String` | Prefix to match (e.g., `account_123.`) |

**Returns:** `{ success: Boolean, records: Array, error: Object|null }`

### deleteByDataVersionLte(instance, tenant_id, resource_id, data_version_boundary)

Deletes all records for `(tenant_id, resource_id)` where `data_version <= data_version_boundary`.

DynamoDB does not support range delete, so this is a two-phase operation:
1. Query for all records matching `tenant_id` + `resource_id`
2. Filter to items where `data_version <= boundary`
3. Batch delete the matching keys via `BatchWriteItem`

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `instance` | `Object` | Request instance |
| `tenant_id` | `String` | Partition key |
| `resource_id` | `String` | Resource identifier |
| `data_version_boundary` | `Number` | Upper bound (inclusive) |

**Returns:** `{ success: Boolean, error: Object|null }`

## Error Handling

All methods return `{ success, error }` shape. On driver failure:
- Logs via `Lib.Debug.debug` with driver error details
- Returns `ERRORS.SERVICE_UNAVAILABLE` from the adapter's own error catalog (`store.errors.js`)

## Performance Logging

Every method captures a local `start_ms` at entry and emits one `Lib.Debug.performanceAuditLog('End', ...)` call after the operation completes, on both success and error paths.
