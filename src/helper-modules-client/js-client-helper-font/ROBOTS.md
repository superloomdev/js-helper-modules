# ROBOTS.md - AI Agent Reference

> Compact reference for code generation. For human docs see README.md

## Type

Class G pure parent. Font family registry, family-name resolution, and `@font-face` CSS string construction. Zero platform dependencies. Extensions (`-ext-web`, `-ext-rn`, `-ext-expo`) implement the adapter contract.

## Peer Dependencies

| Injection Name | Package | Alias |
|---|---|---|
| `Utils` | `@superloomdev/js-helper-utils` | `helper-utils` |
| `Debug` | `@superloomdev/js-helper-debug` | `helper-debug` |

## Direct Dependencies

None. All dependencies are peer dependencies.

## Companion Files

- `font.config.js` - keys: `DEFAULT_FAMILY` (default `'System'`), `roles` (default `{}`)
- `font.errors.js` - constants: `INVALID_MANIFEST`, `INVALID_FAMILY_NAME`, `INVALID_TOKEN`, `INVALID_URL`, `INVALID_WEIGHT`, `INVALID_STYLE`, `UNREGISTERED_FAMILY`, `MISSING_SOURCE`, `INVALID_ROLES`
- `font.validators.js` - functions: `validateConfig(CONFIG)`, `validateManifest(manifest)`, `validateFamilyName(name)`, `validateToken(token)`, `validateUrl(url)`, `validateWeight(weight)`, `validateStyle(style)`, `validateStyleEntry(entry)`, `validateRoles(roles)`

## Loader Pattern

```javascript
const Font = require('@superloomdev/js-client-helper-font')({
  Utils: Utils,
  Debug: Debug
}, {
  DEFAULT_FAMILY: 'System',
  roles: { primary: 'Poppins_400Regular' }
});
```

## Config Keys

| Key | Type | Default | Required |
|---|---|---|---|
| `DEFAULT_FAMILY` | string | `'System'` | No |
| `roles` | object | `{}` | No |

## Exported Functions (7 total)

```
registerFamilies(manifest) -> { success, error } | async:no
  Registers font families from a manifest object. Each key is a family name;
  each value has a `styles` map or a flat entry. Each style entry must have
  at least one of: url (web), path (native), asset (Expo).

registerRoles(roles) -> { success, error } | async:no
  Registers role-to-family mappings. Merges into existing role map.
  Allows resolveFamily to accept theme role tokens.

resolveFamily(token) -> { success, family, error } | async:no
  Resolves a theme token to a concrete font-family string. Lookup order:
  1. Role mapping (e.g. 'primary' -> 'Poppins_400Regular')
  2. Direct family name (e.g. 'Poppins' -> 'Poppins')
  3. DEFAULT_FAMILY fallback (e.g. 'System')

buildFontFaceString(name, url, weight, style) -> { success, css, error } | async:no
  Builds a @font-face CSS string. Pure computation; the web extension
  injects it into the DOM. weight and style are optional.

getManifest() -> { success, manifest, error } | async:no
  Returns the current manifest of registered families and their styles.
  Includes url, path, asset fields per style entry.

getRegisteredFamilies() -> { success, families, error } | async:no
  Returns the list of registered family names, including 'System'.

isRegistered(familyName) -> Boolean | async:no
  Checks whether a family name is in the registry. Returns true for any
  family added via registerFamilies plus the seeded 'System' family.
```

## Adapter Contract

Extensions (`-ext-web`, `-ext-rn`, `-ext-expo`) must export a loader function
that accepts `(shared_libs, config)` and returns an object implementing:

```
loadManifest(manifest) -> Promise<{ success, error }>
  Load all font families from the core's manifest (getManifest output).
  Each extension implements platform-specific loading:
  - ext-web: reads `url` → inject @font-face CSS strings into document.head
  - ext-rn: reads `path` → call native font loader (loadFontFromFile) for each local file
  - ext-expo: reads `asset` or `path` on native, `url` on web → call expo-font loadAsync

isReady() -> Boolean
  Check whether all registered fonts have finished loading.
```

The core builds `@font-face` strings via `buildFontFaceString`; extensions
never reconstruct them. The core's `getManifest()` output feeds the
extension's `loadManifest()`.

## Patterns

- **Singleton**: one Font per process; module-scope registry holds families, token mappings, and role mappings
- **System family seeded at construction**: 'System' is always present
- **Token = family name by default**: `registerFamilies` creates token mappings from family names
- **Role mapping**: `registerRoles` maps theme tokens to concrete family names; roles checked first in `resolveFamily`
- **Multi-source manifest**: each style entry can have `url`, `path`, and/or `asset`; at least one required
- **Graceful fallback**: `resolveFamily` returns `DEFAULT_FAMILY` for unknown tokens
- **Pure computation**: no DOM, no React, no react-native, no Expo; testable in pure Node

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
