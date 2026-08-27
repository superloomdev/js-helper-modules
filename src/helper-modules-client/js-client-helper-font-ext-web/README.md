# @superloomdev/js-client-helper-font-ext-web

![MIT License](https://img.shields.io/badge/license-MIT-blue)
![Node 24+](https://img.shields.io/badge/node-%3E%3D24-green)

Web DOM font loader adapter for the font family system. Injects `@font-face` CSS from the font core into `document.head`. Part of [Superloom](https://superloom.dev).

## What This Is

The web extension of `js-client-helper-font`. It implements the adapter contract: `loadManifest` and `isReady`. The core builds `@font-face` CSS strings; this extension creates a `<style>` node and appends it to the DOM.

No React, no react-native. Pure DOM manipulation. Tests run in Node with a minimal `document` stub.

```javascript
import fontExtWeb from '@superloomdev/js-client-helper-font-ext-web';

const WebFontAdapter = fontExtWeb({
  Utils: Utils,
  Debug: Debug,
  Font: Font
});

await WebFontAdapter.loadManifest(Font.getManifest().manifest);
```

## Extended Documentation

- [API Reference](https://github.com/superloomdev/js-helper-modules/blob/main/src/helper-modules-client/js-client-helper-font-ext-web/docs/api.md) - full API, envelope shapes
- [Configuration](https://github.com/superloomdev/js-helper-modules/blob/main/src/helper-modules-client/js-client-helper-font-ext-web/docs/configuration.md) - config keys, peer dependencies
- [Superloom](https://superloom.dev) - the framework

## Dependencies

- `@superloomdev/js-client-helper-font` - the pure core (builds `@font-face` strings)
- `@superloomdev/js-helper-utils` - type checks
- `@superloomdev/js-helper-debug` - logging (optional)

## Testing Status

| Tier | Runtime | Status |
|---|---|---|
| Emulated | Node.js + document stub | Pass |
| Integration | Browser | N/A (requires browser) |

## License

MIT
