# API - helper-distinct-queue-store-mongodb

## Store Contract Methods

The adapter implements the 4-method store contract consumed by `helper-distinct-queue`, plus an idempotent provisioning method.

### setupNewStore(instance)

One-time store provisioning. Run once when setting up the store for the first time - not on every application boot.

**No-op for this adapter:** MongoDB creates the collection and implicit `_id` index automatically on first write. No explicit setup needed.

| Parameter | Type | Description |
|-----------|------|-------------|
| `instance` | `Object` | Request instance |

**Returns:** `Promise<{ success: boolean, error: Object|null }>`

```javascript
const result = await Store.setupNewStore(instance);
// { success: true, error: null }
```

---

### writeRecord(instance, record)

Append a record to the collection using `Lib.MongoDB.writeRecord` with the compound `_id` subdocument `{ t, r, d, s }`.

| Parameter | Type | Description |
|-----------|------|-------------|
| `instance` | `Object` | Request instance |
| `record` | `Object` | Record with `tenant_id`, `resource_id`, `data_version`, `request_id`, `payload`, `action`, `toc` |

**Returns:** `Promise<{ success: boolean, error: Object|null }>`

```javascript
const result = await Store.writeRecord(instance, {
  tenant_id: 'tenant_1',
  resource_id: 'account_1.product_1',
  data_version: Date.now(),
  request_id: 'abc123',
  payload: { value: 42 },
  action: 'process',
  toc: Date.now()
});
// { success: true, error: null }
```

On driver failure, returns `{ success: false, error: ERRORS.SERVICE_UNAVAILABLE }`.

---

### queryByResourceId(instance, tenant_id, resource_id)

Return all records matching `(tenant_id, resource_id)`, sorted by `data_version` ascending (chronological order).

Uses the implicit `_id` index via dot notation: `_id.t`, `_id.r`, `_id.d`.

| Parameter | Type | Description |
|-----------|------|-------------|
| `instance` | `Object` | Request instance |
| `tenant_id` | `string` | Partition key |
| `resource_id` | `string` | Exact resource identifier |

**Returns:** `Promise<{ success: boolean, records: Array, error: Object|null }>`

```javascript
const result = await Store.queryByResourceId(instance, 'tenant_1', 'account_1.product_1');
// { success: true, records: [...], error: null }
```

Each record in the `records` array has top-level fields: `tenant_id`, `resource_id`, `data_version`, `request_id`, `payload`, `action`, `toc`.

On driver failure, returns `{ success: false, records: null, error: ERRORS.SERVICE_UNAVAILABLE }`.

---

### queryByResourceIdPrefix(instance, tenant_id, resource_id_prefix)

Return all records for `tenant_id` whose `resource_id` starts with the given prefix, sorted by `data_version` ascending.

Uses MongoDB `$regex` with `^` anchor on `_id.r` for prefix matching. The prefix is escaped to prevent regex injection.

| Parameter | Type | Description |
|-----------|------|-------------|
| `instance` | `Object` | Request instance |
| `tenant_id` | `string` | Partition key |
| `resource_id_prefix` | `string` | Prefix to match (e.g., `"account_123."`) |

**Returns:** `Promise<{ success: boolean, records: Array, error: Object|null }>`

```javascript
const result = await Store.queryByResourceIdPrefix(instance, 'tenant_1', 'account_123.');
// { success: true, records: [...], error: null }
```

On driver failure, returns `{ success: false, records: null, error: ERRORS.SERVICE_UNAVAILABLE }`.

---

### deleteByDataVersionLte(instance, tenant_id, resource_id, data_version_boundary)

Delete all records for `(tenant_id, resource_id)` where `data_version <= data_version_boundary`.

Used during `claim()` to remove stale records after the latest is selected.

| Parameter | Type | Description |
|-----------|------|-------------|
| `instance` | `Object` | Request instance |
| `tenant_id` | `string` | Partition key |
| `resource_id` | `string` | Resource identifier |
| `data_version_boundary` | `number` | Upper bound (inclusive) |

**Returns:** `Promise<{ success: boolean, error: Object|null }>`

```javascript
const result = await Store.deleteByDataVersionLte(instance, 'tenant_1', 'account_1.product_1', 1234567890123);
// { success: true, error: null }
```

On driver failure, returns `{ success: false, error: ERRORS.SERVICE_UNAVAILABLE }`.

---

## Error Handling

All methods return an envelope shape. On driver failure:

- Logs via `Lib.Debug.debug` with driver error details (`type`, `driver_type`, `driver_message`)
- Returns adapter-owned `ERRORS.SERVICE_UNAVAILABLE` from `store.errors.js`

| Error | Type | Message |
|-------|------|---------|
| `SERVICE_UNAVAILABLE` | `DISTINCT_QUEUE_MONGODB_SERVICE_UNAVAILABLE` | MongoDB backend unavailable |

---

## Performance Logging

All 4 contract methods (`writeRecord`, `queryByResourceId`, `queryByResourceIdPrefix`, `deleteByDataVersionLte`) emit a `Lib.Debug.performanceAuditLog('End', ...)` call with a local `start_ms` captured at operation entry. The audit log is emitted on both success and error exit paths.

`setupNewStore` is a no-op (no external service call) and does not emit a performance audit log.
