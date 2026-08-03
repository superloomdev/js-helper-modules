# @superloomdev/js-client-helper-font-ext-rn

![MIT License](https://img.shields.io/badge/license-MIT-blue)
![Node 24+](https://img.shields.io/badge/node-%3E%3D24-green)

React Native font loader adapter for the font family system. Loads font files via `@vitrion/react-native-load-fonts`. Part of [Superloom](https://superloom.dev).

## What This Is

The React Native extension of `js-client-helper-font`. It implements the adapter contract: `loadManifest` and `isReady`. The core provides the manifest; this extension calls the native font loader for each font file.

No React import, no hooks, no components. The native loader package is the only RN-bound dependency, injected via `shared_libs` so tests run in pure Node with a stub.

```text
const RNFontAdapter = require('@superloomdev/js-client-helper-font-ext-rn')({
  Utils: Utils,
  Debug: Debug,
  Font: Font,
  NativeFontLoader: require('@vitrion/react-native-load-fonts')
});

await RNFontAdapter.loadManifest(Font.getManifest().manifest);
```

## Extended Documentation

- [API Reference](https://github.com/superloomdev/js-helper-modules/blob/main/src/helper-modules-client/js-client-helper-font-ext-rn/docs/api.md) - full API, envelope shapes
- [Configuration](https://github.com/superloomdev/js-helper-modules/blob/main/src/helper-modules-client/js-client-helper-font-ext-rn/docs/configuration.md) - config keys, peer dependencies
- [Superloom](https://superloom.dev) - the framework

## Dependencies

- `@superloomdev/js-client-helper-font` - the pure core (provides the manifest)
- `@superloomdev/js-helper-utils` - type checks
- `@superloomdev/js-helper-debug` - logging (optional)
- `@vitrion/react-native-load-fonts` - native font loader (injected, not directly required)

## Testing Status

| Tier | Runtime | Status |
|---|---|---|
| Emulated | Node.js + stubbed loader | Pass |
| Integration | React Native | N/A (requires RN runtime) |

## License

MIT
