# @superloomdev/js-client-helper-font-ext-expo

![MIT License](https://img.shields.io/badge/license-MIT-blue)
![Node 24+](https://img.shields.io/badge/node-%3E%3D24-green)

Expo font loader adapter for the font family system. Loads fonts via `expo-font`'s `loadAsync`. Part of [Superloom](https://superloom.dev).

## What This Is

The Expo extension of `js-client-helper-font`. It implements the adapter contract: `loadManifest` and `isReady`. The core provides the manifest; this extension resolves the best source for each entry (`asset` on native, `url` on web, `path` as fallback) and calls `expo-font`'s `loadAsync`.

No React import, no hooks, no components. The `expo-font` package is a direct dependency — required at module scope, not injected by the app. Tests stub it via a `package.json` alias.

```text
const ExpoFontAdapter = require('@superloomdev/js-client-helper-font-ext-expo')({
  Utils: Utils,
  Debug: Debug,
  Font: Font
});

await ExpoFontAdapter.loadManifest(Font.getManifest().manifest);
```

## Extended Documentation

- [API Reference](https://github.com/superloomdev/js-helper-modules/blob/main/src/helper-modules-client/js-client-helper-font-ext-expo/docs/api.md) - full API, envelope shapes
- [Configuration](https://github.com/superloomdev/js-helper-modules/blob/main/src/helper-modules-client/js-client-helper-font-ext-expo/docs/configuration.md) - config keys, peer dependencies
- [Superloom](https://superloom.dev) - the framework

## Dependencies

- `@superloomdev/js-client-helper-font` - the pure core (provides the manifest)
- `@superloomdev/js-helper-utils` - type checks
- `@superloomdev/js-helper-debug` - logging (optional)
- `expo-font` - Expo font loader (direct dependency, uses `loadAsync`)

## Testing Status

| Tier | Runtime | Status |
|---|---|---|
| Emulated | Node.js + stubbed expo-font | Pass |
| Integration | Expo | N/A (requires Expo runtime) |

## License

MIT
