# API Reference

## Loader

```javascript
const RNFontAdapter = require('@superloomdev/js-client-helper-font-ext-rn')(shared_libs, config);
```

### Required Injections

| Injection | Source | Description |
|---|---|---|
| `Font` | `@superloomdev/js-client-helper-font` | The core font instance |
| `NativeFontLoader` | `@vitrion/react-native-load-fonts` | The native font loader module |
| `Utils` | `@superloomdev/js-helper-utils` | Type-check primitives |

### Optional Injections

| Injection | Source | Description |
|---|---|---|
| `Debug` | `@superloomdev/js-helper-debug` | Logging |

## Functions

### loadManifest(manifest)

Async. Iterates the manifest, calls the native loader for each font file, and tracks success/failure counts.

```javascript
const { success, error } = await RNFontAdapter.loadManifest(Font.getManifest().manifest);
```

### isReady()

Returns whether all fonts have been loaded.

```javascript
const { success, ready, error } = RNFontAdapter.isReady();
```

### getLoadedCount()

Returns the count of successfully loaded fonts.

```javascript
const { success, count, error } = RNFontAdapter.getLoadedCount();
```

### getFailedCount()

Returns the count of fonts that failed to load.

```javascript
const { success, count, error } = RNFontAdapter.getFailedCount();
```

## Error Catalog

| Constant | Type | Trigger |
|---|---|---|
| `INVALID_MANIFEST` | `helper-font-ext-rn/invalid-manifest` | Manifest is not a plain object |
| `FONT_CORE_UNAVAILABLE` | `helper-font-ext-rn/font-core-unavailable` | Font core not injected |
| `NATIVE_LOADER_UNAVAILABLE` | `helper-font-ext-rn/native-loader-unavailable` | Native loader not injected |
| `LOAD_FAILED` | `helper-font-ext-rn/load-failed` | One or more fonts failed (when `FAIL_ON_ERROR` is true) |
