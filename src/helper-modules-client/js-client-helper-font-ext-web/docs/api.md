# API Reference

## Loader

```javascript
import fontExtWeb from '@superloomdev/js-client-helper-font-ext-web';

const WebFontAdapter = fontExtWeb(shared_libs, config);
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

Async. Builds `@font-face` CSS strings via the core for entries that have a `url` field, creates a `<style>` node, and appends it to the DOM. Entries with only `path` or `asset` (native/Expo-only) are silently skipped. Overlapping calls on one adapter instance execute in FIFO order; styles within each manifest still load concurrently. Incremental loading operates at the style level: already-loaded styles are skipped, while a later weight for an already-loaded family is still requested. The family name is escaped for the `document.fonts.load()` descriptor so names containing double quotes cannot corrupt the descriptor string.

```javascript
const { success, error } = await WebFontAdapter.loadManifest(Font.getManifest().manifest);
```

### isReady()

Returns true only when every requested web face completed successfully. Starting an incremental or queued load clears readiness until every accepted cycle settles. `document.fonts.load` must exist and return at least one matching face; style injection alone, an absent API, or an empty result is not readiness. Partial failures retain CSS and loaded state only for successful families, while rejected families remain retryable. `clearManifest` removes style nodes retained across all incremental cycles.

```javascript
const ready = WebFontAdapter.isReady();
```

### isFamilyLoaded(familyName)

Checks whether a specific font family has been loaded by this adapter. Used for incremental loading to skip already-loaded families. A family is loaded only when every style seen so far completed successfully; a later style failure removes the family from the loaded set.

```javascript
const loaded = WebFontAdapter.isFamilyLoaded('Poppins');
```

### clearManifest()

Removes the injected `<style>` node from the DOM and resets loaded state.

```javascript
WebFontAdapter.clearManifest();
```

## Error Catalog

| Constant | Type | Trigger |
|---|---|---|
| `DOCUMENT_UNAVAILABLE` | `helper-font-ext-web/document-unavailable` | No document object available |
| `LOAD_FAILED` | `helper-font-ext-web/load-failed` | One or more requested font faces did not load (rejection, empty result, or missing FontFaceSet API) |
| `INVALID_MANIFEST` | `helper-font-ext-web/invalid-manifest` | Manifest is not a plain object |
| `FONT_CORE_UNAVAILABLE` | `helper-font-ext-web/font-core-unavailable` | Font core not injected |
| `MISSING_URL` | `helper-font-ext-web/missing-url` | Style entry has no `url` field (used internally; entries are skipped, not errored) |
