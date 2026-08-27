# API Reference

## Loader

```javascript
import device from '@superloomdev/js-rnw-helper-device';

const Device = device(shared_libs, config);
```

### Parameters

| Parameter | Type | Description |
|---|---|---|
| `shared_libs` | `Object` | Lib container with injected platform APIs |
| `config` | `Object` | Configuration overrides (optional) |

### Required Injections

| Injection | Source | Description |
|---|---|---|
| `Platform` | `react-native` | Platform module (provides `OS`) |
| `Dimensions` | `react-native` | Dimensions module (provides `get`, `addEventListener`) |

### Optional Injections

| Injection | Source | Description |
|---|---|---|
| `AppState` | `react-native` | AppState module (provides `addEventListener`) |
| `NetInfo` | `@react-native-community/netinfo` | NetInfo module (provides `fetch`) |
| `SafeArea` | `react-native-safe-area-context` | SafeArea module (provides `getSafeAreaInsetsForView`) |
| `Utils` | `@superloomdev/js-helper-utils` | Type-check primitives |
| `Debug` | `@superloomdev/js-helper-debug` | Logging (optional) |

## Functions

### getPlatform()

Returns the current platform OS string.

```javascript
const { success, platform, error } = Device.getPlatform();
// platform: 'web' | 'ios' | 'android'
```

### getViewport()

Returns the current window dimensions.

```javascript
const { success, width, height, error } = Device.getViewport();
// width: number, height: number
```

### onViewportChange(callback)

Subscribes to viewport dimension changes. Returns an unsubscribe function.

```javascript
const { success, unsubscribe, error } = Device.onViewportChange(function (dims) {
  console.log(dims.width, dims.height);
});

// Later: unsubscribe()
```

### getNetworkState()

Async. Returns the current network state. Requires NetInfo injection.

```javascript
const { success, isConnected, type, error } = await Device.getNetworkState();
// isConnected: boolean, type: string (e.g. 'wifi', 'cellular', 'none')
```

### onAppStateChange(callback)

Subscribes to app state changes. Returns an unsubscribe function. Requires AppState injection.

```javascript
const { success, unsubscribe, error } = Device.onAppStateChange(function (state) {
  console.log(state); // 'active' | 'background' | 'inactive'
});

// Later: unsubscribe()
```

### getSafeAreaInsets()

Returns safe-area insets. Requires SafeArea injection.

```javascript
const { success, top, bottom, left, right, error } = Device.getSafeAreaInsets();
// top, bottom, left, right: number
```

## Error Catalog

| Constant | Type | Trigger |
|---|---|---|
| `PLATFORM_UNAVAILABLE` | `helper-device/platform-unavailable` | Platform API not injected |
| `DIMENSIONS_UNAVAILABLE` | `helper-device/dimensions-unavailable` | Dimensions API not injected or read threw |
| `APPSTATE_UNAVAILABLE` | `helper-device/appstate-unavailable` | AppState API not injected |
| `NETINFO_UNAVAILABLE` | `helper-device/netinfo-unavailable` | NetInfo API not injected or fetch threw |
| `SAFEAREA_UNAVAILABLE` | `helper-device/safearea-unavailable` | SafeArea API not injected or read threw |
| `INVALID_CALLBACK` | `helper-device/invalid-callback` | Callback argument is not a function |
