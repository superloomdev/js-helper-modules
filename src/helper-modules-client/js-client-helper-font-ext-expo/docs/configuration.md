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

## Direct Dependencies

| Package | Usage |
|---|---|
| `expo-font` | Required at module scope; calls `loadAsync(fontDescriptor, source)` |

## Testing Tiers

| Tier | Runtime | Setup |
|---|---|---|
| Emulated | Node.js | Stub `expo-font` via `_test/package.json` alias |
| Integration | Expo | Real expo-font; requires Expo runtime |
