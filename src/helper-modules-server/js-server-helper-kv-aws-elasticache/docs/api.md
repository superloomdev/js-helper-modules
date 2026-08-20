# API Reference

## Overview

This module exposes the same 17 functions as `js-server-helper-kv-valkey`. The function signatures, return shapes, and error handling are identical. The only difference is that this module generates IAM auth tokens internally and injects them into the connection.

For the full function reference, see [kv-valkey's API reference](https://github.com/superloomdev/superloom/blob/main/src/helper-modules-server/js-server-helper-kv-valkey/docs/api.md).

## Functions

### Lifecycle

- `close(instance)` -> `{ success, error }`
- `ping(instance)` -> `{ success, error }`

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

All errors from `kv-valkey` plus:

| Error type | When |
|---|---|
| `KV_CONNECTION_FAILED` | Server unreachable |
| `KV_COMMAND_FAILED` | Command fails operationally |
| `KV_TIMEOUT` | Command times out |
| `KV_SERIALIZATION_FAILED` | JSON serialization fails |
| `KV_ELASTICACHE_IAM_TOKEN_FAILED` | SigV4 token generation fails (bad credentials, missing config) |
| `KV_ELASTICACHE_IAM_TOKEN_EXPIRED` | Token expired and refresh failed |

## IAM Auth Behavior

When `IAM_USER_ID` is configured:
- The module generates a SigV4-signed token on first connection
- The token is cached and refreshed `TOKEN_REFRESH_MARGIN_SECONDS` before expiry
- The token is passed as the `PASSWORD` to `ioredis`
- On reconnect, a fresh token is generated

When `IAM_USER_ID` is not configured:
- The module falls through to `kv-valkey`'s standard connection
- `PASSWORD` and `USERNAME` are not set (use `kv-valkey` directly for password auth)
