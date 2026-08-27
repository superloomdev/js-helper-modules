# @superloomdev/js-rnw-helper-device

![MIT License](https://img.shields.io/badge/license-MIT-blue)
![Node 24+](https://img.shields.io/badge/node-%3E%3D24-green)

A device and platform helper for the React Native Web pipeline that ships pre-tested and exposes a unified interface for platform detection, viewport tracking, network state, app state changes, and safe-area insets. Part of [Superloom](https://superloom.dev).

## What This Is

A standalone device helper module for RNW applications. It wraps the React Native Platform, Dimensions, AppState, NetInfo, and SafeArea APIs behind a single interface with all platform APIs injected, so the module is testable in pure Node with stubs.

The module reads React Native `Platform`, not Expo, so it is not affected by the Expo pin. It targets the RNW pipeline because `react-native` Platform works across web, iOS, and Android via Metro.

```javascript
// In the host loader
import device from '@superloomdev/js-rnw-helper-device';

Lib.Device = device({
  Utils:  Lib.Utils,
  Debug:  Lib.Debug,
  Platform:   Platform,     // from react-native
  Dimensions: Dimensions,   // from react-native
  AppState:   AppState,     // from react-native (optional)
  NetInfo:    NetInfo,      // from @react-native-community/netinfo (optional)
  SafeArea:   SafeArea      // from react-native-safe-area-context (optional)
});
```

## Why Use This Module

1. **Centralized platform detection.** One module answers "which platform are we on" so the rest of the codebase reads as platform-agnostic.

2. **Injection-only access.** No direct `import 'react-native'`. All platform APIs arrive via `shared_libs`, making the module testable in pure Node with stubs.

3. **Optional APIs degrade gracefully.** AppState, NetInfo, and SafeArea return error envelopes when not injected, so the module works with a partial dependency set.

4. **Pre-tested at every release.** A full test suite runs in CI on every push with injected stubs. No device or emulator required.

5. **Designed for human review.** The code is laid out as clearly-marked visual sections (section banners, short functions, scoped comments) so a reviewer can read it top to bottom in order.

## Aligned with Superloom Philosophy

If your project is built on Superloom conventions, this module slots in without you needing to learn anything new. It follows the standard loader pattern, companion file structure, and documentation footprint.

## Extended Documentation

- [API Reference](https://github.com/superloomdev/js-helper-modules/blob/main/src/helper-modules-client/js-rnw-helper-device/docs/api.md) - full API, envelope shapes
- [Configuration](https://github.com/superloomdev/js-helper-modules/blob/main/src/helper-modules-client/js-rnw-helper-device/docs/configuration.md) - config keys, peer dependencies, testing tiers
- [Superloom](https://superloom.dev) - the framework

## Adding to Your Project

This module is a peer dependency. Add it to your project's `package.json` and load it through the [loader pattern](https://github.com/superloomdev/superloom/blob/main/docs/server/server-loader.md).

See [npmrc setup](https://github.com/superloomdev/superloom/blob/main/docs/dev/npmrc-setup.md) for one-time GitHub Packages registry configuration.

## Dependencies

No bundled npm packages. All dependencies are peer dependencies:

- `@superloomdev/js-helper-utils` - type checks
- `@superloomdev/js-helper-debug` - logging (optional)

Platform APIs (injected, not npm peers):

- `react-native` Platform (required), Dimensions (required), AppState (optional)
- `@react-native-community/netinfo` (optional)
- `react-native-safe-area-context` (optional)

## Testing Status

| Tier | Runtime | Status |
|---|---|---|
| Emulated | Node.js + injected stubs | Pass |
| Integration | N/A (requires device) | N/A |

## License

MIT
