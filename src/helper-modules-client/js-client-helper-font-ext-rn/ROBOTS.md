# ROBOTS.md - AI Agent Reference

> Compact reference for code generation. For human docs see README.md

## Type

Class H extension of `js-client-helper-font`. React Native font loader adapter. Uses `@vitrion/react-native-load-fonts` (direct dependency) to load font files natively via `loadFontFromFile`. No React imports, no hooks, no components.

## Peer Dependencies

| Injection Name | Package | Alias |
|---|---|---|
| `Utils` | `@superloomdev/js-helper-utils` | `helper-utils` |
| `Debug` | `@superloomdev/js-helper-debug` | `helper-debug` |
| `Font` | `@superloomdev/js-client-helper-font` | `helper-font` |

## Direct Dependencies

| Package | Usage |
|---|---|
| `@vitrion/react-native-load-fonts` | Required at module scope; calls `loadFontFromFile(name, filePath)` |

## Companion Files

- `extension.config.js` - keys: `FAIL_ON_ERROR` (default `false`)
- `extension.errors.js` - constants: `INVALID_MANIFEST`, `FONT_CORE_UNAVAILABLE`, `MISSING_PATH`, `LOAD_FAILED`
- `extension.validators.js` - functions: `validateConfig(CONFIG)`, `validateManifest(manifest)`, `validateStyleEntry(entry)`

## Loader Pattern

```javascript
import fontExtRn from '@superloomdev/js-client-helper-font-ext-rn';

const RNFontAdapter = fontExtRn({
  Utils: Utils,
  Debug: Debug,
  Font: Font                  // required - the js-client-helper-font instance
});
```

Missing `shared_libs.Font` throws at construction time. The native loader (`@vitrion/react-native-load-fonts`) is imported directly at module scope via `import * as` - no injection needed.

## Config Keys

| Key | Type | Default | Required |
|---|---|---|---|
| `FAIL_ON_ERROR` | boolean | `false` | No |

## Exported Functions (5 total)

```
loadManifest(manifest) -> Promise<{ success, error }> | async:yes
  Iterates the manifest, validates each style entry has a `path`,
  calls loadFontFromFile(name, path) for each. manifest is the
  output of Font.getManifest().

isReady() -> Boolean | async:no
  Returns whether all fonts have been loaded.

isFamilyLoaded(familyName) -> Boolean | async:no
  Checks whether a specific font family has been loaded by this adapter.
  Used for incremental loading to skip already-loaded families.

getLoadedCount() -> { success, count, error } | async:no
  Returns the count of successfully loaded fonts.

getFailedCount() -> { success, count, error } | async:no
  Returns the count of fonts that failed to load.
```

## Patterns

- **Factory-per-loader**: each loader call returns an independent instance
- **Direct dependency**: `@vitrion/react-native-load-fonts` is required at module scope, not injected by the app
- **Path-based loading**: uses `loadFontFromFile(name, filePath)` with local file paths from the manifest's `path` field
- **No React, no hooks, no components**: the loader package is the only RN-bound dependency
- **Parallel loading**: all font files load via `Promise.allSettled`; failures are tallied, not thrown (unless `FAIL_ON_ERROR` is true)

## Error Catalog

| Constant | Type | Trigger |
|---|---|---|
| `INVALID_MANIFEST` | `helper-font-ext-rn/invalid-manifest` | Manifest is not a plain object |
| `FONT_CORE_UNAVAILABLE` | `helper-font-ext-rn/font-core-unavailable` | Font core not injected |
| `MISSING_PATH` | `helper-font-ext-rn/missing-path` | Style entry has no `path` field |
| `LOAD_FAILED` | `helper-font-ext-rn/load-failed` | One or more fonts failed to load (when `FAIL_ON_ERROR` is true) |
