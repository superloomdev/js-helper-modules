# ROBOTS.md - AI Agent Reference

> Compact reference for code generation. For human docs see README.md

## Type

Class H extension of `js-client-helper-font`. React Native font loader adapter. Uses `@vitrion/react-native-load-fonts` to load font files natively. No React imports, no hooks, no components.

## Peer Dependencies

| Injection Name | Package | Alias |
|---|---|---|
| `Utils` | `@superloomdev/js-helper-utils` | `helper-utils` |
| `Debug` | `@superloomdev/js-helper-debug` | `helper-debug` |
| `Font` | `@superloomdev/js-client-helper-font` | `helper-font` |
| `NativeFontLoader` | `@vitrion/react-native-load-fonts` | n/a |

## Direct Dependencies

None. All dependencies are peer dependencies. The native loader is injected via `shared_libs.NativeFontLoader`.

## Companion Files

- `extension.config.js` - keys: `FAIL_ON_ERROR` (default `false`)
- `extension.errors.js` - constants: `INVALID_MANIFEST`, `FONT_CORE_UNAVAILABLE`, `NATIVE_LOADER_UNAVAILABLE`, `LOAD_FAILED`
- `extension.validators.js` - functions: `validateConfig(CONFIG)`, `validateManifest(manifest)`

## Loader Pattern

```javascript
const RNFontAdapter = require('@superloomdev/js-client-helper-font-ext-rn')({
  Utils: Utils,
  Debug: Debug,
  Font: Font,                  // required - the js-client-helper-font instance
  NativeFontLoader: require('@vitrion/react-native-load-fonts')  // required
});
```

Missing `shared_libs.Font` or `shared_libs.NativeFontLoader` throws at construction time.

## Config Keys

| Key | Type | Default | Required |
|---|---|---|---|
| `FAIL_ON_ERROR` | boolean | `false` | No |

## Exported Functions (4 total)

```
loadManifest(manifest) -> Promise<{ success, error }> | async:yes
  Iterates the manifest, calls the native loader for each font file.
  manifest is the output of Font.getManifest().

isReady() -> { success, ready, error } | async:no
  Returns whether all fonts have been loaded.

getLoadedCount() -> { success, count, error } | async:no
  Returns the count of successfully loaded fonts.

getFailedCount() -> { success, count, error } | async:no
  Returns the count of fonts that failed to load.
```

## Patterns

- **Factory-per-loader**: each loader call returns an independent instance
- **Injection-only native access**: no direct `require('@vitrion/react-native-load-fonts')`; the loader arrives via `shared_libs.NativeFontLoader`
- **No React, no hooks, no components**: the loader package is the only RN-bound dependency
- **Parallel loading**: all font files load via `Promise.allSettled`; failures are tallied, not thrown (unless `FAIL_ON_ERROR` is true)
- **Adapter support**: supports both `loadFont(name, url)` and `loadFonts({ name: url })` APIs

## Error Catalog

| Constant | Type | Trigger |
|---|---|---|
| `INVALID_MANIFEST` | `helper-font-ext-rn/invalid-manifest` | Manifest is not a plain object |
| `FONT_CORE_UNAVAILABLE` | `helper-font-ext-rn/font-core-unavailable` | Font core not injected |
| `NATIVE_LOADER_UNAVAILABLE` | `helper-font-ext-rn/native-loader-unavailable` | Native loader not injected |
| `LOAD_FAILED` | `helper-font-ext-rn/load-failed` | One or more fonts failed to load (when `FAIL_ON_ERROR` is true) |
