# API Reference

## Loader

```javascript
import font from '@superloomdev/js-client-helper-font';

const Font = font(shared_libs, config);
```

### Parameters

| Parameter | Type | Description |
|---|---|---|
| `shared_libs` | `Object` | Lib container with Utils and Debug |
| `config` | `Object` | Configuration overrides (optional) |

## Manifest Schema

Each family in the manifest is keyed by family name. Each style entry must have at least one source field:

| Field | Type | Used by | Description |
|---|---|---|---|
| `url` | `string` | ext-web | Remote URL for `@font-face` (browser fetches) |
| `path` | `string` | ext-rn | Local file path (app provides the file) |
| `asset` | `number` | ext-expo | Requireable module ID from Metro's `require()` |
| `weight` | `string` | All | Font weight ('400', '600', etc.) - optional |
| `style` | `string` | All | Font style ('normal' or 'italic') - optional, default 'normal' |

```javascript
// Styles map (multiple weights)
{
  Poppins: {
    styles: {
      '400': { url: 'https://fonts.gstatic.com/.../poppins-400.woff2', path: '/app/fonts/poppins-400.ttf' },
      '600': { url: 'https://fonts.gstatic.com/.../poppins-600.woff2', path: '/app/fonts/poppins-600.ttf' }
    }
  }
}

// Flat entry (single weight)
{
  Lora: {
    url: 'https://example.com/lora-regular.ttf',
    path: '/app/fonts/lora-regular.ttf',
    weight: '400'
  }
}

// Expo asset (requireable)
{
  Inter: {
    styles: {
      // Metro asset require - returns numeric module ID, not CJS require
      '400': { asset: require('./assets/inter-400.ttf') }
    }
  }
}
```

## Functions

### registerFamilies(manifest)

Registers font families from a manifest object. Each style entry must have at least one of `url`, `path`, or `asset`.

```javascript
Font.registerFamilies({
  Poppins: {
    styles: {
      '400': { url: 'https://fonts.gstatic.com/.../poppins-400.woff2', path: '/app/fonts/poppins-400.ttf' },
      '600': { url: 'https://fonts.gstatic.com/.../poppins-600.woff2', path: '/app/fonts/poppins-600.ttf' }
    }
  }
});
// { success: true, error: null }
```

### registerRoles(roles)

Registers role-to-family mappings. Merges into the existing role map. Allows `resolveFamily` to accept theme role tokens like `'primary'` and resolve them to concrete family names.

```javascript
Font.registerRoles({
  primary: 'Poppins_400Regular',
  secondary: 'Poppins_600SemiBold'
});
// { success: true, error: null }
```

### resolveFamily(token)

Resolves a theme token to a concrete font-family string. Lookup order:

1. **Role mapping** - if the token matches a registered role (e.g. `'primary'` → `'Poppins_400Regular'`)
2. **Direct family name** - if the token matches a registered family (e.g. `'Poppins'` → `'Poppins'`)
3. **DEFAULT_FAMILY fallback** - falls back to `'System'`

```javascript
Font.resolveFamily('primary');
// { success: true, family: 'Poppins_400Regular', error: null }

Font.resolveFamily('Poppins');
// { success: true, family: 'Poppins', error: null }

Font.resolveFamily('unknown');
// { success: true, family: 'System', error: null }
```

### buildFontFaceString(name, url, weight, style)

Builds a `@font-face` CSS string. Pure computation; the web extension injects it into the DOM.

```javascript
Font.buildFontFaceString('Poppins', 'https://fonts.gstatic.com/.../poppins-400.woff2', '400', 'normal');
// { success: true, css: "@font-face { font-family: 'Poppins'; src: url('...'); font-weight: 400; font-style: normal; }", error: null }
```

### getManifest()

Returns the current manifest of registered families and their styles. Includes all source fields (`url`, `path`, `asset`) that were present at registration.

```javascript
Font.getManifest();
// { success: true, manifest: { Poppins: { styles: { '400': { url: '...', path: '...', asset: null, weight: '400', style: 'normal' } } } }, error: null }
```

### getRegisteredFamilies()

Returns the list of registered family names, including 'System'.

```javascript
Font.getRegisteredFamilies();
// { success: true, families: ['System', 'Poppins', 'Lora'], error: null }
```

### isRegistered(familyName)

Checks whether a family name is in the registry. Returns `true` for any family added via `registerFamilies` plus the seeded 'System' family. Throws `TypeError` if `familyName` is not a non-empty string.

```javascript
Font.isRegistered('Poppins');
// true

Font.isRegistered('Unknown');
// false
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

- **ext-web**: reads `url` → inject `@font-face` CSS strings (from `buildFontFaceString`) into `document.head`
- **ext-rn**: reads `path` → call native font loader (`loadFontFromFile`) for each local file
- **ext-expo**: reads `asset` or `path` on native, `url` on web → call `expo-font` `loadAsync`

### isReady()

```javascript
function isReady() -> Boolean
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
| `MISSING_SOURCE` | `helper-font/missing-source` | Style entry has no `url`, `path`, or `asset` |
| `INVALID_ROLES` | `helper-font/invalid-roles` | Roles is not a plain object |
