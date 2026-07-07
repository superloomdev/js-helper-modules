# Schema - helper-distinct-queue-store-dynamodb

## Table Structure

The adapter stores records in a single DynamoDB table (configurable via `table_name`).

### Item Shape

```javascript
{
  p: String,              // Partition key: tenant_id
  id: String,             // Sort key: resource_id + '\u001F' + data_version_ms + '\u001F' + request_id
  payload: Map,           // Arbitrary caller data (stored as DynamoDB Map)
  action: String,         // Opaque action label
  toc: Number             // Time of creation (Unix ms)
}
```

The sort key `id` encodes three values separated by `\u001F` (ASCII unit separator):
1. `resource_id` - The resource identifier
2. `data_version` - Millisecond timestamp for sorting
3. `request_id` - Compact UUID tie-breaker

The delimiter is defined once as `KEY_DELIMITER` in `store.config.js` and is the single source of truth for both composing and parsing sort keys.

## Key Design

### Composite Primary Key (p, id)

DynamoDB requires a primary key. We use a composite key design:

| Attribute | Role | Value |
|-----------|------|-------|
| `p` | Partition key | `tenant_id` - isolates tenants |
| `id` | Sort key | Full sort_key with resource + version + request_id |

**Benefits:**
- Tenant isolation at the partition level
- `begins_with` queries on sort key enable exact-resource and prefix queries
- No Global Secondary Indexes required

## Query Patterns & Operational Effort

All operations complete in a single roundtrip to DynamoDB.

### writeRecord

Uses `PutItem` with composite key built from record fields:

```javascript
const item = {
  p: tenant_id,
  id: resource_id + '\u001F' + data_version + '\u001F' + request_id,
  payload: payload,
  action: action,
  toc: toc
};
PutItem(item);
```

**Effort:** Single write operation.  
The sort key is composed from `resource_id`, `data_version`, and `request_id` joined by `\u001F`.

### queryByResourceId

```javascript
Query({
  KeyConditionExpression: '#p = :tenant AND begins_with(#id, :prefix)',
  ExpressionAttributeNames: { '#p': 'p', '#id': 'id' },
  ExpressionAttributeValues: { ':tenant': tenant_id, ':prefix': resource_id + '\u001F' },
  ScanIndexForward: true
});
```

**Effort:** Single Query operation.  
The `begins_with` with `\u001F` suffix ensures exact resource match (excludes resources that share a prefix). Results sorted by `data_version` due to sort key ordering.

### queryByResourceIdPrefix

```javascript
Query({
  KeyConditionExpression: '#p = :tenant AND begins_with(#id, :prefix)',
  ExpressionAttributeNames: { '#p': 'p', '#id': 'id' },
  ExpressionAttributeValues: { ':tenant': tenant_id, ':prefix': resource_id_prefix },
  ScanIndexForward: true
});
```

**Effort:** Single Query operation.  
DynamoDB seeks to the prefix start and scans until the prefix no longer matches. Returns all resources starting with the prefix, sorted by `data_version`.

### deleteByDataVersionLte

DynamoDB does not support range delete, so this is a two-phase operation:

1. **Query** for all records matching tenant + resource
2. **Batch delete** items where `data_version <= boundary`

```javascript
// Phase 1: Query
const items = Query({ /* ... */ });

// Phase 2: Filter and batch delete
const keysToDelete = items
  .filter(item => parseVersion(item.id) <= boundary)
  .map(item => ({ p: item.p, id: item.id }));

BatchWriteItem({ DeleteRequest: { Key: key } for each key });
```

**Effort:** One Query + one BatchWriteItem (per 25 items).  
Used during `claim()` to remove stale records after the latest is selected.

### Effort Summary

| Operation | Database Effort | Key Usage |
|-----------|-----------------|-----------|
| `PutItem` | 1 write | Inserts into primary key index |
| `Query` (exact resource) | 1 query | PK + SK `begins_with` |
| `Query` (prefix) | 1 query | PK + SK `begins_with` |
| `Query` + `BatchWriteItem` | 2 operations | Query for keys, batch delete |

## Setup

The `setupNewStore()` method provisions the table idempotently:

```javascript
await Lib.DynamoDB.createTable(instance, table_name, {
  attribute_definitions: [
    { name: 'p',  type: 'S' },
    { name: 'id', type: 'S' }
  ],
  key_schema: [
    { name: 'p',  type: 'HASH' },
    { name: 'id', type: 'RANGE' }
  ],
  billing_mode: 'PAY_PER_REQUEST'
});
```

The table is created with:
- Composite key: `p` (HASH) + `id` (RANGE)
- On-demand billing (pay-per-request)
- No TTL or GSI (not needed for queue operations)

## Multi-Tenancy

All queries include `p` (tenant_id) as the partition key. DynamoDB's partition isolation ensures tenants are completely separated at the database level. The composite key enforces uniqueness within each tenant/resource combination through the full `{ p, id }` key.
