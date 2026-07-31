# @superloomdev/js-client-helper-kv-localstorage

![MIT License](https://img.shields.io/badge/license-MIT-blue)
![Node 24+](https://img.shields.io/badge/node-%3E%3D24-green)

A key-value store over browser Web Storage that ships pre-tested and exposes a sync-plus-async API identical to helper-kv-mmkv for platform interchangeability. Part of [Superloom](https://superloom.dev).

## What This Is

A standalone key-value storage module for web applications. It wraps the browser's Web Storage API (`localStorage` or `sessionStorage`) and presents a unified KV interface with JSON-serialized values, namespaced keys, and both synchronous and asynchronous function forms.

The module exposes the same 18-function API as `helper-kv-mmkv`, so an application can swap between them at the loader level based on platform:

```text
// Web build
Lib.KvStore = require('@superloomdev/js-client-helper-kv-localstorage')(Lib, { NAMESPACE: 'myapp' });

// Native build
Lib.KvStore = require('@superloomdev/js-rn-helper-kv-mmkv')(Lib, { NAMESPACE: 'myapp' });
```

## Storage Limits

| Property | Value |
|---|---|
| Capacity | ~5-10 MB per origin (browser-dependent; separate from the IndexedDB/Cache quota) |
| Persistence | Survives browser restarts (local); cleared on tab close (session). User can clear via browser settings at any time |
| Threading | Synchronous engine - large values block the main thread. Keep values small (state flags, preferences, small JSON) |
| Private browsing | Works, but wiped when the window closes |
| Not for | Large caches, blobs, relational data, secrets |

## Why Use This Module

1. **Platform-agnostic API.** The 18-function surface is identical to `helper-kv-mmkv`. Write your storage calls once; swap the module at the loader for native builds.

2. **Sync and async in one package.** Use `getRecordSync()` for first-render reads (theme, onboarding flag) where a loading state is unacceptable. Use `getRecord()` for portable code that can swap to an async driver.

3. **Namespace isolation.** Each instance prefixes its keys with a configurable namespace. Two instances sharing one `localStorage` never see each other's keys. `clear()` removes only the instance's own keys.

4. **Pre-tested at every release.** A full test suite runs in CI on every push with an in-memory Web Storage stub. No browser or emulator required.

5. **Designed for human review.** The code is laid out as clearly-marked visual sections (section banners, short functions, scoped comments) so a reviewer can read it top to bottom in order.

## Aligned with Superloom Philosophy

If your project is built on Superloom conventions, this module slots in without you needing to learn anything new. It follows the standard loader pattern, companion file structure, and documentation footprint.

## Extended Documentation

- [API Reference](https://github.com/superloomdev/js-helper-modules/blob/main/src/helper-modules-client/js-client-helper-kv-localstorage/docs/api.md) - full API, envelope shapes, redux-persist adapter note
- [Configuration](https://github.com/superloomdev/js-helper-modules/blob/main/src/helper-modules-client/js-client-helper-kv-localstorage/docs/configuration.md) - config keys, peer dependencies, testing tiers
- [Superloom](https://superloom.dev) - the framework

## Adding to Your Project

This module is a peer dependency. Add it to your project's `package.json` and load it through the [loader pattern](https://github.com/superloomdev/superloom/blob/main/docs/server/server-loader.md).

See [npmrc setup](https://github.com/superloomdev/superloom/blob/main/docs/dev/npmrc-setup.md) for one-time GitHub Packages registry configuration.

## Dependencies

No bundled npm packages. All dependencies are peer dependencies:

- `@superloomdev/js-helper-utils` - type checks, timestamp utilities
- `@superloomdev/js-helper-debug` - logging, performance audit

## Testing Status

| Tier | Runtime | Status |
|---|---|---|
| Emulated | Node.js + Web Storage stub | Pass |
| Integration | N/A (no external service) | N/A |

## License

MIT
