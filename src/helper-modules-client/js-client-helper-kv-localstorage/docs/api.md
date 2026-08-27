# API Reference

> Module: `@superloomdev/js-client-helper-kv-localstorage`
> Class: C (Driver Wrapper)


## Loader

```javascript
import kvLocalstorage from '@superloomdev/js-client-helper-kv-localstorage';

const Store = kvLocalstorage({
  Utils: Utils,           // required - helper-utils instance
  Debug: Debug,           // required - helper-debug instance
  WebStorage: engine      // optional - injected storage engine (for tests or shims)
}, {
  NAMESPACE: 'myapp',     // optional - key prefix (default: '')
  STORE: 'local'          // optional - 'local' or 'session' (default: 'local')
});
```

When `WebStorage` is not injected, the module resolves the engine from `globalThis[localStorage|sessionStorage]` per `STORE`. If neither is available, every call returns `STORAGE_UNAVAILABLE`.


## Sync Surface

Synchronous primitives. Use these for first-render reads where a loading state is unacceptable.

### getRecordSync(key)

Reads a single record by key.

Returns: `{ success, value, found, error }`

- `found: false`, `value: null` when the key is absent
- `found: true`, `value: null` when `null` was stored (absent vs stored null is distinguishable)

### writeRecordSync(key, value)

Writes a record by key. Always upsert. JSON-serializes the value.

Returns: `{ success, error }`

- `undefined` value is rejected with `INVALID_VALUE`
- `null` is a legal stored value

### deleteRecordSync(key)

Deletes a record by key. Idempotent: deleting an absent key returns `success: true`.

Returns: `{ success, error }`

### getRecordExistsSync(key)

Checks whether a key exists.

Returns: `{ success, exists, error }`

### getAllKeysSync()

Lists all keys within the namespace, with the namespace prefix stripped. Only keys belonging to this namespace are returned.

Returns: `{ success, keys, count, error }`

### batchGetRecordsSync(keys)

Reads multiple records. `keys` is an array of key strings.

Returns: `{ success, values, error }`

- `values` is a `{ key: value }` map
- Absent keys are omitted from the map

### batchWriteRecordsSync(pairs)

Writes multiple records. `pairs` is a `{ key: value }` object. Sequential writes; first failure stops and reports.

Returns: `{ success, error }`

### batchDeleteRecordsSync(keys)

Deletes multiple records. `keys` is an array of key strings. Idempotent per key.

Returns: `{ success, error }`

### clearSync()

Clears all keys within the namespace. When the namespace is empty, uses the engine clear directly. Otherwise iterates and removes only namespaced keys, preserving other tenants' data.

Returns: `{ success, cleared_count, error }`


## Async Surface

Each async function wraps its sync sibling in a resolved promise. Use these for portable code that can swap to an async-only driver.

| Async | Sync counterpart | Envelope |
|---|---|---|
| `getRecord(key)` | `getRecordSync` | `{ success, value, found, error }` |
| `writeRecord(key, value)` | `writeRecordSync` | `{ success, error }` |
| `deleteRecord(key)` | `deleteRecordSync` | `{ success, error }` |
| `getRecordExists(key)` | `getRecordExistsSync` | `{ success, exists, error }` |
| `getAllKeys()` | `getAllKeysSync` | `{ success, keys, count, error }` |
| `batchGetRecords(keys)` | `batchGetRecordsSync` | `{ success, values, error }` |
| `batchWriteRecords(pairs)` | `batchWriteRecordsSync` | `{ success, error }` |
| `batchDeleteRecords(keys)` | `batchDeleteRecordsSync` | `{ success, error }` |
| `clear()` | `clearSync` | `{ success, cleared_count, error }` |

All async functions return `Promise<Object>` resolving with the envelope.


## Error Catalog

| Code | Type | Fired by |
|---|---|---|
| `INVALID_KEY` | `helper-kv-localstorage/invalid-key` | Key not a non-empty string, or contains `:` |
| `INVALID_VALUE` | `helper-kv-localstorage/invalid-value` | `undefined` value passed to a write |
| `INVALID_KEYS` | `helper-kv-localstorage/invalid-keys` | Batch argument not an array of valid keys or a plain object |
| `DESERIALIZE_FAILED` | `helper-kv-localstorage/deserialize-failed` | Stored value fails `JSON.parse` |
| `STORAGE_READ_FAILED` | `helper-kv-localstorage/storage-read-failed` | Engine read threw (SecurityError in some embedded-browser contexts) |
| `STORAGE_WRITE_FAILED` | `helper-kv-localstorage/storage-write-failed` | Engine write threw (quota exceeded) |
| `STORAGE_DELETE_FAILED` | `helper-kv-localstorage/storage-delete-failed` | Engine delete threw |
| `STORAGE_UNAVAILABLE` | `helper-kv-localstorage/storage-unavailable` | Engine handle missing at call time |


## Boundary Against the NoSQL Drivers

The KV function names follow the server NoSQL family vocabulary (`getRecord`, `writeRecord`, `deleteRecord`, `batchGetRecords`, etc.) for developer familiarity. Deliberately absent from the KV surface (no engine support, do not add): `updateRecord` (no partial updates in a KV engine - read-modify-write is the caller's job), `query`, `count`, `scan`, `transactWriteRecords`, `createIndex`. Their absence is part of the contract.


## Redux-Persist Adapter

redux-persist expects a storage engine with `getItem(key)`, `setItem(key, value)`, and `removeItem(key)` returning promises. Map them to the async KV surface:

```javascript
const persistStorage = {
  getItem: function (key) {
    return Store.getRecord(key).then(function (r) {
      return r.found ? r.value : null;
    });
  },
  setItem: function (key, value) {
    return Store.writeRecord(key, value).then(function () {
      return null;
    });
  },
  removeItem: function (key) {
    return Store.deleteRecord(key).then(function () {
      return null;
    });
  }
};
```
