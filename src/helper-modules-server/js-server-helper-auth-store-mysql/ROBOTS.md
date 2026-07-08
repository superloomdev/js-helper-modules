# helper-auth-store-mysql. AI Reference

Class F storage adapter. MySQL backend for `helper-auth`. Standard factory shape: receives `shared_libs`, owns its own `CONFIG`, `ERRORS`, and `Validators`. Returns a ready-to-use store object that is passed to the Auth parent via `CONFIG.Store`. Wire-compatible with MariaDB 10.3+ for the SQL surface this adapter uses.

## Loader Pattern

```js
Lib.SQL = Lib.MySQL;  // alias so the adapter picks Lib.SQL

const Store = require('@superloomdev/js-server-helper-auth-store-mysql')(Lib, {
  table_name: 'sessions_user'
});

Lib.AuthUser = require('@superloomdev/js-server-helper-auth')(Lib, {
  Store:      Store,
  ACTOR_TYPE: 'user'
});
```

| Config key | Type | Notes |
|---|---|---|
| `table_name` | String | Required. One table per actor_type |

The adapter picks `Lib.Utils`, `Lib.Debug`, and `Lib.SQL` by reference from the injected container. Auth forwards error envelopes transparently.

## Config

```js
{
  table_name: 'sessions_user'  // required. one table per actor_type
}
```

`table_name` is required. The loader throws an `Error` if it is missing, null, or empty.

## Store Contract

| Method | Signature | Returns |
|---|---|---|
| `setupNewStore` | `(instance)` | `{ success, error }` |
| `getSession` | `(instance, tenant_id, actor_id, token_key, token_secret_hash)` | `{ success, record, error }` |
| `listSessionsByActor` | `(instance, tenant_id, actor_id)` | `{ success, records, error }` |
| `setSession` | `(instance, record)` | `{ success, error }` |
| `updateSessionActivity` | `(instance, tenant_id, actor_id, token_key, updates)` | `{ success, error }` |
| `deleteSession` | `(instance, tenant_id, actor_id, token_key)` | `{ success, error }` |
| `deleteSessions` | `(instance, tenant_id, keys)` | `{ success, error }` |
| `cleanupExpiredSessions` | `(instance)` | `{ success, deleted_count, error }` |

All methods are async. `instance` is the per-request scope object from `Lib.Instance.initialize()`. Methods return either `success: true` with the requested data, or `success: false` with `error: ERRORS.SERVICE_UNAVAILABLE` and any data field set to a typed empty value (`null` / `[]` / `0`).

## Behaviors That Must Not Be Violated When Generating Code

1. **Call the adapter with `Lib` and config, then pass the result as `Store` to the Auth parent.** Application code calls `require('...auth-store-mysql')(Lib, { table_name })` to get a ready-to-use store object, then passes it to the Auth parent as `CONFIG.Store`. Ensure `Lib.SQL` is set to `Lib.MySQL` before calling.

2. **`getSession` returns `record: null` on hash mismatch.** Identical to the "session does not exist" shape. The wrong-secret path must not surface as an error envelope or distinct return; it must look identical to a missing row to prevent timing-based enumeration. The compare runs after the primary-key row read.

3. **`updateSessionActivity` throws `TypeError` on identity fields.** Programmer-error guard. The blocked fields are `tenant_id`, `actor_id`, `actor_type`, `token_key`, `token_secret_hash`, `created_at`, `install_id`, `install_platform`, `install_form_factor`. The Auth parent never passes these. Do not catch and swallow.

4. **`setSession` is an UPSERT.** Uses `INSERT ... ON DUPLICATE KEY UPDATE col = VALUES(col)`. Re-inserts the same composite primary key without complaint. The `ON DUPLICATE KEY UPDATE` clause excludes the primary-key triple and the per-install fields (`created_at`, `install_id`, `install_platform`, `install_form_factor`) from the update list so a second `setSession` cannot rewrite the session's creation metadata.

5. **`deleteSessions` with `keys.length === 0` is a no-op success.** Returns `{ success: true, error: null }` without round-trip to the driver.

6. **Identifiers are backtick-quoted.** `` `col` `` style, not double-quoted. This is MySQL's native style; differs from Postgres and SQLite (which use double quotes) but matches MariaDB.

7. **`client_is_browser` is stored as TINYINT(1) 0/1.** MySQL's BOOLEAN type is a synonym for TINYINT(1); the adapter uses TINYINT(1) explicitly. Coerced on both write (`Boolean(value)` to `0` or `1`) and read (driver returns may vary between number and Buffer; the adapter normalizes to a JS boolean). `undefined` and `null` reads surface as `false` for record-shape stability.

8. **BIGINT columns surface as Numbers on read.** The `mysql2` driver typically returns BIGINT as JS Number when values fit in safe integer range. The adapter defensively coerces from string too so downstream code can rely on `record.expires_at` being a `Number` regardless of driver version.

9. **`custom_data` is JSON-encoded into a TEXT column.** On read the JSON is parsed back to an object. Corrupt stored values surface as `null`, not as throws.

10. **`table_name` cannot contain a backtick.** The adapter throws at quoting time. The loader does not reject this at config-validation time; a malformed `table_name` surfaces on first call.

11. **`setupNewStore` is one statement.** Issues a single `CREATE TABLE IF NOT EXISTS` with the `expires_at` index inlined as `INDEX idx_expires_at (expires_at)`. MySQL does not support `CREATE INDEX IF NOT EXISTS` as a standalone statement, so the inline form is the only idempotent path for creating both the table and the index in one boot-time call.

12. **MySQL has no native row-level TTL.** `cleanupExpiredSessions` is the only deletion path for expired rows. Application code must schedule it (cron, scheduled function, or MySQL's Event Scheduler).

## Peer Dependencies

```
Lib.Utils    (@superloomdev/js-helper-utils)             injected via shared_libs
Lib.Debug    (@superloomdev/js-helper-debug)             injected via shared_libs
Lib.SQL      (@superloomdev/js-server-helper-sql-mysql)  injected via shared_libs as alias
```

All three are injected by the caller. The adapter owns no runtime dependencies of its own.

## Error Catalog

The adapter defines its own error catalog in `store.errors.js`. Auth forwards error envelopes transparently; the adapter's `SERVICE_UNAVAILABLE` type is `AUTH_STORE_MYSQL_SERVICE_UNAVAILABLE`.

| Error | When |
|---|---|
| `SERVICE_UNAVAILABLE` | Driver-level call failed. The driver's underlying error is logged via `Lib.Debug.debug` and never surfaced |

`getSession` with a hash mismatch is **not** an error. It is success with `record: null`.

## Single Source of Truth

The store's source file is `store.js`; the config validator is `store.validators.js`. Schema definitions, the inlined-index DDL, the UPSERT template using `VALUES(col)`, column lists, and identity blocklists live in `_Store` private functions inside `store.js`. The column ordering aligns with the Auth parent's `parts/record-shape.js` `getFieldNames()`.
