# API Reference

## Loader

```javascript
const RNFontAdapter = require('@superloomdev/js-client-helper-font-ext-rn')(shared_libs, config);
```

### Required Injections

| Injection | Source | Description |
|---|---|---|
| `Font` | `@superloomdev/js-client-helper-font` | The core font instance |
| `Utils` | `@superloomdev/js-helper-utils` | Type-check primitives |

### Optional Injections

| Injection | Source | Description |
|---|---|---|
| `Debug` | `@superloomdev/js-helper-debug` | Logging |

### Direct Dependencies

The extension requires `@vitrion/react-native-load-fonts` directly at module scope. It is not injected by the app. The extension calls `loadFontFromFile(name, filePath)` for each font entry that has a `path` field.

## Functions

### loadManifest(manifest)

Async. Iterates the manifest, validates each style entry has a `path` (local file path), calls `loadFontFromFile` via the native loader, and tracks success/failure counts.

```javascript
const { success, error } = await RNFontAdapter.loadManifest(Font.getManifest().manifest);
```

### isReady()

Returns whether all fonts have been loaded.

```javascript
const { success, ready, error } = RNFontAdapter.isReady();
```

### isFamilyLoaded(familyName)

Checks whether a specific font family has been loaded by this adapter. Used for incremental loading to skip already-loaded families.

```javascript
const { success, loaded, error } = RNFontAdapter.isFamilyLoaded('Poppins');
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
| `MISSING_PATH` | `helper-font-ext-rn/missing-path` | Style entry has no `path` field (native extensions require local files) |
| `LOAD_FAILED` | `helper-font-ext-rn/load-failed` | One or more fonts failed (when `FAIL_ON_ERROR` is true) |
