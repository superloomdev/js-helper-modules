# Configuration

## Config Keys

| Key | Type | Default | Description |
|---|---|---|---|
| `FAIL_ON_ERROR` | boolean | `false` | When true, loadManifest returns an error if any font fails to load |

## Peer Dependencies

| Name | Package | Alias |
|---|---|---|
| `Utils` | `@superloomdev/js-helper-utils` | `helper-utils` |
| `Debug` | `@superloomdev/js-helper-debug` | `helper-debug` |
| `Font` | `@superloomdev/js-client-helper-font` | `helper-font` |
| `NativeFontLoader` | `@vitrion/react-native-load-fonts` | n/a |

## Testing Tiers

| Tier | Runtime | Setup |
|---|---|---|
| Emulated | Node.js | Inject a stub for `NativeFontLoader` via `shared_libs` |
| Integration | React Native | Real native loader; requires RN runtime |
