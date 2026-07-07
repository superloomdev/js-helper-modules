# Schemas. `helper-logger`

The validated contracts at the module boundary: what a caller must pass, what the store must provide, and what comes back. The input contracts are enforced in `logger.validators.js`. For the persisted record shape see [Data Model](data-model.md). For the function reference see [API Reference](api.md). For configuration keys see [Configuration](configuration.md).

## On This Page

- [Throw Versus Return](#throw-versus-return)
- [CONFIG Schema](#config-schema)
- [log Options Schema](#log-options-schema)
- [List Options Schema](#list-options-schema)
- [Store Contract](#store-contract)
- [Response Envelope](#response-envelope)

---

## Throw Versus Return

The module sorts every failure into one of two categories, and the category decides the mechanism.

| Category | Trigger | Mechanism | When |
|---|---|---|---|
| **Programmer error** | A missing required option, a wrong type, an invalid `retention` shape, a malformed `CONFIG`, a store missing a hot-path method | Throws synchronously (`TypeError` for call options, `Error` for config) | At the call site, or at construction for config errors |
| **Operational error** | The storage adapter returned `{ success: false }` from a store call | Returns `{ success: false, error }` with `LOGGER_SERVICE_UNAVAILABLE` | At runtime, on the awaited result |

A programmer error is a bug in the calling code and surfaces loudly and immediately. An operational error is an expected runtime outcome and is meant to be handled.

**Background writes are the one deliberate exception.** The default `log()` is fire-and-forget: it resolves with `{ success: true }` before the store write completes, and an adapter failure during that write is logged through `Lib.Debug.debug` but never reaches the caller. A caller that must know the row is durable passes `options.await: true`, which moves the store failure back into the response envelope.

---

## CONFIG Schema

The merged `CONFIG` object passed to the loader. Validated once, at construction, by `validateConfig`. A violation throws an `Error` before the instance is built, so misconfiguration fails at boot, never on the first request.

| Field | Type | Required | Constraint |
|---|---|---|---|
| `Store` | `object` | Yes | A ready-to-use store object, not a factory and not a string. A missing or non-object value throws |
| `IP_ENCRYPT_KEY` | `string` | No | When set, must be a non-empty string (an empty string throws). Absent or `null` stores IP addresses in plaintext |

`Store` is the only required key. The store's method contract is not checked at construction (see [Store Contract](#store-contract)). `IP_ENCRYPT_KEY` is validated only for shape; the key's cryptographic requirements come from `Lib.Crypto.aesEncrypt`.

---

## log Options Schema

The second argument to `log`. Validated per call by `validateLogOptions`. A violation throws a `TypeError` at the call site.

| Option | Type | Required | Constraint |
|---|---|---|---|
| `entity_type` | `string` | Yes | Non-empty. The kind of thing acted upon |
| `entity_id` | `string` | Yes | Non-empty. The specific entity |
| `actor_type` | `string` | Yes | Non-empty. The kind of agent that acted |
| `actor_id` | `string` | Yes | Non-empty. The specific actor |
| `action` | `string` | Yes | Non-empty. Dot-notation event name, application-owned |
| `scope` | `string` | No | Multi-tenant namespace. Defaults to `''` |
| `retention` | `'persistent'` or `object` | No | Defaults to `'persistent'`. When an object, `retention.ttl_seconds` must be a positive integer |
| `data` | `object` | No | Plain object when present. Stored verbatim |
| `ip` | `string` | No | String when present. Auto-captured and AES-encrypted when configured |
| `user_agent` | `string` | No | String when present |
| `await` | `boolean` | No | Boolean when present. Defaults to `false` (background write) |

The five identity fields are always required. `retention` is the only option with structural validation beyond a type check: anything other than the literal `'persistent'` must be `{ ttl_seconds: positive_integer }`.

---

## List Options Schema

The second argument to `listByEntity` and `listByActor`. Validated by `validateListByEntityOptions` and `validateListByActorOptions`, which share `validateListOptionsShape`. A violation throws a `TypeError` at the call site.

| Option | Type | Required | Constraint |
|---|---|---|---|
| `entity_type`, `entity_id` | `string` | `listByEntity` only | Non-empty |
| `actor_type`, `actor_id` | `string` | `listByActor` only | Non-empty |
| `scope` | `string` | No | String when present |
| `actions` | `string[]` | No | Array of non-empty strings when present. Each entry is a literal action or an `'auth.*'` prefix glob |
| `start_time_ms` | `integer` | No | Inclusive lower bound on `created_at_ms` |
| `end_time_ms` | `integer` | No | Exclusive upper bound on `created_at_ms` |
| `limit` | `integer` | No | Positive integer when present. Defaults to `50` |
| `cursor` | `string` | No | Opaque resume token from the previous page's `next_cursor` |

Each list function validates its own required identity pair, then the shared optional filters. The caller's options are normalized into an internal query object before reaching the store; the store never sees the raw options.

---

## Store Contract

The shape `CONFIG.Store` must satisfy. This is the five-method contract every shipped adapter (`helper-logger-store-*`) and the in-process memory fixture implement. Each method is async, takes `instance` first, and returns a result envelope.

| Method | Returns | Purpose |
|---|---|---|
| `addLog(instance, record)` | `{ success, error }` | Insert one immutable log record |
| `getLogsByEntity(instance, query)` | `{ success, records, next_cursor, error }` | Page an entity's events, newest first |
| `getLogsByActor(instance, query)` | `{ success, records, next_cursor, error }` | Page an actor's events, newest first |
| `setupNewStore(instance)` | `{ success, error }` | Idempotent backend provisioning |
| `cleanupExpiredLogs(instance)` | `{ success, deleted_count, error }` | Bulk-delete records past `expires_at` |

`record` is the canonical log record the module builds internally (see [Data Model](data-model.md)); `query` is the normalized filter object (scope, entity or actor pair, `actions`, time bounds, `cursor`, `limit`).

**No construction-time contract check.** Unlike the `auth` and `verify` parents, the logger does not validate the store's methods at construction. The three hot-path methods behave differently from the two maintenance methods when absent:

- `addLog`, `getLogsByEntity`, and `getLogsByActor` are called directly. A store that omits one throws a `TypeError` at the first call that needs it.
- `setupNewStore` and `cleanupExpiredLogs` are optional. The parent guards each with an `isFunction` check, so a store that omits them turns the call into a no-op that returns `{ success: true }` (with `deleted_count: 0` for cleanup).

Every shipped adapter and the memory fixture implement all five, so the distinction matters only for a custom store.

---

## Response Envelope

Every public async function returns the same envelope shape. Named fields vary by function; `success` and `error` are always present.

| Field | Type | Present on | Description |
|---|---|---|---|
| `success` | `boolean` | Always | `true` on success, `false` on operational failure |
| `error` | `object \| null` | Always | A frozen `{ type, message }` on failure, `null` on success |
| `records` | `array` | `listByEntity`, `listByActor` | Canonical log records, newest first |
| `next_cursor` | `string \| null` | `listByEntity`, `listByActor` | The `sort_key` of the last record, or `null` on the final page |
| `deleted_count` | `number` | `cleanupExpiredLogs` | Count of expired records removed |

`log()` returns only `{ success, error }`. The single operational `error.type` is `LOGGER_SERVICE_UNAVAILABLE`; programmer errors throw and are never enveloped. See the [API Reference error catalog](api.md#error-catalog).
