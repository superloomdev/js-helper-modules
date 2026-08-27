# Configuration

> Module: `@superloomdev/js-client-helper-kv-localstorage`
> Class: C (Driver Wrapper)


## Loader

```javascript
import kvLocalstorage from '@superloomdev/js-client-helper-kv-localstorage';

const Store = kvLocalstorage({
  Utils: Utils,
  Debug: Debug,
  WebStorage: engine    // optional - injected storage engine
}, config);
```


## Config Keys

| Key | Type | Default | Required | Description |
|---|---|---|---|---|
| `NAMESPACE` | `string` | `''` | No | Key prefix. Stored key is `[NAMESPACE]:[key]` when non-empty, bare `[key]` when empty |
| `STORE` | `string` | `'local'` | No | `'local'` for localStorage, `'session'` for sessionStorage. Whitelisted; anything else is a config throw |


## Peer Dependencies

| Package | Alias | Version | Purpose |
|---|---|---|---|
| `@superloomdev/js-helper-utils` | `helper-utils` | `^1.0.0` | Type checks, timestamp utilities |
| `@superloomdev/js-helper-debug` | `helper-debug` | `^1.0.0` | Logging, performance audit |


## Environment Variables

None. This module reads no environment variables.


## Testing Tiers

| Tier | Runtime | Status |
|---|---|---|
| Emulated | Node.js + Web Storage stub | Pass |
| Integration | N/A (no external service) | N/A |

Tests run in pure Node with an in-memory Web Storage stub injected via `shared_libs.WebStorage`. No browser required.
