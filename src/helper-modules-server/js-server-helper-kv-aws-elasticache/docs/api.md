# API Reference

## Overview

This module exposes 17 key-value functions, the same set as `js-server-helper-kv-valkey`. The function signatures, return shapes, and error handling are identical. This is a standalone module - it does not depend on `kv-valkey` and owns its full implementation.

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

### Single Key

- `set(instance, key, value, ttl_seconds?)` -> `{ success, error }`
- `get(instance, key)` -> `{ success, value, error }`
- `delete(instance, key)` -> `{ success, deleted_count, error }`
- `getKeyExists(instance, key)` -> `{ success, exists, error }`

### Multiple Keys

- `setMany(instance, entries, ttl_seconds?)` -> `{ success, error }`
- `getMany(instance, keys)` -> `{ success, values, error }`
- `deleteMany(instance, keys)` -> `{ success, deleted_count, error }`

### Scan

- `scan(instance, pattern, options?)` -> `{ success, keys, error }`

### Hash

- `setHashField(instance, key, field, value)` -> `{ success, error }`
- `getHashField(instance, key, field)` -> `{ success, value, error }`
- `getHashFields(instance, key)` -> `{ success, fields, error }`
- `deleteHashField(instance, key, field)` -> `{ success, deleted_count, error }`

### TTL

- `setExpire(instance, key, ttl_seconds)` -> `{ success, applied, error }`
- `getTtl(instance, key)` -> `{ success, ttl_seconds, error }`

### Counter

- `increment(instance, key, by?)` -> `{ success, value, error }`

## Error Catalog

| Error type | When |
|---|---|
| `KV_CONNECTION_FAILED` | Server unreachable |
| `KV_COMMAND_FAILED` | Command fails operationally |
| `KV_TIMEOUT` | Command times out |
| `KV_SERIALIZATION_FAILED` | JSON serialization fails |
| `KV_ELASTICACHE_IAM_TOKEN_FAILED` | SigV4 token generation fails (bad credentials, missing config) |
| `KV_ELASTICACHE_IAM_TOKEN_EXPIRED` | Token expired and refresh failed |

## IAM Auth Behavior

When `IAM_USER_ID` is configured and `ENDPOINT` is not set:
- The module generates a SigV4-signed token using `@smithy/signature-v4` on first connection
- The token is cached and refreshed `TOKEN_REFRESH_MARGIN_SECONDS` before expiry
- The token is passed as the `password` to `ioredis`
- On reconnect, a fresh token is generated

When `ENDPOINT` is set (local testing) or `IAM_USER_ID` is not configured:
- The module connects with a plain `ioredis` client (no IAM auth)
