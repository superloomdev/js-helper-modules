# API Reference

## Loader

```javascript
import fontExtExpo from '@superloomdev/js-client-helper-font-ext-expo';

const ExpoFontAdapter = fontExtExpo(shared_libs, config);
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

The extension requires `expo-font` directly at module scope. It is not injected by the app. The extension calls `loadAsync(fontDescriptor, source)` for each font entry, resolving the best source from the manifest: `asset` (native), `url` (web), or `path` (native fallback).

## Functions

### loadManifest(manifest)

Async. Iterates the manifest, resolves the best source for each entry, calls `expo-font`'s `loadAsync`, and tracks success/failure counts. Overlapping calls on one adapter instance execute in FIFO order; styles within each manifest still load concurrently, and families completed by an earlier call are skipped by later queued calls.

Source resolution priority: `asset` > `url` > `path`.

```javascript
const { success, error } = await ExpoFontAdapter.loadManifest(Font.getManifest().manifest);
```

### isReady()

Returns true only when every requested Expo font style completed successfully. Starting an incremental or queued load clears readiness until every accepted cycle settles. A partial or strict failure leaves readiness false even when `FAIL_ON_ERROR` controls only the returned envelope.

```javascript
const ready = ExpoFontAdapter.isReady();
```

### isFamilyLoaded(familyName)

Checks whether a specific font family has been loaded by this adapter. Used for incremental loading to skip already-loaded families.

```javascript
const loaded = ExpoFontAdapter.isFamilyLoaded('Poppins');
```

### getLoadedCount()

Returns the count of successfully loaded fonts.

```javascript
const { success, count, error } = ExpoFontAdapter.getLoadedCount();
```

### getFailedCount()

Returns the count of fonts that failed to load.

```javascript
const { success, count, error } = ExpoFontAdapter.getFailedCount();
```

## Error Catalog

| Constant | Type | Trigger |
|---|---|---|
| `INVALID_MANIFEST` | `helper-font-ext-expo/invalid-manifest` | Manifest is not a plain object |
| `FONT_CORE_UNAVAILABLE` | `helper-font-ext-expo/font-core-unavailable` | Font core not injected |
| `MISSING_SOURCE` | `helper-font-ext-expo/missing-source` | Style entry has no `asset`, `path`, or `url` |
| `LOAD_FAILED` | `helper-font-ext-expo/load-failed` | One or more fonts failed (when `FAIL_ON_ERROR` is true) |
