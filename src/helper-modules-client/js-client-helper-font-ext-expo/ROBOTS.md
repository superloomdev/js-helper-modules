# ROBOTS.md - AI Agent Reference

> Compact reference for code generation. For human docs see README.md

## Type

Class H extension of `js-client-helper-font`. Expo font loader adapter. Uses `expo-font` (direct dependency) to load fonts via `loadAsync`. No React imports, no hooks, no components.

## Peer Dependencies

| Injection Name | Package | Alias |
|---|---|---|
| `Utils` | `@superloomdev/js-helper-utils` | `helper-utils` |
| `Debug` | `@superloomdev/js-helper-debug` | `helper-debug` |
| `Font` | `@superloomdev/js-client-helper-font` | `helper-font` |

## Direct Dependencies

| Package | Usage |
|---|---|
| `expo-font` | Required at module scope; calls `loadAsync(fontDescriptor, source)` |

## Companion Files

- `extension.config.js` - keys: `FAIL_ON_ERROR` (default `false`)
- `extension.errors.js` - constants: `INVALID_MANIFEST`, `FONT_CORE_UNAVAILABLE`, `MISSING_SOURCE`, `LOAD_FAILED`
- `extension.validators.js` - functions: `validateConfig(CONFIG)`, `validateManifest(manifest)`, `validateStyleEntry(entry)`

## Loader Pattern

```javascript
const ExpoFontAdapter = require('@superloomdev/js-client-helper-font-ext-expo')({
  Utils: Utils,
  Debug: Debug,
  Font: Font                  // required - the js-client-helper-font instance
});
```

Missing `shared_libs.Font` throws at construction time. The `expo-font` package is required directly at module scope — no injection needed.

## Config Keys

| Key | Type | Default | Required |
|---|---|---|---|
| `FAIL_ON_ERROR` | boolean | `false` | No |

## Exported Functions (5 total)

```
loadManifest(manifest) -> Promise<{ success, error }> | async:yes
  Iterates the manifest, resolves the best source per entry
  (asset > url > path), calls expo-font loadAsync for each.
  manifest is the output of Font.getManifest().

isReady() -> { success, ready, error } | async:no
  Returns whether all fonts have been loaded.

isFamilyLoaded(familyName) -> { success, loaded, error } | async:no
  Checks whether a specific font family has been loaded by this adapter.
  Used for incremental loading to skip already-loaded families.

getLoadedCount() -> { success, count, error } | async:no
  Returns the count of successfully loaded fonts.

getFailedCount() -> { success, count, error } | async:no
  Returns the count of fonts that failed to load.
```

## Patterns

- **Factory-per-loader**: each loader call returns an independent instance
- **Direct dependency**: `expo-font` is required at module scope, not injected by the app
- **Multi-source resolution**: asset (native) > url (web) > path (native fallback)
- **No React, no hooks, no components**: the expo-font package is the only Expo-bound dependency
- **Parallel loading**: all fonts load via `Promise.allSettled`; failures are tallied, not thrown (unless `FAIL_ON_ERROR` is true)

## Error Catalog

| Constant | Type | Trigger |
|---|---|---|
| `INVALID_MANIFEST` | `helper-font-ext-expo/invalid-manifest` | Manifest is not a plain object |
| `FONT_CORE_UNAVAILABLE` | `helper-font-ext-expo/font-core-unavailable` | Font core not injected |
| `MISSING_SOURCE` | `helper-font-ext-expo/missing-source` | Style entry has no `asset`, `path`, or `url` |
| `LOAD_FAILED` | `helper-font-ext-expo/load-failed` | One or more fonts failed to load (when `FAIL_ON_ERROR` is true) |
