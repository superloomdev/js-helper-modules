# ROBOTS.md - AI Agent Reference

> Compact reference for code generation. For human docs see README.md

## Type

Class C Driver Wrapper. Wraps browser Web Storage (localStorage/sessionStorage). No external service dependency. Engine injected via `shared_libs.WebStorage` or resolved from `globalThis`.

## Peer Dependencies

| Injection Name | Package | Alias |
|---|---|---|
| `Utils` | `@superloomdev/js-helper-utils` | `helper-utils` |
| `Debug` | `@superloomdev/js-helper-debug` | `helper-debug` |

## Direct Dependencies

None. All dependencies are peer dependencies.

## Companion Files

- `localstorage.config.js` - keys: `NAMESPACE` (default `''`), `STORE` (default `'local'`)
- `localstorage.errors.js` - constants: `INVALID_KEY`, `INVALID_VALUE`, `INVALID_KEYS`, `DESERIALIZE_FAILED`, `STORAGE_READ_FAILED`, `STORAGE_WRITE_FAILED`, `STORAGE_DELETE_FAILED`, `STORAGE_UNAVAILABLE`
- `localstorage.validators.js` - functions: `validateConfig(CONFIG)`

## Loader Pattern

```javascript
import kvLocalstorage from '@superloomdev/js-client-helper-kv-localstorage';

const Store = kvLocalstorage({
  Utils: Utils,
  Debug: Debug,
  WebStorage: engine    // optional; falls back to globalThis[localStorage|sessionStorage]
}, {
  NAMESPACE: 'myapp',
  STORE: 'local'
});
```

## Config Keys

| Key | Type | Default | Required |
|---|---|---|---|
| `NAMESPACE` | string | `''` | No |
| `STORE` | string | `'local'` | No |

## Exported Functions (18 total)

### Sync Surface

```
getRecordSync(key) -> { success, value, found, error } | async:no
  Reads one record. found:false + value:null when absent. found:true + value:null when null stored.

writeRecordSync(key, value) -> { success, error } | async:no
  Upsert. JSON-serializes value. undefined rejected, null allowed.

deleteRecordSync(key) -> { success, error } | async:no
  Idempotent. Deleting absent key is success:true.

getRecordExistsSync(key) -> { success, exists, error } | async:no
  Checks key existence via getItem !== null.

getAllKeysSync() -> { success, keys, count, error } | async:no
  Lists namespaced keys with prefix stripped. Only this namespace's keys.

batchGetRecordsSync(keys) -> { success, values, error } | async:no
  keys: array of strings. values: { key: value } map. Absent keys omitted.

batchWriteRecordsSync(pairs) -> { success, error } | async:no
  pairs: { key: value } object. Sequential writes; first failure stops.

batchDeleteRecordsSync(keys) -> { success, error } | async:no
  keys: array of strings. Idempotent per key.

clearSync() -> { success, cleared_count, error } | async:no
  Namespace-scoped. Removes only namespaced keys when NAMESPACE set. Engine clear when empty.
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
- **Engine injection**: `shared_libs.WebStorage` first, then `globalThis[STORE + 'Storage']`, else `STORAGE_UNAVAILABLE`
- **Namespace prefixing**: stored key is `[NAMESPACE]:[key]` when NAMESPACE non-empty, bare `[key]` when empty
- **JSON round-trip**: `JSON.stringify` on write, `JSON.parse` on read; non-JSON stored value returns `DESERIALIZE_FAILED`
- **No instance parameter**: no per-request instance on the client; no `performanceAuditLog` calls
- **Return envelope**: flat envelopes (not nested in `data`); all keys on every path; data fields null on failure

## Error Catalog

| Constant | Type | Trigger |
|---|---|---|
| `INVALID_KEY` | `helper-kv-localstorage/invalid-key` | Key not a non-empty string, or contains `:` |
| `INVALID_VALUE` | `helper-kv-localstorage/invalid-value` | `undefined` value passed to a write |
| `INVALID_KEYS` | `helper-kv-localstorage/invalid-keys` | Batch argument not an array of valid keys or a plain object |
| `DESERIALIZE_FAILED` | `helper-kv-localstorage/deserialize-failed` | Stored value fails `JSON.parse` |
| `STORAGE_READ_FAILED` | `helper-kv-localstorage/storage-read-failed` | Engine read threw |
| `STORAGE_WRITE_FAILED` | `helper-kv-localstorage/storage-write-failed` | Engine write threw (quota exceeded) |
| `STORAGE_DELETE_FAILED` | `helper-kv-localstorage/storage-delete-failed` | Engine delete threw |
| `STORAGE_UNAVAILABLE` | `helper-kv-localstorage/storage-unavailable` | Engine handle missing at call time |
