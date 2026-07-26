# Schemas. `helper-distinct-queue`

The validated contracts at the module boundary: what a caller must pass, what the store must provide, and what comes back. These contracts are enforced in `distinct-queue.validators.js` and are the module's hard edges. For the function reference see [API Reference](api.md). For configuration keys see [Configuration](configuration.md).

## On This Page

- [Throw Versus Return](#throw-versus-return)
- [CONFIG Schema](#config-schema)
- [Enqueue-Options Schema](#enqueue-options-schema)
- [Claim-Options Schema](#claim-options-schema)
- [List-By-Prefix-Options Schema](#list-by-prefix-options-schema)
- [Store Contract](#store-contract)
- [Response Envelope](#response-envelope)

---

## Throw Versus Return

The module sorts every failure into one of two categories, and the category decides the mechanism.

| Category | Trigger | Mechanism | When |
|---|---|---|---|
| **Programmer error** | A missing required option, a wrong type, a malformed `CONFIG`, a store missing a required method | Throws synchronously (`TypeError` for call options, `Error` for setup) | At the call site, or at construction for setup errors |
| **Operational error** | Store driver failure, no claimable record found | Returns `{ success: false, error }` through the response envelope | At runtime, on the awaited result |

A programmer error is a bug in the calling code and surfaces loudly and immediately. An operational error is an expected runtime outcome and is meant to be handled.

---

## CONFIG Schema

The merged `CONFIG` object passed to the loader. Validated once, at construction, by `validateConfig`. A violation throws an `Error` before the instance is built, so misconfiguration fails at boot, never on the first request.

| Field | Type | Required | Constraint |
|---|---|---|---|
| `Store` | `object` | Yes | A ready-to-use store object, not null, not undefined. Must be an object (not a factory function or string). A missing or non-object value throws |

`Store` is the only hard-validated key. The store's own method contract is checked separately (see [Store Contract](#store-contract)).

---

## Enqueue-Options Schema

The second argument to `enqueue`. Validated per call by `validateEnqueueOptions`. A violation throws a `TypeError` at the call site.

| Option | Type | Required | Constraint |
|---|---|---|---|
| `tenant_id` | `string` | Yes | Non-empty. The logical owner namespace |
| `resource_id` | `string` | Yes | Non-empty. The resource being queued |
| `payload` | `object` | Yes | A plain object. Arbitrary data stored as-is and returned by `claim` |
| `action` | `string` | Yes | Non-empty. Opaque label for the worker, returned by `claim` |

All four are required. The options object itself must be present; a `null` or `undefined` argument throws.

---

## Claim-Options Schema

The second argument to `claim`. Validated per call by `validateClaimOptions`. A violation throws a `TypeError` at the call site.

| Option | Type | Required | Constraint |
|---|---|---|---|
| `tenant_id` | `string` | Yes | Non-empty. Must match the `tenant_id` used at enqueue |
| `resource_id` | `string` | Yes | Non-empty. Must match the `resource_id` used at enqueue |

Both are required. The options object itself must be present; a `null` or `undefined` argument throws.

---

## List-By-Prefix-Options Schema

The second argument to `listByPrefix`. Validated per call by `validateListByPrefixOptions`. A violation throws a `TypeError` at the call site.

| Option | Type | Required | Constraint |
|---|---|---|---|
| `tenant_id` | `string` | Yes | Non-empty. The logical owner namespace |
| `resource_id_prefix` | `string` | Yes | Non-empty. Prefix to match against `resource_id` values |

Both are required. The options object itself must be present; a `null` or `undefined` argument throws.

---

## Store Contract

The shape `CONFIG.Store` must satisfy. This is the four-method contract every shipped adapter (`helper-distinct-queue-store-*`) implements. Each method is async and returns a result envelope.

| Method | Returns | Purpose |
|---|---|---|
| `writeRecord(instance, record)` | `{ success, error }` | Append a queue record. Write path is append-only; no read-before-write |
| `queryByResourceId(instance, tenant_id, resource_id)` | `{ success, records, error }` | Read all records for a `(tenant_id, resource_id)` pair, sorted by `data_version` descending |
| `deleteByDataVersionLte(instance, tenant_id, resource_id, data_version)` | `{ success, deleted_count, error }` | Delete records for a `(tenant_id, resource_id)` pair whose `data_version` is less than or equal to the given value |
| `queryByResourceIdPrefix(instance, tenant_id, resource_id_prefix)` | `{ success, records, error }` | Read all records for a `tenant_id` whose `resource_id` starts with the given prefix |

**Construction-time validation.** `validateStoreContract` hard-checks all four methods at construction. A missing one throws an `Error` at boot, so a partially implemented store can never reach a live request.

---

## Response Envelope

Every public async function returns the same envelope shape. This is the output contract.

| Field | Type | Present on | Description |
|---|---|---|---|
| `success` | `boolean` | Always | `true` on success, `false` on operational failure |
| `error` | `object \| null` | Always | A frozen `{ type, message }` on failure, `null` on success |
| `request_id` | `string \| null` | `enqueue` success | The generated unique identifier for the queued record |
| `record` | `object \| null` | `claim` success | The claimed record, or `null` when no claimable record exists |
| `records` | `array \| null` | `listByPrefix` success | Array of matching records |
| `deleted_count` | `number` | `claim` success | Count of records deleted by the claim operation |

```js
// enqueue success
{ success: true, request_id: '1715180412345-xqp', error: null }

// enqueue failure
{ success: false, request_id: null, error: { type: 'STORE_WRITE_FAILED', message: '...' } }

// claim success (record found)
{ success: true, record: { request_id: '...', tenant_id: '...', resource_id: '...', payload: {...}, action: '...', data_version: 1715180412345 }, deleted_count: 3, error: null }

// claim success (nothing to process)
{ success: true, record: null, deleted_count: 0, error: null }

// listByPrefix success
{ success: true, records: [ { ... }, { ... } ], error: null }
```
