# ROBOTS.md - AI Agent Reference

> Compact reference for code generation. For human docs see README.md

## Type

Class I standalone module. Wraps React Native Platform, Dimensions, AppState, NetInfo, and SafeArea APIs. All platform APIs injected via `shared_libs`. No direct `require('react-native')`.

## Peer Dependencies

| Injection Name | Package | Alias |
|---|---|---|
| `Utils` | `@superloomdev/js-helper-utils` | `helper-utils` |
| `Debug` | `@superloomdev/js-helper-debug` | `helper-debug` |

Platform APIs (injected, not npm peers):

| Injection Name | Source | Required |
|---|---|---|
| `Platform` | `react-native` Platform module | Yes |
| `Dimensions` | `react-native` Dimensions module | Yes |
| `AppState` | `react-native` AppState module | No |
| `NetInfo` | `@react-native-community/netinfo` | No |
| `SafeArea` | `react-native-safe-area-context` | No |

## Direct Dependencies

None. All dependencies are peer dependencies or injected platform APIs.

## Companion Files

- `device.config.js` - keys: `VIEWPORT_DEBOUNCE_MS` (default `0`)
- `device.errors.js` - constants: `PLATFORM_UNAVAILABLE`, `DIMENSIONS_UNAVAILABLE`, `APPSTATE_UNAVAILABLE`, `NETINFO_UNAVAILABLE`, `SAFEAREA_UNAVAILABLE`, `INVALID_CALLBACK`
- `device.validators.js` - functions: `validateConfig(CONFIG)`, `validateCallback(callback)`

## Loader Pattern

```javascript
const Device = require('@superloomdev/js-rnw-helper-device')({
  Utils: Utils,
  Debug: Debug,
  Platform: Platform,           // required - react-native Platform
  Dimensions: Dimensions,       // required - react-native Dimensions
  AppState: AppState,           // optional - react-native AppState
  NetInfo: NetInfo,             // optional - @react-native-community/netinfo
  SafeArea: SafeArea            // optional - react-native-safe-area-context
}, {
  VIEWPORT_DEBOUNCE_MS: 0
});
```

Missing `shared_libs.Platform` or `shared_libs.Dimensions` throws at construction time.

## Config Keys

| Key | Type | Default | Required |
|---|---|---|---|
| `VIEWPORT_DEBOUNCE_MS` | number | `0` | No |

## Exported Functions (6 total)

```
getPlatform() -> { success, platform, error } | async:no
  Returns the platform OS string ('web', 'ios', 'android'). Reads Lib.Platform.OS.

getViewport() -> { success, width, height, error } | async:no
  Returns current window dimensions from Lib.Dimensions.get('window').

onViewportChange(callback) -> { success, unsubscribe, error } | async:no
  Subscribes to dimension changes. callback receives { width, height }. Returns unsubscribe function.

getNetworkState() -> Promise<{ success, isConnected, type, error }> | async:yes
  Fetches current network state from Lib.NetInfo.fetch(). Returns NETINFO_UNAVAILABLE when NetInfo not injected.

onAppStateChange(callback) -> { success, unsubscribe, error } | async:no
  Subscribes to app state changes. callback receives state string ('active', 'background', 'inactive'). Returns APPSTATE_UNAVAILABLE when AppState not injected.

getSafeAreaInsets() -> { success, top, bottom, left, right, error } | async:no
  Returns safe-area insets from Lib.SafeArea. Returns SAFEAREA_UNAVAILABLE when SafeArea not injected.
```

## Patterns

- **Factory-per-loader**: each `loader(shared_libs, config)` call returns an independent instance with its own subscription state
- **Injection-only platform access**: no direct `require('react-native')`; all platform APIs arrive via `shared_libs`
- **Optional APIs degrade gracefully**: AppState, NetInfo, SafeArea return error envelopes when not injected; Platform and Dimensions are required and throw at construction
- **Subscription management**: `onViewportChange` and `onAppStateChange` return unsubscribe functions; callbacks stored in per-instance state
- **Debounce**: viewport changes debounced when `VIEWPORT_DEBOUNCE_MS > 0`
- **Return envelope**: flat envelopes; all keys on every path; data fields null on failure

## Error Catalog

| Constant | Type | Trigger |
|---|---|---|
| `PLATFORM_UNAVAILABLE` | `helper-device/platform-unavailable` | Platform API not injected |
| `DIMENSIONS_UNAVAILABLE` | `helper-device/dimensions-unavailable` | Dimensions API not injected or read threw |
| `APPSTATE_UNAVAILABLE` | `helper-device/appstate-unavailable` | AppState API not injected |
| `NETINFO_UNAVAILABLE` | `helper-device/netinfo-unavailable` | NetInfo API not injected or fetch threw |
| `SAFEAREA_UNAVAILABLE` | `helper-device/safearea-unavailable` | SafeArea API not injected or read threw |
| `INVALID_CALLBACK` | `helper-device/invalid-callback` | Callback argument is not a function |
