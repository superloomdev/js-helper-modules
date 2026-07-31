# @superloomdev/js-rn-helper-kv-mmkv

![MIT License](https://img.shields.io/badge/license-MIT-blue)
![Node 24+](https://img.shields.io/badge/node-%3E%3D24-green)

A key-value store over `react-native-mmkv` that ships pre-tested and exposes a sync-plus-async API identical to helper-kv-localstorage for platform interchangeability. Part of [Superloom](https://superloom.dev).

## What This Is

A standalone key-value storage module for React Native applications. It wraps the MMKV engine (Tencent's mmap-backed KV store, exposed via JSI) and presents a unified KV interface with JSON-serialized values, namespaced keys, and both synchronous and asynchronous function forms.

The module exposes the same 18-function API as `helper-kv-localstorage`, so an application can swap between them at the loader level based on platform:

```text
// Web build
Lib.KvStore = require('@superloomdev/js-client-helper-kv-localstorage')(Lib, { NAMESPACE: 'myapp' });

// Native build
Lib.KvStore = require('@superloomdev/js-rn-helper-kv-mmkv')(Lib, { NAMESPACE: 'myapp' });
```

## Storage Limits

| Property | Value |
|---|---|
| Capacity | Bounded by device storage; individual values should stay small (KV engine, not a blob store) |
| Persistence | Survives app restarts. Removed on app uninstall |
| Performance | mmap-backed, ~30x faster than AsyncStorage; synchronous reads safe on the render path |
| Encryption | Optional AES via `ENCRYPTION_KEY`; key management is the application's responsibility - a key hardcoded in the JS bundle provides no real protection. Secrets belong in the platform keychain (future secure-storage module) |
| Runtime | Requires the RN runtime + JSI. Not compatible with Expo Go (custom dev build required) |
| Not for | Web (no browser support), large JSON arrays under one key, secrets without external key management |

## Why Use This Module

1. **Platform-agnostic API.** The 18-function surface is identical to `helper-kv-localstorage`. Write your storage calls once; swap the module at the loader for web builds.

2. **Sync and async in one package.** Use `getRecordSync()` for first-render reads (theme, onboarding flag) where a loading state is unacceptable. Use `getRecord()` for portable code that can swap to an async driver.

3. **Namespace isolation.** Each instance prefixes its keys with a configurable namespace. Two instances sharing one MMKV file never see each other's keys. `clear()` removes only the instance's own keys.

4. **Pre-tested at every release.** A full test suite runs in CI on every push with an in-memory MMKV stub. No device or emulator required.

5. **Designed for human review.** The code is laid out as clearly-marked visual sections (section banners, short functions, scoped comments) so a reviewer can read it top to bottom in order.

## Aligned with Superloom Philosophy

If your project is built on Superloom conventions, this module slots in without you needing to learn anything new. It follows the standard loader pattern, companion file structure, and documentation footprint.

## Extended Documentation

- [API Reference](https://github.com/superloomdev/js-helper-modules/blob/main/src/helper-modules-client/js-rn-helper-kv-mmkv/docs/api.md) - full API, envelope shapes, redux-persist adapter note
- [Configuration](https://github.com/superloomdev/js-helper-modules/blob/main/src/helper-modules-client/js-rn-helper-kv-mmkv/docs/configuration.md) - config keys, peer dependencies, testing tiers
- [Superloom](https://superloom.dev) - the framework

## Adding to Your Project

This module is a peer dependency. Add it to your project's `package.json` and load it through the [loader pattern](https://github.com/superloomdev/superloom/blob/main/docs/server/server-loader.md).

See [npmrc setup](https://github.com/superloomdev/superloom/blob/main/docs/dev/npmrc-setup.md) for one-time GitHub Packages registry configuration.

## Dependencies

No bundled npm packages. All dependencies are peer dependencies:

- `@superloomdev/js-helper-utils` - type checks, timestamp utilities
- `@superloomdev/js-helper-debug` - logging, performance audit
- `react-native-mmkv` - the MMKV engine (JSI, mmap-backed)

## Testing Status

| Tier | Runtime | Status |
|---|---|---|
| Emulated | Node.js + MMKV stub | Pass |
| Integration | N/A (requires device) | N/A |

## License

MIT
