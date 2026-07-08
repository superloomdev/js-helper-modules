# Schemas. `helper-verify`

The validated contracts at the module boundary: what a caller must pass, what the store must provide, and what comes back. These contracts are enforced in `verify.validators.js` and are the module's hard edges. For the persisted record shape see [Data Model](data-model.md). For the function reference see [API Reference](api.md). For configuration keys see [Configuration](configuration.md).

## On This Page

- [Throw Versus Return](#throw-versus-return)
- [CONFIG Schema](#config-schema)
- [Create-Options Schema](#create-options-schema)
- [Verify-Options Schema](#verify-options-schema)
- [Store Contract](#store-contract)
- [Response Envelope](#response-envelope)

---

## Throw Versus Return

The module sorts every failure into one of two categories, and the category decides the mechanism.

| Category | Trigger | Mechanism | When |
|---|---|---|---|
| **Programmer error** | A missing required option, a wrong type, a non-positive `length` or `ttl_seconds`, a malformed `CONFIG`, a store missing a required method | Throws synchronously (`TypeError` for call options, `Error` for setup) | At the call site, or at construction for setup errors |
| **Operational error** | Cooldown active, record not found, expired, locked out, wrong value, store driver failure | Returns `{ success: false, error }` through the response envelope | At runtime, on the awaited result |

A programmer error is a bug in the calling code and surfaces loudly and immediately. An operational error is an expected runtime outcome and is meant to be handled. This split is the single most important thing to know before calling the module: setup and shape problems throw at boot or at the call site; everything that can happen during normal operation returns through the envelope.

---

## CONFIG Schema

The merged `CONFIG` object passed to the loader. Validated once, at construction, by `validateConfig`. A violation throws an `Error` before the instance is built, so misconfiguration fails at boot, never on the first request.

| Field | Type | Required | Constraint |
|---|---|---|---|
| `Store` | `object` | Yes | A ready-to-use store object, not a factory function and not a string. A missing or non-object value throws |
| `PIN_CHARSET` | `string` | No | Defaulted from the config file. Not otherwise validated |
| `CODE_CHARSET` | `string` | No | Defaulted from the config file. Not otherwise validated |
| `TOKEN_CHARSET` | `string` | No | Defaulted from the config file. Not otherwise validated |

`Store` is the only hard-validated key. The store's own method contract is checked separately (see [Store Contract](#store-contract)). The charsets are validated only by being defaulted; an override is trusted and passed verbatim to the generator.

---

## Create-Options Schema

The second argument to `createPin`, `createCode`, and `createToken`. Identical across all three. Validated per call by `validateCreateOptions`. A violation throws a `TypeError` at the call site.

| Option | Type | Required | Constraint |
|---|---|---|---|
| `scope` | `string` | Yes | Non-empty. The logical owner namespace; part of the composite key |
| `key` | `string` | Yes | Non-empty. The specific verification purpose within the scope; part of the composite key |
| `length` | `integer` | Yes | Greater than `0`. Number of characters in the generated code |
| `ttl_seconds` | `integer` | Yes | Greater than `0`. Lifetime in seconds before the code expires |
| `cooldown_seconds` | `integer` | Yes | Zero or greater. Minimum gap before the next create for the same `(scope, key)`. `0` disables the cooldown |

All five are required. `cooldown_seconds` is the only one that accepts `0`; `length` and `ttl_seconds` must be strictly positive. The options object itself must be present; a `null` or `undefined` argument throws.

---

## Verify-Options Schema

The second argument to `verify`. Validated per call by `validateVerifyOptions`. A violation throws a `TypeError` at the call site.

| Option | Type | Required | Constraint |
|---|---|---|---|
| `scope` | `string` | Yes | Non-empty. Must match the scope used at creation |
| `key` | `string` | Yes | Non-empty. Must match the key used at creation |
| `value` | `string` | Yes | Non-empty string. The value the recipient submitted |
| `max_fail_count` | `integer` | Yes | Greater than `0`. Failed attempts allowed before the record locks out |

`max_fail_count` is supplied per verify call rather than stored on the record, so the lockout threshold can differ by flow without re-issuing codes.

---

## Store Contract

The shape `CONFIG.Store` must satisfy. This is the six-method contract every shipped adapter (`helper-verify-store-*`) and the in-process memory fixture implement. Each method is async and returns a result envelope.

| Method | Returns | Purpose |
|---|---|---|
| `getRecord(instance, scope, key)` | `{ success, record, error }` | Read the record for a `(scope, key)` pair. `record` is `null` when absent |
| `setRecord(instance, scope, key, record)` | `{ success, error }` | Write or replace the record for a `(scope, key)` pair |
| `incrementFailCount(instance, scope, key)` | `{ success, error }` | Atomically increment the record's `fail_count` |
| `deleteRecord(instance, scope, key)` | `{ success, error }` | Remove the record for a `(scope, key)` pair |
| `setupNewStore(instance)` | `{ success, error }` | Idempotent backend provisioning (table or index creation) |
| `cleanupExpiredRecords(instance)` | `{ success, deleted_count, error }` | Bulk-delete records past `expires_at` |

**Construction-time validation.** `validateStoreContract` hard-checks four of the six methods at construction: `getRecord`, `setRecord`, `incrementFailCount`, `deleteRecord`. A missing one throws an `Error` at boot, so a partially implemented store can never reach a live request. These four sit on the hot path of every create and verify.

**The two out-of-band methods are not construction-checked**, and they behave differently when absent:

- `setupNewStore` is optional. A store without it makes `setupNewStore(instance)` a no-op that returns `{ success: true, error: null }`.
- `cleanupExpiredRecords` is expected. A store without it makes `cleanupExpiredRecords(instance)` throw, because a missing sweep on a SQL backend is a setup defect that must fail in development, not silently at runtime.

Every shipped adapter and the memory fixture implement all six, so this distinction matters only for a custom store.

---

## Response Envelope

Every public async function returns the same envelope shape. This is the output contract.

| Field | Type | Present on | Description |
|---|---|---|---|
| `success` | `boolean` | Always | `true` on success, `false` on operational failure |
| `error` | `object \| null` | Always | A frozen `{ type, message }` on failure, `null` on success |
| `code` | `string` | `create*` success | The generated value |
| `expires_at` | `number` | `create*` success | Unix epoch seconds when the code becomes invalid |
| `deleted_count` | `number` | `cleanupExpiredRecords` | Count of expired records removed |

On a `create*` failure, `code` and `expires_at` are `null` alongside `success: false`. The `error.type` values and their triggers are listed in the [API Reference error catalog](api.md#error-catalog).

```js
// create success
{ success: true, code: 'X7K3M9', expires_at: 1730000300, error: null }

// create failure
{ success: false, code: null, expires_at: null, error: { type: 'VERIFY_COOLDOWN_ACTIVE', message: '...' } }

// verify success
{ success: true, error: null }

// verify failure
{ success: false, error: { type: 'VERIFY_WRONG_VALUE', message: '...' } }
```
