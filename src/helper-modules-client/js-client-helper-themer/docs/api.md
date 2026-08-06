# API Reference

Every exported function of `helper-themer`, its arguments, and its return shape. For the validated contracts see [Schemas](schemas.md). For authoring a template see [Template Reference](template.md).

## Loader

```javascript
const Themer = require('@superloomdev/js-client-helper-themer')(shared_libs, config);
```

### Parameters

| Parameter | Type | Description |
|---|---|---|
| `shared_libs` | `Object` | Lib container with Utils and Debug |
| `config` | `Object` | Configuration overrides (optional) |

Each loader call returns an independent instance with its own result cache. A host that renders one theme makes one instance and keeps it.

## Getting Started

The common case is one call at startup:

```javascript
const theme = Themer.buildTheme(template, layers, 'web');

theme.tokens.spacing03;
// '1rem'
```

`buildTheme` is synchronous and does no I/O, so the theme is ready in the same tick and rendering never waits on it.

## The Main Functions

### `buildTheme(template, layers, platform, options)`

Derives a theme and emits it for one platform. Runs `resolve` then `emit`, and carries the derivation reports through.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `template` | `Object` | Yes | The template to derive from |
| `layers` | `Object[]` | Yes | Ordered sparse overlays |
| `platform` | `String` | Yes | `'web'` or `'native'` |
| `options` | `Object` | No | Per-call overrides |

```javascript
const theme = Themer.buildTheme(carbonTemplate, [
  { name: 'brand', tokens: { brand: '#0f62fe' } },
  { name: 'dark', polarity: 'dark' }
], 'native');

theme.tokens.spacing03;    // 16
theme.tokens.code01;       // { fontSize: 12, lineHeight: 16, ... }
theme.substituted;         // tokens replaced by a platform fallback
theme.lossy;               // facts the projection could not carry
theme.corrections;         // contrast rewrites that were applied
```

### `resolve(template, layers, options)`

Derives a platform-independent token map. Use this directly when emitting for both platforms from one derivation, or when inspecting a theme without rendering it.

```javascript
const resolved = Themer.resolve(carbonTemplate, layers);

resolved.tokens.spacing03;      // 16, canonical and unit-free
resolved.stats.route;           // { literal: 4, alias: 1, rule: 3, ... }
resolved.violations;            // contrast failures that were found
```

Resolution is cached per instance. Calling again with equal layer content returns the same object, which is what makes a React provider's freshly built array cheap.

### `emit(resolved, template, platform)`

Projects a resolved token map onto one platform. Both platforms emit the same token keys.

```javascript
const resolved = Themer.resolve(carbonTemplate, layers);

const web = Themer.emit(resolved, carbonTemplate, 'web');
const native = Themer.emit(resolved, carbonTemplate, 'native');

web.tokens.spacing03;      // '1rem'
native.tokens.spacing03;   // 16
```

A token the platform cannot carry takes its declared fallback and is named in `substituted`. A fact the projection cannot represent is named in `lossy`:

```javascript
native.lossy;
// [{ token: 'cardShadow', fact: 'layers', reason: 'React Native supports one shadow, ...' }]
```

### `validateTemplate(template)`

Checks a template's structural shape without deriving from it. **This is the one function here that reports instead of throwing**, because it exists to be called before resolution, and both of its callers want every problem at once.

```javascript
Themer.validateTemplate(carbonTemplate);
// { success: true, errors: [] }

Themer.validateTemplate({ tokens: 'oops', meta: 'oops' });
// {
//   success: false,
//   errors: [
//     '[helper-themer] template.tokens must be a plain object',
//     '[helper-themer] template.meta must be a plain object'
//   ]
// }
```

Use it at build time to fail a theme package, or in the layer that accepts a theme document from a server. Raising the first finding would turn checking a package into a five-round guessing game, which is why this surface differs from every other one in the module.

Resolution still throws. By the time a template reaches `resolve` it has been checked, so a malformed one is a caller bug rather than a document under review.

## Inspection

### `platforms()`

Lists the platforms this engine emits for.

```javascript
Themer.platforms();
// ['web', 'native']
```

Returns a copy, so a caller cannot mutate the engine's own list.

### `cacheStats()`

Reports this instance's cache counters.

```javascript
Themer.cacheStats();
// { hits: 12, misses: 3, evictions: 0, size: 3 }
```

### `clearCache()`

Drops every cached result and resets the counters. Returns nothing.

```javascript
Themer.clearCache();
```

## Failure Behavior

Every failure throws `TypeError`, with `validateTemplate` as the single deliberate exception described above. There is no `{ success, error }` **operational** envelope anywhere in this module, because a pure engine has no operational failures to report. The full reasoning is in [Philosophy](philosophy.md); the message format and the complete list are in [Schemas](schemas.md).

```javascript
Themer.emit(resolved, template, 'android');
// TypeError: [helper-themer] platform must be one of: web, native
```

## What This Module Does Not Do

It does not load fonts, fetch themes, read the DOM, or touch React. A type set carries a font family **token** that this engine passes through untranslated; resolving that token to a real family name and loading the file belong to `helper-font`. The two modules do not depend on each other, and theming never waits on a font. See [Philosophy](philosophy.md).
