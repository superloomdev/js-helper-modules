# @superloomdev/js-server-helper-auth-store-postgres

Class F storage adapter for `helper-auth`. PostgreSQL backend. Standard factory shape: receives `shared_libs`, owns its own `CONFIG`, `ERRORS`, and `Validators`. Returns a ready-to-use store object that is passed to the Auth parent via `CONFIG.Store`. Implements the 8-method session store contract.

## Type
Class F. Storage adapter for `helper-auth`. Service-dependent (PostgreSQL via Docker for emulated, real PostgreSQL for integration).

## Peer Dependencies
- `@superloomdev/js-helper-utils` - injected as `Lib.Utils`
- `@superloomdev/js-helper-debug` - injected as `Lib.Debug`
- `@superloomdev/js-server-helper-sql-postgres` - injected as `Lib.SQL` (alias for `Lib.Postgres`)

## Direct Dependencies
None. The adapter owns no runtime dependencies of its own.

## Companion Files
- `store.config.js` - default config (table_name)
- `store.errors.js` - frozen error catalog (AUTH_STORE_POSTGRES_SERVICE_UNAVAILABLE)
- `store.validators.js` - config validators singleton

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

The adapter picks `Lib.Utils`, `Lib.Debug`, and `Lib.SQL` by reference from the injected container. Auth forwards error envelopes transparently.

## Store Contract

The adapter implements the 8-method session store contract defined by the Auth parent. All methods are async. `instance` is the per-request scope object from `Lib.Instance.initialize()`. Methods return either `success: true` with the requested data, or `success: false` with `error: ERRORS.SERVICE_UNAVAILABLE` and any data field set to a typed empty value (`null` / `[]` / `0`).

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

## Config Keys

| Key | Type | Default | Required |
|---|---|---|---|
| table_name | String | - | yes |

`table_name` is the only config key. One table per actor_type. The loader throws an `Error` if it is missing, null, or empty.

## Exported Functions (8 total)

setupNewStore(instance) → { success, error } | async:yes
  Idempotent SQL schema setup. CREATE TABLE IF NOT EXISTS + CREATE INDEX IF NOT EXISTS on expires_at. Safe on every boot.

getSession(instance, tenant_id, actor_id, token_key, token_secret_hash) → { success, record, error } | async:yes
  Fetch one session by composite key. Returns record: null on hash mismatch (identical to missing row - timing safety).

listSessionsByActor(instance, tenant_id, actor_id) → { success, records, error } | async:yes
  All active sessions for the actor. Expired sessions filtered out.

setSession(instance, record) → { success, error } | async:yes
  UPSERT a session record. Re-inserts the same composite primary key without complaint.

updateSessionActivity(instance, tenant_id, actor_id, token_key, updates) → { success, error } | async:yes
  Partial update of mutable fields. Throws TypeError on identity fields (programmer-error guard).

deleteSession(instance, tenant_id, actor_id, token_key) → { success, error } | async:yes
  Delete one session. Idempotent.

deleteSessions(instance, tenant_id, keys) → { success, error } | async:yes
  Batch delete. No-op success when keys.length === 0 (no database round-trip).

cleanupExpiredSessions(instance) → { success, deleted_count, error } | async:yes
  Sweep expired rows. Required on PostgreSQL (no native TTL). Run via cron or scheduled function.

## Error Catalog

The adapter defines its own error catalog in `store.errors.js`. Auth forwards error envelopes transparently; the adapter's `SERVICE_UNAVAILABLE` type is `AUTH_STORE_POSTGRES_SERVICE_UNAVAILABLE`.

| Error | When |
|---|---|
| `SERVICE_UNAVAILABLE` | Driver-level call failed. The driver's underlying error is logged via `Lib.Debug.debug` and never surfaced |

`getSession` with a hash mismatch is **not** an error. It is success with `record: null`.

## Patterns
- **Factory shape:** receives `shared_libs`, owns its own `CONFIG`, `ERRORS`, and `Validators`. Returns a ready-to-use store object
- **Lib.SQL alias:** caller sets `Lib.SQL = Lib.Postgres` before calling the adapter so it picks up the Postgres driver
- **Idempotent setupNewStore:** CREATE TABLE IF NOT EXISTS + CREATE INDEX IF NOT EXISTS. Safe on every boot
- **UPSERT semantics:** setSession re-inserts the same composite primary key without complaint
- **BIGINT coercion:** pg driver returns BIGINT as strings; adapter coerces to Numbers on read
- **JSON encoding:** custom_data is JSON-encoded into a TEXT column; parsed back on read. Corrupt values surface as null
- **Hash mismatch safety:** getSession returns record: null on wrong secret (identical to missing row - no timing oracle)
- **Identity field guard:** updateSessionActivity throws TypeError on identity fields (programmer error)
- **Source of truth:** store.js is the source file; store.validators.js is the config validator. Schema definitions, UPSERT template, column lists, and identity blocklists live in `_Store` private functions inside store.js. Column ordering aligns with the Auth parent's `parts/record-shape.js` `getFieldNames()`
