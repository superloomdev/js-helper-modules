# helper-auth-store-dynamodb. AI Reference

Class F storage adapter. AWS DynamoDB backend for `helper-auth`. Standard factory shape: receives `shared_libs`, owns its own `CONFIG`, `ERRORS`, and `Validators`. Returns a ready-to-use store object that is passed to the Auth parent via `CONFIG.Store`.

Cloud-native. Uses a single-table design with composite Sort Key. Table provisioning is out-of-band (IaC); `setupNewStore` returns `NOT_IMPLEMENTED`. Native TTL available at the table level.

## Loader Pattern

```js
const Store = require('@superloomdev/js-server-helper-auth-store-dynamodb')(Lib, {
  table_name: 'sessions_user'
});

Lib.AuthUser = require('@superloomdev/js-server-helper-auth')(Lib, {
  Store:      Store,
  ACTOR_TYPE: 'user'
});
```

| Config key | Type | Notes |
|---|---|---|
| `table_name` | String | Required. The DynamoDB table name |

The adapter picks `Lib.Utils`, `Lib.Debug`, and `Lib.DynamoDB` by reference from the injected container. Auth forwards error envelopes transparently.

## Config

```js
{
  table_name: 'sessions_user'  // required. the DynamoDB table name
}
```

`table_name` is required. The loader throws an `Error` if it is missing, null, or empty.

## Store Contract

| Method | Signature | Returns |
|---|---|---|
| `setupNewStore` | `(instance)` | `{ success: false, error: ERRORS.NOT_IMPLEMENTED }` |
| `getSession` | `(instance, tenant_id, actor_id, token_key, token_secret_hash)` | `{ success, record, error }` |
| `listSessionsByActor` | `(instance, tenant_id, actor_id)` | `{ success, records, error }` |
| `setSession` | `(instance, record)` | `{ success, error }` |
| `updateSessionActivity` | `(instance, tenant_id, actor_id, token_key, updates)` | `{ success, error }` |
| `deleteSession` | `(instance, tenant_id, actor_id, token_key)` | `{ success, error }` |
| `deleteSessions` | `(instance, tenant_id, keys)` | `{ success, error }` |
| `cleanupExpiredSessions` | `(instance)` | `{ success, deleted_count, error }` |

All methods are async. `instance` is the per-request scope object from `Lib.Instance.initialize()`. Methods return either `success: true` with the requested data, or `success: false` with `error: ERRORS.SERVICE_UNAVAILABLE` (or `ERRORS.NOT_IMPLEMENTED` for `setupNewStore`) and any data field set to a typed empty value (`null` / `[]` / `0`).

## Behaviors That Must Not Be Violated When Generating Code

1. **Call the adapter with `Lib` and config, then pass the result as `Store` to the Auth parent.** Application code calls `require('...auth-store-dynamodb')(Lib, { table_name })` to get a ready-to-use store object, then passes it to the Auth parent as `CONFIG.Store`.

2. **`setupNewStore` is not implemented.** Returns `{ success: false, error: ERRORS.NOT_IMPLEMENTED }`. The DynamoDB table must be provisioned out-of-band via IaC, AWS Console, or the driver helper's table-management API (if and when it gains one). Do not attempt to implement table creation in application code.

3. **`getSession` returns `record: null` on hash mismatch.** Identical to the "session does not exist" shape. The wrong-secret path must not surface as an error envelope or distinct return; it must look identical to a missing row to prevent timing-based enumeration. The compare runs after the `GetItem` call.

4. **`updateSessionActivity` throws `TypeError` on identity fields.** Programmer-error guard. The blocked fields are `tenant_id`, `actor_id`, `actor_type`, `token_key`, `token_secret_hash`, `created_at`, `install_id`, `install_platform`, `install_form_factor`, `session_key`. The last one (`session_key`) is DynamoDB-specific; it is the Sort Key attribute and must never be mutated. The Auth parent never passes these; the guard exists so a regression surfaces immediately rather than silently corrupting composite-key integrity.

5. **`setSession` uses `PutItem` (full replace).** Not a conditional update. The same `(tenant_id, actor_id, token_key)` triple overwrites the existing item entirely. The `recordToItem` helper adds the computed `session_key` Sort Key attribute; this is the only DynamoDB-specific field in the stored item.

6. **The Sort Key attribute is `session_key`.** The adapter computes it as `` `${actor_id}#${token_key}` ``. This is a DynamoDB-only implementation detail; the canonical record shape never exposes `session_key`. It is stripped by `itemToRecord` on read.

7. **`custom_data` is stored as a native Map (`M`) attribute.** Unlike the SQL adapters which JSON-encode to TEXT, DynamoDB stores `custom_data` as a first-class Map attribute. `null` values are omitted entirely. The driver helper handles DynamoDB's type system; the adapter passes the canonical record through.

8. **`deleteSessions` uses `BatchWriteItem`.** The driver helper handles the AWS 25-item batch limit via automatic chunking. The adapter builds a `keysByTable` map and delegates; it does not implement its own chunking logic.

9. **`cleanupExpiredSessions` uses Scan-then-batchDelete.** DynamoDB does not support a single-shot DELETE by predicate. The adapter scans with a `FilterExpression` on `expires_at`, then calls `batchDeleteRecords` on the returned items. This is O(table-size); for large tables, native TTL is strongly preferred.

10. **Native TTL is table-level, not row-level.** Enable `TimeToLiveSpecification` with `AttributeName: expires_at` during table provisioning. Once enabled, DynamoDB deletes expired items automatically (within 48 hours). `cleanupExpiredSessions` is then optional; it can still be called for immediate hard-delete when needed.

11. **IAM permissions are required.** The adapter's AWS SDK calls need specific DynamoDB actions. See `docs/configuration.md` for the minimum IAM policy. The adapter does not handle credential acquisition; that is the driver helper's responsibility.

## Peer Dependencies

```
Lib.Utils    (@superloomdev/js-helper-utils)                    injected via shared_libs
Lib.Debug    (@superloomdev/js-helper-debug)                    injected via shared_libs
Lib.DynamoDB (@superloomdev/js-server-helper-nosql-aws-dynamodb) injected via shared_libs
```

All three are injected by the caller. The adapter owns no runtime dependencies of its own.

## Error Catalog

The adapter defines its own error catalog in `store.errors.js`. Auth forwards error envelopes transparently.

| Error | Type | When |
|---|---|---|
| `SERVICE_UNAVAILABLE` | `AUTH_STORE_DYNAMODB_SERVICE_UNAVAILABLE` | Driver-level call failed. Logged via `Lib.Debug.debug`, never surfaced |
| `NOT_IMPLEMENTED` | `AUTH_STORE_DYNAMODB_NOT_IMPLEMENTED` | Returned unconditionally from `setupNewStore` |

`getSession` with a hash mismatch is **not** an error. It is success with `record: null`.

## Single Source of Truth

The store's source file is `store.js`; the config validator is `store.validators.js`. Table design (PK/SK strategy), item encoding helpers (`recordToItem`, `itemToRecord`), identity blocklist, and DynamoDB operation calls live in `store.js`. The Sort Key construction (`` `${actor_id}#${token_key}` ``) is computed by `_Store.sortKey` and used consistently across all methods.
