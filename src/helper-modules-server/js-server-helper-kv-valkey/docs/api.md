# API Reference

## Overview

All functions are `async`, take `instance` first, and return an envelope `{ success, ..., error }`. Not-found and empty results are never errors. Driver wording never leaks into error objects.

## Lifecycle

### close(instance) -> { success, error }

Close the connection. Idempotent: returns `{ success: true, error: null }` if already closed or never connected. Teardown is registered automatically with `Lib.Instance.addProcessCleanupRoutine` on first client creation. A caller normally never calls `close()` directly. The deployment's `CLOSE_ON_CLEANUP` config on `helper-instance` decides when it runs.

**When close runs:**

| Deployment | `CLOSE_ON_CLEANUP` | When close runs |
|---|---|---|
| Persistent (Express, Docker, EC2) | `false` | On SIGTERM via `Lib.Instance.runProcessCleanup()` |
| Serverless (Lambda, Cloud Functions) | `true` | After every request via `Lib.Instance.runInstanceCleanup(instance)` |

**Example (persistent server):**

```javascript
process.on('SIGTERM', async () => {
  await Lib.Instance.runProcessCleanup();
  process.exit(0);
});
```

### ping(instance) -> { success, error }

Ping the server. Triggers lazy connect on first call. Returns `KV_CONNECTION_FAILED` if the server is unreachable.

## Single Key

### set(instance, key, value, ttl_seconds?) -> { success, error }

Set a key to a value. When `SERIALIZE_JSON` is true (default), the value is JSON-stringified before storage.

When `ttl_seconds` is provided, a single `SET key value EX seconds` command is used. This is one round trip, not `SET` followed by `EXPIRE`, which would leave a window where the key exists with no expiry.

Non-serializable values (functions, circular objects) return `KV_SERIALIZATION_FAILED` rather than throwing.

### setIfNotExists(instance, key, value, ttl_seconds?) -> { success, applied, error }

Set a key to a value only if the key does not already exist. Issues a single atomic `SET key value NX` command (with `EX seconds` when a TTL is provided). `applied` is `true` if this caller created the key, `false` if the key already existed and nothing was written. `applied: false` is not an error - `success` is still `true`.

This is the primitive distributed locks are built on. The lock caller calls `setIfNotExists` with a TTL; exactly one concurrent caller receives `applied: true` and proceeds. The rest receive `applied: false` and wait. If the lock holder crashes before releasing, the TTL expires the key and the next caller acquires it.

The single-command form is required. A `getKeyExists` followed by `set` is not atomic: two concurrent callers would both observe "absent" and both write, which defeats the mechanism.

### get(instance, key) -> { success, value, error }

Get the value of a key. Returns `{ success: true, value: null, error: null }` for absent keys. Not-found is not an error.

When `SERIALIZE_JSON` is true, the stored string is JSON-parsed. A corrupt stored value returns `KV_SERIALIZATION_FAILED`.

A caller that needs to distinguish "key absent" from "key present with null value" should call `getKeyExists`. The two cases produce the same return shape because Redis is a string store and `JSON.stringify(null)` produces the string `"null"`.

### delete(instance, key) -> { success, deleted_count, error }

Delete a key. `deleted_count` is 0 for absent keys, 1 for present keys.

### getKeyExists(instance, key) -> { success, exists, error }

Check whether a key exists. Returns `{ success: true, exists: boolean, error: null }`.

## Multiple Keys

### setMany(instance, entries, ttl_seconds?) -> { success, error }

Set multiple key-value pairs. `entries` is an Object `{ key: value, ... }`. On a single instance, `MSET` is atomic: either every pair is written or none.

When `ttl_seconds` is provided, a pipeline of `SET` commands with `EX` is used (MSET does not support EX).

Empty input (`{}`) is a no-op success without contacting the engine. The engine rejects a zero-key `MSET`.

If any value fails to serialize, the whole call fails and nothing is written.

### getMany(instance, keys) -> { success, values, error }

Get values for multiple keys. `keys` is an Array. `values.length === keys.length` always, with `null` in the position of each absent key.

Empty input (`[]`) is a no-op success without contacting the engine.

If any one element fails to deserialize, the whole call fails with `KV_SERIALIZATION_FAILED`. The bad element is not nulled and the call is not partially successful, because that would hide data corruption behind a normal-looking result.

### deleteMany(instance, keys) -> { success, deleted_count, error }

Delete multiple keys. `deleted_count` is the exact number of keys actually removed. Empty input is a no-op success.

## Scan

### scan(instance, pattern, options?) -> { success, keys, error }

Scan all keys matching a glob pattern (e.g. `user:*`). The driver pages through the cursor internally and returns all matching keys in one call. The caller never sees a cursor.

`KEY_PREFIX` is applied to the pattern and stripped from every returned key. A leaked prefix in scan output is the likeliest bug in this module and has a dedicated regression test.

**O(N) over the keyspace.** This is a maintenance tool, not a request-path operation.

## Hash

### setHashField(instance, key, field, value) -> { success, error }

Set a field in a hash. `KEY_PREFIX` applies to `key`, not to `field`. Field values are JSON-serialized when `SERIALIZE_JSON` is true; field names are never serialized.

### getHashField(instance, key, field) -> { success, value, error }

Get a field from a hash. Returns `null` for absent key or absent field.

### getHashFields(instance, key) -> { success, fields, error }

Get all fields and values from a hash. Returns `{}` (empty object) for absent key. If any one field value fails to deserialize, the whole call fails.

### deleteHashField(instance, key, field) -> { success, deleted_count, error }

Delete a field from a hash. `deleted_count` is 0 for absent key or field.

## TTL

### setExpire(instance, key, ttl_seconds) -> { success, applied, error }

Set an expiry on a key. `applied` is `true` if the key exists and the expiry was set, `false` if the key was absent. The `applied` field exists because silent success on an absent key is a footgun: the caller believes an expiry is set when none is.

### getTtl(instance, key) -> { success, ttl_seconds, error }

Get the TTL in seconds. The engine returns two sentinel values: `-1` for "key exists with no expiry" and `-2` for "key absent". Both map to `null` and are never returned to the caller. A caller that needs to tell them apart calls `getKeyExists`.

## Counter

### increment(instance, key, by?) -> { success, value, error }

Increment a key by 1 (default) or by the given amount. Uses `INCR` when `by` is omitted or 1, `INCRBY` otherwise. Both are atomic on a single instance. An absent key is treated as 0 by the engine, so `increment` on an absent key returns 1 (or `by`).

If the existing value is not an integer, the engine rejects the command and the call returns `KV_COMMAND_FAILED`. The engine's wording is logged at debug and never returned.

## Error Catalog

| Error type | When |
|---|---|
| `KV_CONNECTION_FAILED` | The server is unreachable or the connection is refused |
| `KV_COMMAND_FAILED` | A command fails for an operational reason (wrong value type, etc.) |
| `KV_TIMEOUT` | A command times out |
| `KV_SERIALIZATION_FAILED` | JSON serialization or deserialization fails |

There is no `KV_KEY_NOT_FOUND`. Not-found is a normal outcome, not an operational error.
