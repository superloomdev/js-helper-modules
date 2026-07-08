# helper-auth-store-postgres. AI Reference

Class F storage adapter. PostgreSQL backend for `helper-auth`. Standard factory shape: receives `shared_libs`, owns its own `CONFIG`, `ERRORS`, and `Validators`. Returns a ready-to-use store object that is passed to the Auth parent via `CONFIG.Store`.

## Loader Pattern

```js
Lib.SQL = Lib.Postgres;  // alias so the adapter picks Lib.SQL

const Store = require('@superloomdev/js-server-helper-auth-store-postgres')(Lib, {
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

## Store Contract. Eight Methods

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

1. **Call the adapter with `Lib` and config, then pass the result as `Store` to the Auth parent.** Application code calls `require('...auth-store-postgres')(Lib, { table_name })` to get a ready-to-use store object, then passes it to the Auth parent as `CONFIG.Store`. Ensure `Lib.SQL` is set to `Lib.Postgres` before calling.

2. **`getSession` returns `record: null` on hash mismatch.** Identical to the "session does not exist" shape. The wrong-secret path must not surface as an error envelope or distinct return; it must look identical to a missing row to prevent timing-based enumeration.

3. **`updateSessionActivity` throws `TypeError` on identity fields.** Programmer-error guard. The Auth module never passes identity fields. If a generated caller passes any of `tenant_id`, `actor_id`, `actor_type`, `token_key`, `token_secret_hash`, `created_at`, `install_id`, `install_platform`, `install_form_factor`, the throw is the intended behavior. Do not catch and swallow.

4. **`setSession` is an UPSERT.** It re-inserts the same composite primary key without complaint. Application code that wants exclusive insert semantics must check the parent's API, not bypass the adapter.

5. **`deleteSessions` with `keys.length === 0` is a no-op success.** Returns `{ success: true, error: null }` without round-trip to the database.

6. **BIGINT columns surface as Numbers on read.** The `pg` driver returns them as strings; the adapter coerces. Downstream code can rely on `record.expires_at` being a `Number`.

7. **`custom_data` is JSON-encoded into a `TEXT` column.** On read the JSON is parsed back to an object. Corrupt stored values surface as `null`, not as throws.

8. **`table_name` cannot contain a double-quote.** The adapter throws at quoting time. The loader does not reject this at config-validation time; a malformed `table_name` surfaces on first call.

9. **`setupNewStore` is idempotent and safe to call on every boot.** Uses `CREATE TABLE IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS`.

10. **PostgreSQL has no native TTL.** `cleanupExpiredSessions` is the only deletion path for expired rows. Application code must schedule it (cron, scheduled function invocation, or `pg_cron`).

## Peer Dependencies

```
Lib.Utils    (@superloomdev/js-helper-utils)              injected via shared_libs
Lib.Debug    (@superloomdev/js-helper-debug)              injected via shared_libs
Lib.SQL      (@superloomdev/js-server-helper-sql-postgres) injected via shared_libs as alias
```

All three are injected by the caller. The adapter owns no runtime dependencies of its own.

## Error Catalog Used

The adapter defines its own error catalog in `store.errors.js`. Auth forwards error envelopes transparently; the adapter's `SERVICE_UNAVAILABLE` type is `AUTH_STORE_POSTGRES_SERVICE_UNAVAILABLE`.

| Error | When |
|---|---|
| `SERVICE_UNAVAILABLE` | Driver-level call failed. The driver's underlying error is logged via `Lib.Debug.debug` and never surfaced |

`getSession` with a hash mismatch is **not** an error. It is success with `record: null`.

## Single Source of Truth

The store's source file is `store.js`; the config validator is `store.validators.js`. Schema definitions, UPSERT template, column lists, and identity blocklists live in `_Store` private functions inside `store.js`. The column ordering aligns with the Auth parent's `parts/record-shape.js` `getFieldNames()`.
