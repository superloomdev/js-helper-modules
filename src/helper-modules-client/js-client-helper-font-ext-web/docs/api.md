# API Reference

## Loader

```javascript
const WebFontAdapter = require('@superloomdev/js-client-helper-font-ext-web')(shared_libs, config);
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
| `Document` | DOM | Injected for testing; falls back to global `document` |

## Functions

### loadManifest(manifest)

Async. Builds `@font-face` CSS strings via the core for entries that have a `url` field, creates a `<style>` node, and appends it to the DOM. Entries with only `path` or `asset` (native/Expo-only) are silently skipped.

```javascript
const { success, error } = await WebFontAdapter.loadManifest(Font.getManifest().manifest);
```

### isReady()

Returns whether all fonts have been loaded.

```javascript
const { success, ready, error } = WebFontAdapter.isReady();
```

### unload()

Removes the injected `<style>` node from the DOM.

```javascript
const { success, error } = WebFontAdapter.unload();
```

## Error Catalog

| Constant | Type | Trigger |
|---|---|---|
| `DOCUMENT_UNAVAILABLE` | `helper-font-ext-web/document-unavailable` | No document object available |
| `INVALID_MANIFEST` | `helper-font-ext-web/invalid-manifest` | Manifest is not a plain object |
| `FONT_CORE_UNAVAILABLE` | `helper-font-ext-web/font-core-unavailable` | Font core not injected |
| `MISSING_URL` | `helper-font-ext-web/missing-url` | Style entry has no `url` field (used internally; entries are skipped, not errored) |
