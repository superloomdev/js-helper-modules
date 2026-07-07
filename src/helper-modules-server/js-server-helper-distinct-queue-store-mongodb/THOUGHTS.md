# THOUGHTS.md - helper-distinct-queue-store-mongodb

Engineering decision journal. Not published to npm.

---

## Subdocument _id design

**Decision:** Use a compound subdocument `_id: { t, r, d, s }` instead of a plain ObjectId or a string compound key.

**Why:** MongoDB's implicit `_id` index covers all access patterns without any secondary indexes:
- Exact resource: `find({ "_id.t": t, "_id.r": r })` - uses `{ t, r }` index prefix
- Prefix match: `find({ "_id.t": t, "_id.r": { $regex: '^prefix' } })` - range scan on `{ t, r }` prefix
- Delete stale: `deleteMany({ "_id.t": t, "_id.r": r, "_id.d": { $lte: N } })` - uses `{ t, r, d }` prefix

No GSI, no secondary index, zero extra storage, automatic uniqueness on the full `{ t, r, d, s }` combination.

**Why single-character field names:** Reduces stored document size. Each queue record can accumulate many writes; shorter field names reduce both storage and wire transfer cost. The `_id` subdocument fields are opaque to callers - only `docToRecord` and `composeId` ever touch them.

**Rejected alternative - string compound key:** A string like `"tenant|resource|version|request"` would work but requires a delimiter choice (same problem as DynamoDB), escaping logic, and splits on read. The subdocument approach is cleaner - MongoDB stores structured data natively.

**Rejected alternative - ObjectId _id with secondary compound index:** Would allow natural document insertion but requires a secondary index for all access patterns, doubling index storage and adding write overhead on every insert.

---

## $regex for prefix queries

**Decision:** `queryByResourceIdPrefix` uses `{ $regex: '^' + escaped_prefix }` on `_id.r`.

**Why:** The `_id` index prefix on `{ t, r }` combined with an anchored `$regex` performs an efficient range scan - MongoDB seeks to the prefix start in the index and stops when the prefix no longer matches. This is functionally equivalent to a `LIKE 'prefix%'` scan in SQL.

**Why escape the prefix:** Caller-supplied `resource_id_prefix` values can contain regex special characters (dots in `account_123.catalog_1.`, plus signs, etc.). Without escaping, a dot would match any character instead of a literal dot, returning incorrect records. The `replace(/[.*+?^${}()|[\]\\]/g, '\\$&')` pattern is the standard JS regex escaping idiom.

---

## Adapter owns Lib, CONFIG, ERRORS

**Decision:** This adapter builds its own `Lib`, `CONFIG`, and `ERRORS`. It does not accept them from the parent module.

**Why:** Decouples adapter and parent. The only coupling point is the return contract shape: `{ success, error }` on all methods and `{ success, records, error }` on query methods. This allows the adapter to be versioned, replaced, or used standalone without touching parent module code. Adopted as part of Plan 0045.

**Previous pattern (removed):** The adapter originally received `ERRORS` from the parent via the third loader argument and depended on the parent's error catalog. This created tight coupling. Now each module owns its errors independently.

---

## setupNewStore is a no-op

**Decision:** `setupNewStore` logs a debug message and returns `{ success: true }` without making any MongoDB call.

**Why:** MongoDB creates collections and the implicit `_id` index automatically on first write. There is no explicit provisioning step required. The method exists to satisfy the provisioning interface - callers (and the core module's test suite) expect it to be callable without error on a fresh store.

**Why keep the method at all:** Other adapters (SQL-based) use `setupNewStore` to create tables and indexes. Keeping the method ensures all adapters have the same surface, making it safe for the core module to call `store.setupNewStore(instance)` at startup without branching on adapter type.
