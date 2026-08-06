# ROBOTS.md - AI Agent Reference

> Compact reference for code generation. For human docs see README.md

## Type

Class H extension of `js-client-helper-font`. Web DOM font loader adapter. Gets `@font-face` CSS strings from the core, creates a `<style>` node, and appends it to `document.head`.

## Peer Dependencies

| Injection Name | Package | Alias |
|---|---|---|
| `Utils` | `@superloomdev/js-helper-utils` | `helper-utils` |
| `Debug` | `@superloomdev/js-helper-debug` | `helper-debug` |
| `Font` | `@superloomdev/js-client-helper-font` | `helper-font` |

## Direct Dependencies

None. All dependencies are peer dependencies.

## Companion Files

- `extension.config.js` - keys: `PARENT_SELECTOR` (default `'head'`)
- `extension.errors.js` - constants: `DOCUMENT_UNAVAILABLE`, `INVALID_MANIFEST`, `FONT_CORE_UNAVAILABLE`, `MISSING_URL`
- `extension.validators.js` - functions: `validateConfig(CONFIG)`, `validateManifest(manifest)`, `validateStyleEntry(entry)`

## Loader Pattern

```javascript
const WebFontAdapter = require('@superloomdev/js-client-helper-font-ext-web')({
  Utils: Utils,
  Debug: Debug,
  Font: Font,         // required - the js-client-helper-font instance
  Document: document   // optional - injected for testing; falls back to global document
});
```

Missing `shared_libs.Font` throws at construction time.

## Config Keys

| Key | Type | Default | Required |
|---|---|---|---|
| `PARENT_SELECTOR` | string | `'head'` | No |

## Exported Functions (3 total)

```
loadManifest(manifest) -> Promise<{ success, error }> | async:yes
  Builds @font-face CSS strings via Font.buildFontFaceString for entries
  with a url field, creates a <style> node, and appends it to the DOM.
  Entries with only path or asset (native/Expo-only) are silently skipped.
  manifest is the output of Font.getManifest().

isReady() -> { success, ready, error } | async:no
  Returns whether all fonts have been loaded (style node injected).

unload() -> { success, error } | async:no
  Removes the injected <style> node from the DOM. Useful for hot reload or cleanup.
```

## Patterns

- **Factory-per-loader**: each loader call returns an independent instance
- **Core builds, extension injects**: `@font-face` strings come from `Font.buildFontFaceString`, never rebuilt locally
- **URL-only filtering**: entries without `url` (native/Expo-only) are silently skipped
- **Document injection**: `shared_libs.Document` for testing; falls back to global `document`
- **No React, no react-native**: pure DOM manipulation

## Error Catalog

| Constant | Type | Trigger |
|---|---|---|
| `DOCUMENT_UNAVAILABLE` | `helper-font-ext-web/document-unavailable` | No document object available |
| `INVALID_MANIFEST` | `helper-font-ext-web/invalid-manifest` | Manifest is not a plain object |
| `FONT_CORE_UNAVAILABLE` | `helper-font-ext-web/font-core-unavailable` | Font core not injected |
| `MISSING_URL` | `helper-font-ext-web/missing-url` | Style entry has no `url` field (entries skipped, not errored) |
