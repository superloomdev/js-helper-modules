# API Reference

> Module: `@superloomdev/js-rn-helper-kv-mmkv`
> Class: C (Driver Wrapper)


## Loader

```javascript
const Store = require('@superloomdev/js-rn-helper-kv-mmkv')({
  Utils: Utils,           // required - helper-utils instance
  Debug: Debug,           // required - helper-debug instance
  MMKV: MMKV              // required - the MMKV class from react-native-mmkv
}, {
  NAMESPACE: 'myapp',     // optional - key prefix (default: '')
  INSTANCE_ID: 'default', // optional - MMKV instance id (default: 'default')
  ENCRYPTION_KEY: 'key'   // optional - AES encryption key (default: undefined)
});
```

The loader constructs the MMKV instance internally: `new MMKV({ id: INSTANCE_ID, encryptionKey: ENCRYPTION_KEY })`. The `encryptionKey` is omitted from the constructor options when not configured. Missing `shared_libs.MMKV` throws at construction time.


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

Checks whether a key exists. Maps to MMKV's `contains()`.

Returns: `{ success, exists, error }`

### getAllKeysSync()

Lists all keys within the namespace, with the namespace prefix stripped. Only keys belonging to this namespace are returned. Maps to MMKV's `getAllKeys()` then filters by namespace.

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

Clears all keys within the namespace. When the namespace is empty, uses the engine `clearAll()` directly. Otherwise iterates and removes only namespaced keys, preserving other tenants' data.

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
| `INVALID_KEY` | `helper-kv-mmkv/invalid-key` | Key not a non-empty string, or contains `:` |
| `INVALID_VALUE` | `helper-kv-mmkv/invalid-value` | `undefined` value passed to a write |
| `INVALID_KEYS` | `helper-kv-mmkv/invalid-keys` | Batch argument not an array of valid keys or a plain object |
| `DESERIALIZE_FAILED` | `helper-kv-mmkv/deserialize-failed` | Stored value fails `JSON.parse` |
| `STORAGE_READ_FAILED` | `helper-kv-mmkv/storage-read-failed` | Engine read threw |
| `STORAGE_WRITE_FAILED` | `helper-kv-mmkv/storage-write-failed` | Engine write threw |
| `STORAGE_DELETE_FAILED` | `helper-kv-mmkv/storage-delete-failed` | Engine delete threw |
| `STORAGE_UNAVAILABLE` | `helper-kv-mmkv/storage-unavailable` | Engine handle missing at call time |


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
