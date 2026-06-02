# API Reference. `js-server-helper-distinct-queue`

Every exported function on the public interface, with parameters, return shape, and notes. For loader semantics and configuration keys see [Configuration](configuration.md). For the canonical record shape and sort key design see [Data Model](data-model.md). For backend selection see the [Storage Adapters](../README.md#storage-adapters) section in the module README; for per-backend `STORE_CONFIG` shape see each adapter package's own README.

## On This Page

- [Conventions](#conventions)
- [enqueue](#enqueueinstance-options-async)
- [claim](#claiminstance-options-async)
- [listByPrefix](#listbyprefixinstance-options-async)
- [Error Catalog](#error-catalog)
- [Validation Errors](#validation-errors)

---

## Conventions

| Pattern | Behaviour |
|---|---|
| **`instance` is always the first argument** | Every operation receives the per-request lifecycle object returned by `Lib.Instance.initialize()` |
| **Programmer errors throw `TypeError` synchronously** | Missing required option or wrong type throws at the call-site. These are development-time mistakes, never operational failures |
| **Operational errors return `{ success: false, error }`** | Store driver failures surface through the response envelope, never as thrown exceptions |
| **`success` is the discriminator** | Branch once on `result.success`. On success, read the named fields. On failure, read `result.error.type` |
| **Single-poller deployment** | `claim` must be called by exactly one consumer at a time. The module does not implement distributed locking |

---

## `enqueue(instance, options)` *(async)*

Append a new job record for a `(tenant_id, resource_id)` pair.

### Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `instance` | Object | Yes | Request instance (provides time and lifecycle) |
| `options.tenant_id` | String | Yes | Partition boundary |
| `options.resource_id` | String | Yes | Opaque resource identifier within the tenant |
| `options.payload` | Object | Yes | Arbitrary data stored as-is, returned by `claim` |
| `options.action` | String | Yes | Opaque label for the worker, returned by `claim` |

### Return Shape

```js
{
  success: true,    // Boolean
  error: null       // null on success, ERRORS object on failure
}
```

### Lifecycle

1. Validate options (throws `TypeError` on programmer error).
2. Generate `data_version` = current time in milliseconds.
3. Generate unique sort key = `resource_id + '#' + data_version + '#' + random(4)`.
4. Build canonical record shape.
5. Call `store.writeRecord(instance, record)`.
6. On store failure, return `{ success: false, error: DISTINCT_QUEUE_SERVICE_UNAVAILABLE }`.
7. On success, return `{ success: true, error: null }`.

---

## `claim(instance, options)` *(async)*

Query all records for a resource. Pick the latest. Delete all stale records. Return the winning payload.

### Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `instance` | Object | Yes | Request instance |
| `options.tenant_id` | String | Yes | Partition boundary |
| `options.resource_id` | String | Yes | Opaque resource identifier within the tenant |

### Return Shape

```js
{
  success: true,             // Boolean
  payload: { ... },          // Object — the winning record's payload (null when no records exist)
  action: 'sync-catalog',    // String — the winning record's action (null when no records exist)
  error: null
}
```

### Lifecycle

1. Validate options (throws `TypeError` on programmer error).
2. Call `store.queryByResourceId(instance, tenant_id, resource_id)`.
3. If no records, return `{ payload: null, action: null }`.
4. Pick the record with the highest `data_version` (ties broken by lexicographic sort key comparison).
5. Call `store.deleteByDataVersionLte(instance, tenant_id, resource_id, winner.data_version)`.
6. Deletion failure is logged but non-fatal — the claim still returns the winner.
7. Return `{ payload, action }`.

---

## `listByPrefix(instance, options)` *(async)*

Operational query. Returns all records whose `resource_id` begins with a prefix. Not used in the normal enqueue/claim flow.

### Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `instance` | Object | Yes | Request instance |
| `options.tenant_id` | String | Yes | Partition boundary |
| `options.resource_id_prefix` | String | Yes | Prefix to match against `resource_id` |

### Return Shape

```js
{
  success: true,
  records: [ { tenant_id, resource_id, sort_key, data_version, payload, action, toc }, ... ],
  error: null
}
```

### Lifecycle

1. Validate options (throws `TypeError` on programmer error).
2. Call `store.queryByResourceIdPrefix(instance, tenant_id, resource_id_prefix)`.
3. On failure, return `{ success: false, records: [], error: SERVICE_UNAVAILABLE }`.
4. Return `{ success: true, records, error: null }`.

---

## Error Catalog

| `error.type` | Trigger | Surfaces in |
|---|---|---|
| `DISTINCT_QUEUE_SERVICE_UNAVAILABLE` | Store returned `{ success: false }` or threw | All async functions |

Error shape is frozen at module load:

```js
{ type: 'DISTINCT_QUEUE_SERVICE_UNAVAILABLE', message: 'Distinct queue service temporarily unavailable' }
```

## Validation Errors

Missing or invalid options throw `TypeError` synchronously. These are programmer errors, not operational errors, and are never returned as envelope responses.

| Error | Trigger |
|---|---|
| `options object is required` | `options` is null or undefined |
| `options.tenant_id is required` | `tenant_id` is empty, null, or undefined |
| `options.resource_id is required` | `resource_id` is empty, null, or undefined |
| `options.payload is required (plain object)` | `payload` is null, undefined, or not an object |
| `options.action is required` | `action` is empty, null, or undefined |
| `options.resource_id_prefix is required` | `resource_id_prefix` is empty, null, or undefined |
