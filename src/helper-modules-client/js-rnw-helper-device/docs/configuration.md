# Configuration

## Config Keys

| Key | Type | Default | Description |
|---|---|---|---|
| `VIEWPORT_DEBOUNCE_MS` | number | `0` | Debounce interval for viewport change events in milliseconds. 0 = no debounce |

## Peer Dependencies

| Name | Package | Alias |
|---|---|---|
| `Utils` | `@superloomdev/js-helper-utils` | `helper-utils` |
| `Debug` | `@superloomdev/js-helper-debug` | `helper-debug` |

## Injected Platform APIs

| Name | Source | Required | Methods Used |
|---|---|---|---|
| `Platform` | `react-native` | Yes | `OS` |
| `Dimensions` | `react-native` | Yes | `get('window')`, `addEventListener('change', cb)` |
| `AppState` | `react-native` | No | `addEventListener('change', cb)` |
| `NetInfo` | `@react-native-community/netinfo` | No | `fetch()` |
| `SafeArea` | `react-native-safe-area-context` | No | `getSafeAreaInsetsForView()` |

## Testing Tiers

| Tier | Runtime | Setup |
|---|---|---|
| Emulated | Node.js | Inject stub objects for Platform, Dimensions, AppState, NetInfo, SafeArea |
| Integration | Device/simulator | Inject real react-native modules |
