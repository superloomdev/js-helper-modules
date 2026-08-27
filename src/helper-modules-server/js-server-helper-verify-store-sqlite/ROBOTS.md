# helper-verify-store-sqlite. AI Reference

Class F storage adapter. SQLite backend for `helper-verify`. Fully independent module that owns its own CONFIG, ERRORS, and Validators. Configured and instantiated independently, then passed to the Verify parent as a ready-to-use store object.

Embedded / in-process. Uses Node's built-in `node:sqlite` through the `helper-sql-sqlite` driver helper. No external service, no Docker, no network.

## Adapter Factory

```js
import verifyStoreSqlite from 'helper-verify-store-sqlite';

const Store = verifyStoreSqlite(Lib, {
  TABLE_NAME: 'verification_codes'
});
```

| Argument | Type | Required | Description |
|---|---|---|---|
| `TABLE_NAME` | String | Yes | Name of the verification table |

Returns a ready-to-use Store interface. The Verify parent receives this object and calls the contract methods to satisfy its persistence needs.

## Configuration

```js
{
  TABLE_NAME: 'verification_codes'  // required. one table per verify instance
}
```

The `TABLE_NAME` key is required. The loader throws an `Error` if it is missing, null, or empty. The SQL driver arrives via `shared_libs.SQL` (injected by the application).

## Store Contract

| Method | Signature | Returns |
|---|---|---|
| `setupNewStore` | `(instance)` | `{ success, error }` |
| `getRecord` | `(instance, namespace, key)` | `{ success, record, error }` |
| `setRecord` | `(instance, namespace, key, record)` | `{ success, error }` |
| `incrementFailCount` | `(instance, namespace, key)` | `{ success, error }` |
| `deleteRecord` | `(instance, namespace, key)` | `{ success, error }` |
| `cleanupExpiredRecords` | `(instance)` | `{ success, deleted_count, error }` |

All methods are async. `instance` is the per-request namespace object from `Lib.Instance.initialize()`. Methods return either `success: true` with the requested data, or `success: false` with `error: ERRORS.SERVICE_UNAVAILABLE` and any data field set to a typed empty value (`null` / `0`).

## Behaviors That Must Not Be Violated When Generating Code

1. **Never call the adapter directly from application code.** Always go through the parent Verify module. The adapter is configured independently and passed as a ready-to-use store object to the Verify parent.

2. **`getRecord` returns `record: null` on a miss.** A missing row is not an error. The verify module checks the returned record before comparing the submitted code.

3. **`setRecord` is a full UPSERT.** Uses `INSERT ... ON CONFLICT ("namespace", "id") DO UPDATE SET col = excluded.col`. Re-inserting the same `(namespace, id)` composite key replaces all mutable columns (`code`, `fail_count`, `created_at`, `expires_at`) in one round-trip.

4. **`incrementFailCount` is an atomic in-place UPDATE.** Issues `SET "fail_count" = "fail_count" + 1`. Safe under concurrent verify attempts - each call adds exactly 1.

5. **`deleteRecord` is idempotent.** A missing row is treated as success; callers never need to check existence first.

6. **`cleanupExpiredRecords` uses `instance.time`.** The bound parameter is the request instance's frozen clock, not `Lib.Utils.getUnixTime()`. This keeps cleanup consistent with the verify-time expiry check.

7. **Identifiers are double-quoted (`"col`).** The adapter rejects any `TABLE_NAME` containing a double-quote at quoting time to prevent DDL injection.

8. **Index name is `{table_name}_expires_at_idx`.** The index name is deterministic and derived from `STORE_CONFIG.table_name` at createInterface time. A table rename means a new index name.

9. **`setupNewStore` is idempotent and safe to call on every boot.** Uses `CREATE TABLE IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS`. Both are fully supported by SQLite.

10. **SQLite has no native TTL.** `cleanupExpiredRecords` is the only deletion path for expired rows. Application code must schedule it (e.g. cron). The `:memory:` mode makes cleanup moot because the database disappears on process exit; the recommendation applies to file-backed deployments.

## Peer Dependencies

```
helper-utils                 (type checks)
helper-debug                 (structured logging)
helper-sql-sqlite            (node:sqlite wrapper)
```

These are injected by the application through the `shared_libs` container. The adapter picks them by reference (`Utils`, `Debug`, `SQL`). It does not import any of them directly.

## Error Catalog Used

The adapter owns its own error catalog (`store.errors.js`):

| Error | When |
|---|---|
| `ERRORS.SERVICE_UNAVAILABLE` | Driver-level call failed. The driver's underlying error is logged via `Lib.Debug.debug` and never surfaced |

## Single Source of Truth

The store's source file is `store.js`; the config validator is `store.validators.js`. The DDL array and UPSERT template are precomputed once per Store instance at `createInterface` time and cached for all subsequent calls. The composite primary key is `("namespace", "id")`.
