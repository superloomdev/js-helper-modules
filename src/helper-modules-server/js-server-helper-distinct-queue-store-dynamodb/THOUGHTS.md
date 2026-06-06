# THOUGHTS.md — js-server-helper-distinct-queue-store-dynamodb

Engineering decision journal. Not published to npm.

---

## Composite sort key design

**Decision:** Use a single sort key `id` composed as `resource_id + KEY_DELIMITER + data_version + KEY_DELIMITER + request_id`.

**Why:** DynamoDB `begins_with` queries on a sort key let us retrieve all records for a given `resource_id` (exact match: append the delimiter) or all records under a resource prefix (prefix match: pass verbatim) — both without a Global Secondary Index (GSI). A GSI would add cost, latency, and eventual-consistency hazards.

**Why the delimiter is `\u001F`:** ASCII Unit Separator (US) is a non-printable control character. Caller-supplied `resource_id` values are human-readable strings (dot-separated paths, UUIDs, etc.) that will never contain this character. This guarantees the three sort key segments can be split unambiguously without escaping.

**Rejected alternative — GSI on resource_id:** Would allow a direct `resource_id = X` key condition, but adds per-write cost, a GSI maintenance burden, and eventual-consistency exposure. The `begins_with` approach on a composite sort key is strictly better for this workload.

**Rejected alternative — resource_id as the sort key directly:** Would support exact-resource queries but not prefix queries. Prefix queries (`queryByResourceIdPrefix`) are a first-class contract method, so this was a non-starter.

---

## Batch delete via query + batchDeleteRecords

**Decision:** `deleteByDataVersionLte` runs a prefix query first, filters in-application-memory, then calls `batchDeleteRecords` with only the matching keys.

**Why:** DynamoDB has no native range delete. The `begins_with` query on `(tenant_id, resource_id + KEY_DELIMITER)` retrieves only the target resource's records; the post-filter to `data_version <= boundary` runs on the small result set. This is correct and efficient for queue workloads where `deleteByDataVersionLte` is called after a `claim` that has already loaded the same records.

**Rejected alternative — Scan + FilterExpression:** Would read the entire table. Completely wrong for a multi-tenant system.

---

## Adapter fully owns Lib, CONFIG, ERRORS

**Decision:** This adapter does not accept `ERRORS` or shared `Lib` from the parent module. It builds its own `Lib` from the injected `shared_libs`, defines its own `ERRORS`, and returns a ready-to-use store object.

**Why:** Decouples adapter and parent. The only coupling point is the return contract shape: `{ success, error }` on all methods. This allows adapter versioning and replacement without touching parent module code. Adopted as part of Plan 0045.

**Previous pattern (removed):** The adapter originally received `ERRORS` from the parent via loader arguments and depended on the parent's error catalog. This created tight coupling — changing the parent's error catalog forced adapter changes. Now each module owns its errors.

---

## KEY_DELIMITER in config (not hardcoded)

**Decision:** `KEY_DELIMITER` is a config key with a safe default (`\u001F`), not a hardcoded constant.

**Why:** Allows advanced callers to override it (e.g., if migrating from a system that used a different delimiter). The override carries significant migration risk (existing stored sort keys would become unreadable), which is documented in `docs/configuration.md` and `store.config.js`.

**Validation:** `store.validators.js` enforces that `KEY_DELIMITER` is a non-empty string. An empty delimiter would silently corrupt all sort key composition and parsing.
