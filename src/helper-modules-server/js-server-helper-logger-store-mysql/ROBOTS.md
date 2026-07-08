# helper-logger-store-mysql. AI Reference

MySQL / MariaDB storage adapter for `helper-logger`. Constructed first by application code and passed as a ready-to-use store object to the Logger parent. Receives `shared_libs` (Utils, Debug, SQL) by injection.

Requires a running MySQL or MariaDB instance. Uses `helper-sql-mysql` (pooled `mysql2` driver wrapper) injected via `shared_libs.SQL`.

## Construction

```js
const Store = require('@superloomdev/js-server-helper-logger-store-mysql')(Lib, {
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

## Behaviors That Must Not Be Violated When Generating Code

1. **Construct the adapter before the Logger.** The adapter is fully independent. Pass the returned store object as `CONFIG.Store` to the Logger parent.

2. **`sort_key` is the primary key.** Globally unique, timestamp-based string.

3. **`addLog` is idempotent.** Uses `INSERT ... ON DUPLICATE KEY UPDATE sort_key = sort_key` (MySQL no-op pattern). Re-inserting the same `sort_key` is silently ignored.

4. **`getLogsByEntity` and `getLogsByActor` use cursor pagination.** `cursor` is a `sort_key` value.

5. **`cleanupExpiredLogs` uses real wall-clock time.** Not `instance.time`. Condition: `` `expires_at` IS NOT NULL AND `expires_at` <= ? ``.

6. **`data` column is JSON-serialized TEXT.** Serialized on write, parsed on read.

7. **Identifiers are backtick-quoted (`` `col` ``).** The adapter rejects any `table_name` containing a backtick.

8. **All indexes are inlined in `CREATE TABLE IF NOT EXISTS`.** MySQL does not support `CREATE INDEX IF NOT EXISTS` standalone. Entity, actor, and expires_at indexes are all inlined.

9. **`setupNewStore` is idempotent** via `CREATE TABLE IF NOT EXISTS` with all indexes inlined in one statement.

10. **MySQL has no native TTL.** `cleanupExpiredLogs` is the only deletion path for TTL log rows.

## Dependencies

All injected via `shared_libs`:
```
helper-utils         (type checks)        shared_libs.Utils
helper-debug         (structured logging)  shared_libs.Debug
helper-sql-mysql     (mysql2 driver wrapper) shared_libs.SQL
```

## Error Catalog

| Error | When |
|---|---|
| `SERVICE_UNAVAILABLE` | Driver-level call failed. Logged via `Lib.Debug.error`, returned as `{ success: false, error }` |

## Single Source of Truth

The store's source file is `store.js`; the config validator is `store.validators.js`; the error catalog is `store.errors.js`. Primary key is `` `sort_key` ``. All three indexes inlined in `CREATE TABLE`. Index names derived from `CONFIG.table_name`.
