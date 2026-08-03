# API Reference

## Loader

```javascript
const Font = require('@superloomdev/js-client-helper-font')(shared_libs, config);
```

### Parameters

| Parameter | Type | Description |
|---|---|---|
| `shared_libs` | `Object` | Lib container with Utils and Debug |
| `config` | `Object` | Configuration overrides (optional) |

## Functions

### registerFamilies(manifest)

Registers font families from a manifest object.

```javascript
Font.registerFamilies({
  Poppins: {
    styles: {
      '400': { url: 'https://fonts.gstatic.com/s/poppins/v20/pxiEyp8kv8JHgFVrJJfecm0.woff2' },
      '600': { url: 'https://fonts.gstatic.com/s/poppins/v20/pxiByp8kv8JHgFVrLEj6Z1xlFQ.woff2' }
    }
  },
  Lora: {
    url: 'https://example.com/lora-regular.ttf',
    weight: '400'
  }
});
// { success: true, error: null }
```

### resolveFamily(token)

Resolves a theme token to a concrete font-family string. Falls back to `DEFAULT_FAMILY` when the token is not registered.

```javascript
Font.resolveFamily('Poppins');
// { success: true, family: 'Poppins', error: null }

Font.resolveFamily('unknown');
// { success: true, family: 'System', error: null }
```

### buildFontFaceString(name, url, weight, style)

Builds a `@font-face` CSS string. Pure computation; the web extension injects it into the DOM.

```javascript
Font.buildFontFaceString('Poppins', 'https://fonts.gstatic.com/s/poppins/v20/pxiEyp8kv8JHgFVrJJfecm0.woff2', '400', 'normal');
// { success: true, css: "@font-face { font-family: 'Poppins'; src: url('...'); font-weight: 400; font-style: normal; }", error: null }
```

### getManifest()

Returns the current manifest of registered families and their styles.

```javascript
Font.getManifest();
// { success: true, manifest: { Poppins: { styles: { ... } } }, error: null }
```

### getRegisteredFamilies()

Returns the list of registered family names, including 'System'.

```javascript
Font.getRegisteredFamilies();
// { success: true, families: ['System', 'Poppins', 'Lora'], error: null }
```

## Adapter Contract

Extensions (`-ext-web`, `-ext-rn`, `-ext-expo`) must export a loader function
that accepts `(shared_libs, config)` and returns an object implementing:

### loadManifest(manifest)

```javascript
async function loadManifest(manifest) -> { success, error }
```

Load all font families from the core's manifest (`getManifest()` output).
Each extension implements platform-specific loading:

- **ext-web**: inject `@font-face` CSS strings (from `buildFontFaceString`) into `document.head`
- **ext-rn**: call native font loader for each family file
- **ext-expo**: call `expo-font` `loadAsync` for each family

### isReady()

```javascript
function isReady() -> { success, ready, error }
```

Check whether all registered fonts have finished loading.

## Error Catalog

| Constant | Type | Trigger |
|---|---|---|
| `INVALID_MANIFEST` | `helper-font/invalid-manifest` | Manifest is not a plain object |
| `INVALID_FAMILY_NAME` | `helper-font/invalid-family-name` | Family name is not a non-empty string |
| `INVALID_TOKEN` | `helper-font/invalid-token` | Token is not a non-empty string |
| `INVALID_URL` | `helper-font/invalid-url` | URL is not a non-empty string |
| `INVALID_WEIGHT` | `helper-font/invalid-weight` | Weight is not a string or null |
| `INVALID_STYLE` | `helper-font/invalid-style` | Style is not 'normal' or 'italic' |
| `UNREGISTERED_FAMILY` | `helper-font/unregistered-family` | Token resolves to a family not in the registry |
