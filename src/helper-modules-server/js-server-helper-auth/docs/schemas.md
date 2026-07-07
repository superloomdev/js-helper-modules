# Schemas. `helper-auth`

The validated contracts at the module boundary: what a caller must pass, what the store must provide, and what comes back. These contracts are enforced in `auth.validators.js` and are the module's hard edges. For the persisted record shape see [Data Model](data-model.md). For the function reference see [API Reference](api.md). For configuration keys see [Configuration](configuration.md).

## On This Page

- [Throw Versus Return](#throw-versus-return)
- [CONFIG Schema](#config-schema)
- [JWT Schema](#jwt-schema)
- [Call-Option Schemas](#call-option-schemas)
- [Store Contract](#store-contract)
- [Response Envelope](#response-envelope)

---

## Throw Versus Return

The module sorts every failure into one of two categories, and the category decides the mechanism.

| Category | Trigger | Mechanism | When |
|---|---|---|---|
| **Programmer error** | A missing required option, a wrong type, a reserved character (`-` or `#`) in `actor_id`, a `#` in `tenant_id`, a malformed `CONFIG`, a store missing a required method | Throws synchronously (`TypeError` for call options, `Error` for config and store-contract setup) | At the call site, or at construction for config and store errors |
| **Operational error** | Session-cap reached, token not found, expired, actor-type mismatch, store driver failure, replayed refresh token | Returns `{ success: false, error }` through the response envelope | At runtime, on the awaited result |

A programmer error is a bug in the calling code and surfaces loudly and immediately. An operational error is an expected runtime outcome and is meant to be handled. Setup and shape problems throw at boot or at the call site; everything that can happen during normal operation returns through the envelope. The operational `error.type` values are catalogued in the [API Reference](api.md#error-catalog).

---

## CONFIG Schema

The merged `CONFIG` object passed to the loader. Validated once, at construction, by `validateConfig`. A violation throws an `Error` before the instance is built, so misconfiguration fails at boot, never on the first request.

| Field | Type | Required | Constraint |
|---|---|---|---|
| `Store` | `object` | Yes | A ready-to-use store object, not a factory and not a string. A missing or non-object value throws. The method contract is checked separately (see [Store Contract](#store-contract)) |
| `ACTOR_TYPE` | `string` | Yes | Non-empty. The actor kind this instance owns; stamped on every record and verified on every read |
| `TTL_SECONDS` | `integer` | No | Greater than `0`. Session lifetime in seconds. Defaults to `2592000` (30 days) |
| `LAST_ACTIVE_UPDATE_INTERVAL_SECONDS` | `integer` | No | Zero or greater. Throttle window for the activity write-back. Defaults to `600` |
| `LIMITS` | `object` | No | Plain object. `LIMITS.total_max` must be a positive integer and `LIMITS.evict_oldest_on_limit` must be a boolean; both are hard-validated |
| `ENABLE_JWT` | `boolean` | No | Defaults to `false`. When `true`, the [JWT Schema](#jwt-schema) is validated |
| `COOKIE_PREFIX` | `string` | Conditional | Not construction-validated. Required at runtime by any flow that reads or writes cookies; without it, cookie descriptors come back `null` |

`LIMITS.by_form_factor_max` and `LIMITS.by_platform_max` are not hard-validated at construction; the policy reads them defensively at call time, where a `null` means unlimited. `COOKIE_PREFIX` is the one key not checked at boot, because cookie use is optional: a Bearer-header-only deployment never sets it.

---

## JWT Schema

Validated only when `CONFIG.ENABLE_JWT` is `true`, by the JWT branch of `validateConfig`. In DB mode the whole block is ignored. A violation throws an `Error` at construction.

| Field | Type | Required (JWT on) | Constraint |
|---|---|---|---|
| `JWT` | `object` | Yes | Plain object |
| `JWT.signing_key` | `string` | Yes | At least 32 characters, for an HS256 HMAC security margin. Loaded from a secret store, never committed |
| `JWT.issuer` | `string` | Yes | Non-empty. The `iss` claim |
| `JWT.audience` | `string` | Yes | Non-empty. The `aud` claim |
| `JWT.access_token_ttl_seconds` | `integer` | No | Greater than `0`. Defaults to `900` (15 minutes) |
| `JWT.refresh_token_ttl_seconds` | `integer` | No | Greater than `0`. Defaults to `2592000` (30 days) |

`JWT.algorithm` (fixed at `'HS256'`) and `JWT.rotate_refresh_token` (defaults to `true`) are not validated; the module reads them directly.

---

## Call-Option Schemas

The second argument to each public function. Validated per call by the matching `validate*Options` function. A violation throws a `TypeError` at the call site. Every store-touching function requires `tenant_id`; there is no cross-tenant path.

### createSession

The widest option set. `tenant_id` and `actor_id` carry separator constraints because both enter the composite store key and `actor_id` also enters the wire `auth_id`.

| Option | Type | Required | Constraint |
|---|---|---|---|
| `tenant_id` | `string` | Yes | Non-empty. Must not contain `#` |
| `actor_id` | `string` | Yes | Non-empty. Must not contain `-` or `#` |
| `install_platform` | `string` | Yes | One of `web`, `ios`, `android`, `macos`, `windows`, `linux`, `other` |
| `install_form_factor` | `string` | Yes | One of `mobile`, `tablet`, `desktop`, `tv`, `watch`, `other` |
| `install_id` | `string` | No | Non-empty when present. Triggers same-installation replacement |
| `client_name`, `client_version`, `client_os_name`, `client_os_version`, `client_ip_address`, `client_user_agent` | `string` | No | Type-checked only when present |
| `client_is_browser` | `boolean` | No | Type-checked only when present |
| `client_screen_w`, `client_screen_h` | `integer` | No | Type-checked only when present |
| `custom_data` | `object` | No | Plain object when present; stored verbatim |

### Identity-scoped options

Each function below validates a small fixed set of non-empty string options.

| Function | Required options |
|---|---|
| `verifySession` | None. `auth_id` is optional (non-empty when present); without it, the token is read from the `Authorization` header, then the cookie |
| `removeSession` | `tenant_id`, `actor_id`, `token_key` |
| `removeOtherSessions` | `tenant_id`, `actor_id`, `keep_token_key` |
| `removeAllSessions`, `listSessions`, `countSessions`, `listPushTargetsByActor` | `tenant_id`, `actor_id` |
| `attachDeviceToSession` | `tenant_id`, `actor_id`, `token_key`, `push_provider`, `push_token` |
| `detachDeviceFromSession` | `tenant_id`, `actor_id`, `token_key` |
| `refreshSessionJwt` | `tenant_id`, `refresh_token` |

`verifySession` is the only function that accepts an absent or empty options object, because its credential can come entirely from the request. `verifyJwt` and `signSessionJwt` take `{ jwt }` and `{ session }` respectively and check those inline (see [API Reference - JWT-Mode Functions](api.md#jwt-mode-functions)).

---

## Store Contract

The shape `CONFIG.Store` must satisfy. This is the eight-method contract every shipped adapter (`helper-auth-store-*`) and the in-process memory fixture implement. Each method is async, takes `instance` first, and returns a result envelope.

| Method | Returns | Purpose |
|---|---|---|
| `getSession(instance, tenant_id, actor_id, token_key, token_secret_hash)` | `{ success, record, error }` | Read one session by composite key and secret hash. `record` is `null` when absent |
| `setSession(instance, record)` | `{ success, error }` | Insert or replace one canonical session record |
| `listSessionsByActor(instance, tenant_id, actor_id)` | `{ success, sessions, error }` | Read every session for an actor. The limit policy and the inventory functions build on this single read |
| `deleteSession(instance, tenant_id, actor_id, token_key)` | `{ success, error }` | Delete one session. Idempotent: a missing row is still success |
| `deleteSessions(instance, tenant_id, delete_keys)` | `{ success, error }` | Batch-delete. `delete_keys` is an array of `{ actor_id, token_key }` |
| `updateSessionActivity(instance, tenant_id, actor_id, token_key, fields)` | `{ success, error }` | Partial update of one record. `fields` carries only the columns to write (activity timestamp, push fields, or a rotated refresh hash) |
| `setupNewStore(instance)` | `{ success, error }` | Idempotent schema provisioning (SQL backends only) |
| `cleanupExpiredSessions(instance)` | `{ success, deleted_count, error }` | Bulk-delete records past `expires_at` |

**Construction-time validation.** `validateStoreContract` hard-checks the first six methods at construction: `getSession`, `setSession`, `listSessionsByActor`, `deleteSession`, `deleteSessions`, `updateSessionActivity`. A missing one throws an `Error` at boot, so a partially implemented store can never reach a live request. These six sit on the hot path of session create, verify, and removal.

**The two operational methods are not construction-checked**, and they differ by backend:

- `setupNewStore` is implemented by the SQL adapters (`CREATE TABLE IF NOT EXISTS` plus an `expires_at` index). The shipped NoSQL adapters (`auth-store-mongodb`, `auth-store-dynamodb`) implement it as a no-op that returns `{ success: false, error: AUTH_NOT_IMPLEMENTED }`; their table or collection is provisioned out-of-band through IaC. Because `setupNewStore` is not construction-checked, a custom store that omits it entirely trips a call-time capability gate in the parent and throws `TypeError`.
- `cleanupExpiredSessions` is implemented by every adapter, and is required wherever the backend has no native integer-`expires_at` sweep: all SQL, MongoDB, and DynamoDB unless native TTL was enabled out-of-band. A custom store that omits it makes the call throw an `Error`, since a missing sweep is a setup defect that must surface in development.

Every shipped adapter and the memory fixture implement all eight, so the construction-check distinction matters only for a custom store.

---

## Response Envelope

Every public async function returns the same envelope shape. Named fields vary by function; `success` and `error` are always present.

| Field | Type | Present on | Description |
|---|---|---|---|
| `success` | `boolean` | Always | `true` on success, `false` on operational failure |
| `error` | `object \| null` | Always | A frozen `{ type, message }` on failure, `null` on success |
| `session` | `object` | `createSession`, `verifySession`, `refreshSessionJwt` | The canonical session record |
| `sessions` | `array` | `listSessions` | Canonical records, expired ones filtered out |
| `targets` | `array` | `listPushTargetsByActor` | Sessions with `push_provider` and `push_token` set |
| `count` | `number` | `countSessions` | Active-session count |
| `removed_count`, `deleted_count` | `number` | Removal and cleanup functions | Records affected |
| `auth_id` | `string` | `createSession` | The wire-format credential |
| `cookies` | `object \| null` | `createSession`, `removeSession`, `removeAllSessions` | Cookie descriptor when `COOKIE_PREFIX` is set, else `null` |
| `access_token`, `refresh_token` | `string` | JWT-mode functions | Minted credentials |
| `claims` | `object` | `verifyJwt` | Decoded JWT claims |

On a failure, the named success fields come back `null` (or absent) alongside `success: false`. The `error.type` values and their triggers are in the [API Reference error catalog](api.md#error-catalog).
