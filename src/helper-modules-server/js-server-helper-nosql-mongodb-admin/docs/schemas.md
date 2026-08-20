# Schemas. `helper-nosql-mongodb-admin`

The validated contracts at the module boundary: what a caller must pass and what comes back. These contracts are enforced in `mongodb-admin.validators.js` and are the module's hard edges. For the function reference see [API Reference](api.md). For configuration keys see [Configuration](configuration.md).

## On This Page

- [Throw Versus Return](#throw-versus-return)
- [CONFIG Schema](#config-schema)
- [Create-Collection-Options Schema](#create-collection-options-schema)
- [Create-Indexes-Options Schema](#create-indexes-options-schema)
- [Enable-TTL-Index-Options Schema](#enable-ttl-index-options-schema)
- [Drop-Collection-Options Schema](#drop-collection-options-schema)
- [List-Indexes-Options Schema](#list-indexes-options-schema)
- [Response Envelope](#response-envelope)

---

## Throw Versus Return

| Category | Trigger | Mechanism | When |
|---|---|---|---|
| **Programmer error** | A missing required option, a wrong type, a malformed `CONFIG` | Throws synchronously (`TypeError`) | At the call site, or at construction for setup errors |
| **Operational error** | MongoDB driver failure, collection not found, index conflict | Returns `{ success: false, error }` through the response envelope | At runtime, on the awaited result |

---

## CONFIG Schema

The merged `CONFIG` object passed to the loader. Validated once, at construction, by `validateConfig`. A violation throws a `TypeError` before the instance is built.

| Field | Type | Required | Constraint |
|---|---|---|---|
| `CONNECTION_STRING` | `string` | Yes | Non-empty. MongoDB connection string for admin-role user |
| `DATABASE_NAME` | `string` | Yes | Non-empty. Database name to select after connecting |
| `CONNECT_TIMEOUT_MS` | `number` | No | If present, must be a non-negative number. Default 5000. How long the driver waits to connect |

---

## Create-Collection-Options Schema

The options argument to `createCollection`. Validated per call by `validateCreateCollection`.

| Option | Type | Required | Constraint |
|---|---|---|---|
| `collection_name` | `string` | Yes | Non-empty. Name of the collection to create |

---

## Create-Indexes-Options Schema

The options argument to `createIndexes`. Validated per call by `validateCreateIndexes`.

| Option | Type | Required | Constraint |
|---|---|---|---|
| `collection_name` | `string` | Yes | Non-empty. Name of the collection to index |
| `indexes` | `array` | Yes | Non-empty array of MongoDB index specification objects |

---

## Enable-TTL-Index-Options Schema

The options argument to `enableTtlIndex`. Validated per call by `validateEnableTtlIndex`.

| Option | Type | Required | Constraint |
|---|---|---|---|
| `collection_name` | `string` | Yes | Non-empty. Name of the collection to enable TTL on |
| `field_name` | `string` | Yes | Non-empty. The document field to use as the TTL trigger |
| `expire_after_seconds` | `number` | Yes | Non-negative. Seconds after which documents with an expired `field_name` value are deleted |

---

## Drop-Collection-Options Schema

The options argument to `deleteCollection`. Validated per call by `validateDeleteCollection`.

| Option | Type | Required | Constraint |
|---|---|---|---|
| `collection_name` | `string` | Yes | Non-empty. Name of the collection to drop |

---

## List-Indexes-Options Schema

The options argument to `listIndexes`. Validated per call by `validateListIndexes`.

| Option | Type | Required | Constraint |
|---|---|---|---|
| `collection_name` | `string` | Yes | Non-empty. Name of the collection whose indexes to list |

---

## Response Envelope

Every public async function returns the same envelope shape.

| Field | Type | Present on | Description |
|---|---|---|---|
| `success` | `boolean` | Always | `true` on success, `false` on operational failure |
| `error` | `object \| null` | Always | A frozen `{ type, message }` on failure, `null` on success |
| `indexes` | `array \| null` | `listIndexes` success | Array of index specification objects |

```js
// createCollection success
{ success: true, error: null }

// createCollection failure
{ success: false, error: { type: 'MONGODB_ADMIN CreateCollectionFailed', message: '...' } }

// listIndexes success
{ success: true, indexes: [ { name: '_id_', key: { _id: 1 }, ... } ], error: null }
```
