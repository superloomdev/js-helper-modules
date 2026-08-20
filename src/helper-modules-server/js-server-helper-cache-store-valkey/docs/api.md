# API Reference - helper-cache-store-valkey

This adapter implements the 5-method store contract consumed by `helper-cache`. This document focuses on the Valkey-specific semantics.

## Adapter Factory

```js
const Store = require('@superloomdev/js-server-helper-cache-store-valkey')(Lib, {
  KEY_PREFIX: 'cache:',
  KEY_SEPARATOR: ':'
});
```

## Store Contract

### `get(instance, namespace, cache_code)`

Composes a flat Valkey key `KEY_PREFIX + namespace + KEY_SEPARATOR + cache_code` and delegates to `Lib.KV.get`. Returns `value: null` on a miss (key absent or expired via native Valkey TTL).

**Return:** `{ success, value, error }`

---

### `set(instance, namespace, cache_code, value, ttl_seconds)`

Composes the key and delegates to `Lib.KV.set`. `ttl_seconds` is positional and optional - when absent, the key has no expiry. Valkey handles expiry natively via `SET key value EX ttl_seconds`.

**Return:** `{ success, error }`

---

### `delete(instance, namespace, cache_code)`

Composes the key and delegates to `Lib.KV.delete`. Idempotent: a `deleted_count` of 0 is still `success: true`.

**Return:** `{ success, error }`

---

### `clear(instance, namespace, cache_code_prefix?)`

SCAN for every key matching `KEY_PREFIX + namespace + KEY_SEPARATOR + (cache_code_prefix || '') + '*'`, then delete them in one `Lib.KV.deleteMany` call. Short-circuits on zero matches to avoid a needless roundtrip.

**O(N) over the entire keyspace.** `SCAN` iterates every key in the database and filters after retrieval; the `MATCH` pattern does not narrow the scan. See [Configuration](configuration.md#clear-and-list-complexity) for the cost implications.

**Return:** `{ success, deleted_count, error }`

---

### `list(instance, namespace, cache_code_prefix?)`

SCAN for matching keys, strip the `KEY_PREFIX + namespace + KEY_SEPARATOR` prefix from each, and return the `cache_codes`. When `cache_code_prefix` is omitted, lists every `cache_code` in the namespace.

**O(N) over the entire keyspace.** Same SCAN cost as `clear`.

**Return:** `{ success, cache_codes, error }`

---

## Error Handling

All methods return `{ success: false, error: ERRORS.SERVICE_UNAVAILABLE }` on driver failure. The underlying error is logged via `Lib.Debug.debug`. The driver's own error type and message never leak through.
