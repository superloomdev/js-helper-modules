# Configuration

> Module: `@superloomdev/js-rn-helper-kv-mmkv`
> Class: C (Driver Wrapper)


## Loader

```javascript
import kvMmkv from '@superloomdev/js-rn-helper-kv-mmkv';

const Store = kvMmkv({
  Utils: Utils,
  Debug: Debug,
  MMKV: MMKV    // required - the MMKV class from react-native-mmkv
}, config);
```


## Config Keys

| Key | Type | Default | Required | Description |
|---|---|---|---|---|
| `NAMESPACE` | `string` | `''` | No | Key prefix. Stored key is `[NAMESPACE]:[key]` when non-empty, bare `[key]` when empty. Applied on top of the MMKV instance id, so two Superloom instances can share one MMKV file with different namespaces |
| `INSTANCE_ID` | `string` | `'default'` | No | Passed to `new MMKV({ id })`. Separate ids are separate storage files |
| `ENCRYPTION_KEY` | `string` | `undefined` | No | Optional AES key passed to the MMKV constructor. Never logged. A key hardcoded in the JS bundle provides no real protection |


## Peer Dependencies

| Package | Alias | Version | Purpose |
|---|---|---|---|
| `@superloomdev/js-helper-utils` | `helper-utils` | `^1.0.0` | Type checks, timestamp utilities |
| `@superloomdev/js-helper-debug` | `helper-debug` | `^1.0.0` | Logging, performance audit |
| `react-native-mmkv` | - | `^3.0.0` | The MMKV engine (JSI, mmap-backed) |


## Environment Variables

None. This module reads no environment variables.


## Testing Tiers

| Tier | Runtime | Status |
|---|---|---|
| Emulated | Node.js + MMKV stub | Pass |
| Integration | N/A (requires device) | N/A |

Tests run in pure Node with an in-memory MMKV stub class injected via `shared_libs.MMKV`. No device or emulator required.
