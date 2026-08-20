# ROBOTS.md - AI Agent Reference

> Compact reference for code generation. For human docs see README.md

## Type

Class C Driver Wrapper. Wraps `react-native-mmkv` (JSI, mmap-backed). Engine class injected via `shared_libs.MMKV` (required); loader constructs the instance.

## Peer Dependencies

| Injection Name | Package | Alias |
|---|---|---|
| `Utils` | `@superloomdev/js-helper-utils` | `helper-utils` |
| `Debug` | `@superloomdev/js-helper-debug` | `helper-debug` |
| `MMKV` | `react-native-mmkv` | `react-native-mmkv` |

## Direct Dependencies

None. All dependencies are peer dependencies.

## Companion Files

- `mmkv.config.js` - keys: `NAMESPACE` (default `''`), `INSTANCE_ID` (default `'default'`), `ENCRYPTION_KEY` (default `undefined`)
- `mmkv.errors.js` - constants: `INVALID_KEY`, `INVALID_VALUE`, `INVALID_KEYS`, `DESERIALIZE_FAILED`, `STORAGE_READ_FAILED`, `STORAGE_WRITE_FAILED`, `STORAGE_DELETE_FAILED`, `STORAGE_UNAVAILABLE`
- `mmkv.validators.js` - functions: `validateConfig(CONFIG)`

## Loader Pattern

```javascript
const Store = require('@superloomdev/js-rn-helper-kv-mmkv')({
  Utils: Utils,
  Debug: Debug,
  MMKV: MMKV    // required - the MMKV class from react-native-mmkv
}, {
  NAMESPACE: 'myapp',
  INSTANCE_ID: 'default',
  ENCRYPTION_KEY: 'key'  // optional
});
```

Missing `shared_libs.MMKV` throws at construction time. The loader constructs `new MMKV({ id: INSTANCE_ID, encryptionKey: ENCRYPTION_KEY })` (encryptionKey omitted when not configured).

## Config Keys

| Key | Type | Default | Required |
|---|---|---|---|
| `NAMESPACE` | string | `''` | No |
| `INSTANCE_ID` | string | `'default'` | No |
| `ENCRYPTION_KEY` | string | `undefined` | No |

## Exported Functions (18 total)

### Sync Surface

```
getRecordSync(key) -> { success, value, found, error } | async:no
  Reads one record. Uses contains() then getString(). found:false + value:null when absent. found:true + value:null when null stored.

writeRecordSync(key, value) -> { success, error } | async:no
  Upsert. JSON-serializes value. Maps to set(). undefined rejected, null allowed.

deleteRecordSync(key) -> { success, error } | async:no
  Idempotent. Maps to delete(). Deleting absent key is success:true.

getRecordExistsSync(key) -> { success, exists, error } | async:no
  Maps to contains().

getAllKeysSync() -> { success, keys, count, error } | async:no
  Maps to getAllKeys() then namespace-filter + strip. Only this namespace's keys.

batchGetRecordsSync(keys) -> { success, values, error } | async:no
  keys: array of strings. values: { key: value } map. Absent keys omitted.

batchWriteRecordsSync(pairs) -> { success, error } | async:no
  pairs: { key: value } object. Sequential writes; first failure stops.

batchDeleteRecordsSync(keys) -> { success, error } | async:no
  keys: array of strings. Idempotent per key.

clearSync() -> { success, cleared_count, error } | async:no
  Namespace-scoped. Removes only namespaced keys when NAMESPACE set. clearAll() when empty.
```

### Async Surface

```
getRecord(key) -> Promise<{ success, value, found, error }> | async:yes
writeRecord(key, value) -> Promise<{ success, error }> | async:yes
deleteRecord(key) -> Promise<{ success, error }> | async:yes
getRecordExists(key) -> Promise<{ success, exists, error }> | async:yes
getAllKeys() -> Promise<{ success, keys, count, error }> | async:yes
batchGetRecords(keys) -> Promise<{ success, values, error }> | async:yes
batchWriteRecords(pairs) -> Promise<{ success, error }> | async:yes
batchDeleteRecords(keys) -> Promise<{ success, error }> | async:yes
clear() -> Promise<{ success, cleared_count, error }> | async:yes
```

Each async function wraps its sync sibling in a resolved promise.

## Patterns

- **Factory-per-loader**: each `loader(shared_libs, config)` call returns an independent instance
- **Engine construction**: loader constructs `new Lib.MMKV({ id, encryptionKey })`; missing `shared_libs.MMKV` throws
- **Namespace prefixing**: stored key is `[NAMESPACE]:[key]` when NAMESPACE non-empty, bare `[key]` when empty
- **JSON round-trip**: `JSON.stringify` on write, `JSON.parse` on read; non-JSON stored value returns `DESERIALIZE_FAILED`
- **No instance parameter**: no per-request instance on the client; no `performanceAuditLog` calls
- **Return envelope**: flat envelopes (not nested in `data`); all keys on every path; data fields null on failure

## Error Catalog

| Constant | Type | Trigger |
|---|---|---|
| `INVALID_KEY` | `helper-kv-mmkv/invalid-key` | Key not a non-empty string, or contains `:` |
| `INVALID_VALUE` | `helper-kv-mmkv/invalid-value` | `undefined` value passed to a write |
| `INVALID_KEYS` | `helper-kv-mmkv/invalid-keys` | Batch argument not an array of valid keys or a plain object |
| `DESERIALIZE_FAILED` | `helper-kv-mmkv/deserialize-failed` | Stored value fails `JSON.parse` |
| `STORAGE_READ_FAILED` | `helper-kv-mmkv/storage-read-failed` | Engine read threw |
| `STORAGE_WRITE_FAILED` | `helper-kv-mmkv/storage-write-failed` | Engine write threw |
| `STORAGE_DELETE_FAILED` | `helper-kv-mmkv/storage-delete-failed` | Engine delete threw |
| `STORAGE_UNAVAILABLE` | `helper-kv-mmkv/storage-unavailable` | Engine handle missing at call time |
