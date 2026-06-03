# Schema — js-server-helper-distinct-queue-store-mongodb

## Collection Structure

The adapter stores records in a single MongoDB collection (configurable via `STORE_CONFIG.collection_name`).

### Document Shape

```javascript
{
  _id: {
    t: String,              // tenant_id - partition boundary
    r: String,              // resource_id - supports prefix queries
    d: Number,              // data_version - millisecond timestamp
    s: String               // random_suffix - tie-breaker (opaque to adapter)
  },
  payload: Object,          // Arbitrary caller data (stored as-is)
  action: String,         // Opaque action label
  toc: Number               // Time of creation
}
```

The `_id` is a **compound subdocument** — not a string or ObjectId. This design uses MongoDB's implicit `_id` index for all access patterns, eliminating the need for secondary indexes.

## Index Design

### Smart Index (_id)

MongoDB automatically creates a unique index on `_id`. Because `_id` is a subdocument `{ t, r, d, s }`, the implicit index covers:

```javascript
{ "_id.t": 1, "_id.r": 1, "_id.d": 1, "_id.s": 1 }
```

This is a **smart index** — you can retrieve records without knowing the full `{ t, r, d, s }` key. The index prefix on `{ t, r }` enables "begins with" queries that return all records for a resource even when `data_version` and `random_suffix` are unknown.

**Key Retrieval Goals:**

| Goal | What We Know | Index Usage |
|------|--------------|-------------|
| Get all records for a resource | `tenant_id`, `resource_id` | Query `{ "_id.t": t, "_id.r": r }` — uses index prefix on `{ t, r }` |
| Get records by prefix | `tenant_id`, `resource_id_prefix` | Query `{ "_id.t": t, "_id.r": { $regex: '^prefix' } }` — range scan on index |
| Delete stale records | `tenant_id`, `resource_id`, `data_version_boundary` | Query `{ "_id.t": t, "_id.r": r, "_id.d": { $lte: N } }` — uses `{ t, r, d }` prefix |

**Why This Works:**

We store `data_version` and `random_suffix` inside `_id` (as `d` and `s`) not for query specificity, but for:
1. **Sorting** — `_id.d` provides chronological ordering
2. **Tie-breaking** — `_id.s` ensures uniqueness when multiple records have same millisecond timestamp
3. **Uniqueness** — the full `{ t, r, d, s }` combination is unique per document

But for retrieval, we only need `tenant_id` and `resource_id`. The index "begins with" pattern (`$regex: '^resource_id'`) efficiently scans all records for that resource, then MongoDB sorts by `d` and `s` within the result set.

**Benefits:**
- No secondary indexes needed — single implicit `_id` index handles all access patterns
- Zero extra storage overhead
- Automatic uniqueness guarantee on the full `{ t, r, d, s }` combination

## Query Patterns & Operational Effort

MongoDB's cost is measured in **operations performed** (not documents scanned or returned). All our access patterns use **single-roundtrip index lookups** — no collection scans.

### writeRecord

Uses `insertOne` with compound `_id` built from record fields:

```javascript
const document = {
  _id: { t: tenant_id, r: resource_id, d: data_version, s: random_suffix },
  payload: payload,
  action: action,
  toc: toc
};
insertOne(document);
```

**Effort:** Single write operation.

### queryByResourceId

```javascript
find(
  { "_id.t": "tenant_123", "_id.r": "account_456.product_789" },
  { sort: { "_id.d": 1 } }
)
```

**Effort:** Single index scan on `{ t, r }` prefix. Returns all matching documents.  
Uses dot notation to query subdocument fields. Results sorted chronologically by `_id.d`.

### queryByResourceIdPrefix

```javascript
find(
  {
    "_id.t": "tenant_123",
    "_id.r": { $regex: '^account_456\\.' }
  },
  { sort: { "_id.d": 1 } }
)
```

**Effort:** Single index range scan. The anchored `$regex` (`^`) uses the index efficiently — MongoDB seeks to the prefix start and scans until the prefix no longer matches.  
Returns all resources starting with the prefix, sorted by `data_version`.

### deleteByDataVersionLte

```javascript
deleteMany({
  "_id.t": "tenant_123",
  "_id.r": "account_456.product_789",
  "_id.d": { $lte: 1234567890123 }
})
```

**Effort:** Single delete operation. Uses the `{ t, r, d }` index prefix to find matching documents efficiently.  
Deletes all stale records in one roundtrip.

### Effort Summary

| Operation | Database Effort | Index Usage |
|-----------|--------------|-------------|
| `insertOne` | 1 write | Inserts into `_id` index |
| `find` (exact resource) | 1 index scan | Uses `{ t, r }` prefix |
| `find` (prefix) | 1 index range scan | Uses `{ t, r }` prefix with range |
| `deleteMany` | 1 delete | Uses `{ t, r, d }` prefix |

**Note:** All operations complete in a single roundtrip to the database. The "begins with" query requires the same effort whether it returns 1 record or 100 records — only one index scan is performed.

## Setup

The `setupNewStore()` method is a no-op for this adapter:

```javascript
// No explicit index creation needed
// MongoDB's implicit _id index covers all query patterns
```

The implicit `_id` index is created automatically when the collection is first written to.

## Sorting with Subdocument _id

The index order is `{ t, r, d, s }`. This means:

| You Query | You Can Sort By | Index Used? |
|-----------|-----------------|-------------|
| `{ "_id.t": t, "_id.r": r }` | `{ "_id.d": 1 }` | ✅ Yes |
| `{ "_id.t": t, "_id.r": { $regex: '^p' } }` | `{ "_id.d": 1 }` | ✅ Yes (range scan) |

All distinct-queue access patterns constrain `t` (tenant) and `r` (resource) before sorting by `d` (data_version), so the index is always used efficiently.

## Multi-Tenancy

All queries include `"_id.t"` as the first filter criterion. The compound `_id` structure ensures tenant isolation at the database level. The implicit index enforces uniqueness within each tenant/resource combination through the full `{ t, r, d, s }` key.
