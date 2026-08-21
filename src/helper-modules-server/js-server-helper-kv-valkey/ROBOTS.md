# ROBOTS.md - AI Agent Reference

> Compact reference for code generation. For human docs see README.md

## Type

Class C Driver Wrapper. Wraps Valkey/Redis via `ioredis`. Single instance only, no cluster mode. Server-only.

## Peer Dependencies

| Injection Name | Package | Alias |
|---|---|---|
| `Utils` | `@superloomdev/js-helper-utils` | `helper-utils` |
| `Debug` | `@superloomdev/js-helper-debug` | `helper-debug` |
| `Instance` | `@superloomdev/js-server-helper-instance` | `helper-instance` |

## Direct Dependencies

- `ioredis` - Pure JavaScript Redis/Valkey client (lazy-loaded)

## Companion Files

- `kv-valkey.config.js` - keys: `HOST`, `PORT`, `PASSWORD`, `USERNAME`, `KEY_PREFIX`, `DB`, `TLS`, `TLS_CONFIG`, `CONNECT_TIMEOUT_MS`, `COMMAND_TIMEOUT_MS`, `SERIALIZE_JSON`, `SCAN_PAGE_SIZE`
- `kv-valkey.errors.js` - constants: `KV_CONNECTION_FAILED`, `KV_COMMAND_FAILED`, `KV_TIMEOUT`, `KV_SERIALIZATION_FAILED`
- `kv-valkey.validators.js` - functions: `validateConfig(CONFIG)`

## Loader Pattern (Factory)

```javascript
const KV = require('@superloomdev/js-server-helper-kv-valkey')(Lib, {
  HOST: 'localhost',
  PORT: 6379,
  KEY_PREFIX: 'myapp:'
});
```

Each loader call returns an independent KV interface with its own `Lib`, `CONFIG`, and ioredis client. Connection is lazy: the first operation connects.

## Config Keys

| Key | Type | Default | Required |
|---|---|---|---|
| `HOST` | String | `'localhost'` | no |
| `PORT` | Number | `6379` | no |
| `PASSWORD` | String | - | no |
| `USERNAME` | String | - | no |
| `KEY_PREFIX` | String | `''` | no |
| `DB` | Number | `0` | no |
| `TLS` | Boolean | `false` | no |
| `TLS_CONFIG` | Object | - | no |
| `CONNECT_TIMEOUT_MS` | Number | `5000` | no |
| `COMMAND_TIMEOUT_MS` | Number | `3000` | no |
| `SERIALIZE_JSON` | Boolean | `true` | no |
| `SCAN_PAGE_SIZE` | Number | `100` | no |

## Exported Functions (18 total)

All functions accept `instance` as their first argument for request context and performance logging.

### Lifecycle

close(instance) -> { success, error } | async:yes
  Close the connection. Idempotent: returns success if already closed or never connected.

ping(instance) -> { success, error } | async:yes
  Ping the server. Triggers lazy connect on first call.

### Single Key

set(instance, key, value, ttl_seconds?) -> { success, error } | async:yes
  Set a key to a value. Optional TTL in seconds. Single SET command with EX option when TTL is provided.

setIfNotExists(instance, key, value, ttl_seconds?) -> { success, applied, error } | async:yes
  Atomic set-if-not-exists. Single SET NX command with optional EX. applied: true if this caller created the key, false if it already existed. applied: false is not an error. This is the primitive distributed locks are built on.

get(instance, key) -> { success, value, error } | async:yes
  Get the value of a key. Returns null for absent keys. Not-found is never an error.

delete(instance, key) -> { success, deleted_count, error } | async:yes
  Delete a key. deleted_count is 0 for absent keys.

getKeyExists(instance, key) -> { success, exists, error } | async:yes
  Check whether a key exists. Returns exists: boolean.

### Multiple Keys

setMany(instance, entries, ttl_seconds?) -> { success, error } | async:yes
  Set multiple key-value pairs atomically. entries is an Object { key: value }. Empty input is a no-op.

getMany(instance, keys) -> { success, values, error } | async:yes
  Get values for multiple keys. keys is an Array. values.length === keys.length always, with null for absent keys.

deleteMany(instance, keys) -> { success, deleted_count, error } | async:yes
  Delete multiple keys. Returns exact deleted_count. Empty input is a no-op.

### Scan

scan(instance, pattern, options?) -> { success, keys, error } | async:yes
  Scan all keys matching a glob pattern. Collects all results across pages. O(N) - maintenance tool, not request-path.

### Hash

setHashField(instance, key, field, value) -> { success, error } | async:yes
  Set a field in a hash. KEY_PREFIX applies to key, not to field.

getHashField(instance, key, field) -> { success, value, error } | async:yes
  Get a field from a hash. Returns null for absent key or field.

getHashFields(instance, key) -> { success, fields, error } | async:yes
  Get all fields from a hash. Returns empty object {} for absent key.

deleteHashField(instance, key, field) -> { success, deleted_count, error } | async:yes
  Delete a field from a hash. deleted_count is 0 for absent key or field.

### TTL

setExpire(instance, key, ttl_seconds) -> { success, applied, error } | async:yes
  Set an expiry on a key. applied: true if key exists, false if absent.

getTtl(instance, key) -> { success, ttl_seconds, error } | async:yes
  Get TTL in seconds. Returns null for no-expiry and absent keys (engine sentinels -1 and -2 both map to null).

### Counter

increment(instance, key, by?) -> { success, value, error } | async:yes
  Increment a key by 1 (default) or by the given amount. Atomic. Absent key treated as 0.

## Error Handling
All functions return standardized response format:
```javascript
{
  success: boolean,
  value/data: any,     // operation-specific field(s)
  error: { type: 'KV_*', message: string } | null
}
```
Driver error wording (ioredis messages, codes, stacks) is logged at debug level and never returned in the envelope.

## Patterns
- Performance logging: `Lib.Debug.performanceAuditLog` on every I/O function using a local `start_ms`. Label pattern: `'KV <function>'`.
- Lazy loading: ioredis loaded only when first function is called
- Key prefix: applied on write, stripped on read including scan results
- JSON serialization: set runs JSON.stringify, get runs JSON.parse (configurable via SERIALIZE_JSON)
- TTL sentinels: engine -1 (no expiry) and -2 (absent) both map to null, never leaked
- Single instance: no cluster mode, no fan-out, MSET is atomic
- Empty inputs: no-op success without contacting the engine
