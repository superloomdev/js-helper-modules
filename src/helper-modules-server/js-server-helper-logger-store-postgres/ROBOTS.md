# helper-logger-store-postgres. AI Reference

PostgreSQL storage adapter for `helper-logger`. Constructed first by application code and passed as a ready-to-use store object to the Logger parent. Receives `shared_libs` (Utils, Debug, SQL) by injection.

Requires a running PostgreSQL instance. Uses `helper-sql-postgres` (pooled `pg` driver wrapper) injected via `shared_libs.SQL`.

## Construction

```js
const Store = require('@superloomdev/js-server-helper-logger-store-postgres')(Lib, {
  table_name: 'action_log'  // required. one table per logger instance
});

Lib.Logger = require('@superloomdev/js-server-helper-logger')(Lib, {
  Store: Store
});
```

`table_name` is required. The loader throws an `Error` if it is missing, null, or empty.

## Store Contract

| Method | Signature | Returns |
|---|---|---|
| `setupNewStore` | `(instance)` | `{ success, error }` |
| `addLog` | `(instance, record)` | `{ success, error }` |
| `getLogsByEntity` | `(instance, query)` | `{ success, records, next_cursor, error }` |
| `getLogsByActor` | `(instance, query)` | `{ success, records, next_cursor, error }` |
| `cleanupExpiredLogs` | `(instance)` | `{ success, deleted_count, error }` |

All methods are async. `instance` is the per-request scope object from `Lib.Instance.initialize()`.

## Behaviors That Must Not Be Violated When Generating Code

1. **Construct the adapter before the Logger.** The adapter is fully independent. Pass the returned store object as `CONFIG.Store` to the Logger parent.

2. **`sort_key` is the primary key.** Globally unique, timestamp-based string from the Logger parent.

3. **`addLog` is idempotent.** Uses `INSERT ... ON CONFLICT ("sort_key") DO NOTHING`. Re-inserting the same `sort_key` is silently ignored.

4. **`getLogsByEntity` and `getLogsByActor` use cursor pagination.** `cursor` is a `sort_key` value. The adapter fetches `limit + 1` rows to detect next page.

5. **`cleanupExpiredLogs` uses real wall-clock time.** Not `instance.time`. Condition: `"expires_at" IS NOT NULL AND "expires_at" <= ?`.

6. **`data` column is JSON-serialized TEXT.** Serialized on write, parsed on read.

7. **Identifiers are double-quoted (`"col"`).** The adapter rejects any `table_name` containing a double-quote.

8. **Three separate `CREATE INDEX IF NOT EXISTS` statements** are used (entity, actor, expires_at). Unlike MySQL, PostgreSQL supports standalone `CREATE INDEX IF NOT EXISTS`.

9. **`setupNewStore` is idempotent.** Uses `CREATE TABLE IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS`.

10. **PostgreSQL has no native TTL.** `cleanupExpiredLogs` is the only deletion path for TTL log rows.

11. **BIGINT columns (`created_at`, `created_at_ms`, `expires_at`) may be returned as strings by the `pg` driver.** The adapter coerces these to `Number` on read via `Number(row.col)`.

## Dependencies

All injected via `shared_libs`:
```
helper-utils           (type checks)       shared_libs.Utils
helper-debug           (structured logging) shared_libs.Debug
helper-sql-postgres    (pg driver wrapper)  shared_libs.SQL
```

## Error Catalog

| Error | When |
|---|---|
| `SERVICE_UNAVAILABLE` | Driver-level call failed. Logged via `Lib.Debug.error`, returned as `{ success: false, error }` |

## Single Source of Truth

The store's source file is `store.js`; the config validator is `store.validators.js`; the error catalog is `store.errors.js`. Primary key is `"sort_key"`. All three index names are derived deterministically from `CONFIG.table_name`.
