# ROBOTS.md - helper-themer-ext-react

> Compact signature reference for AI agents. Read this before calling any function in this module.

**Module:** `@superloomdev/js-client-helper-themer-ext-react` | **Alias:** `helper-themer-ext-react` | **Class:** H (extension of Class G parent `helper-themer`) | **Runtime:** React 18+, React Native, React Native Web

## Load

```javascript
import themerExtReact from 'helper-themer-ext-react';

const Extension = themerExtReact({
  React: React,       // required, React 18+
  Themer: Lib.Themer, // required, a built themer instance
  Utils: Lib.Utils,   // optional
  Debug: Lib.Debug    // optional
});
```

Factory. Each call returns an independent instance with its own React context. The provider calls `Lib.React.useState`, so singleton is forbidden.

## Peer Dependencies

| Package | Range |
|---|---|
| `react` | `>=18.0.0` |
| `helper-themer` | `^1.0.0` |
| `helper-utils` | `^1.0.0` |
| `helper-debug` | `^1.0.0` |

## Public Interface

| Export | Kind | Contract |
|---|---|---|
| `ThemeProvider` | Component | Props: `template` (required), `layers` (required array), `platform` (required, `'web'`/`'native'`), `options` (optional), `transform` (optional function), `children`. Holds `layers` in `useState`; inside `useMemo` calls `Themer.buildTheme(template, layers, platform, options)`; if `transform` provided, calls `transform(built, layers)` and spreads return into context; provides `{ built, theme, update_layers, ...transformed }` |
| `useThemeController` | Hook | Returns full context value, or `null` outside a provider |
| `useTheme` | Hook | Returns `ctx.theme` (transform's `theme` when set, else `built.tokens`), or `null` |
| `useTokens` | Hook | Returns `ctx.built.tokens` (raw emitted map), or `null` |
| `ThemeContext` | Context | Created once per factory instance, exposed for advanced consumers |

## Context Value Shape

```javascript
{
  built: { tokens, substituted, lossy, corrections, violations, stats },
  theme: built.tokens,           // or transform's theme field
  update_layers: setLayers,      // React state setter
  ...transformed                 // spread of transform's return value
}
```

## The Transform Seam

The module knows nothing about token vocabularies, fonts, or components. The `transform` prop is the app's injection point:

```javascript
function transform(built, layers) {
  return {
    theme: bridgeTokens(built.tokens),
    components: buildComponentRegistry(built.tokens)
  };
}
```

Runs inside `useMemo`, re-computes only on theme change. Receives full `buildTheme` result, not just tokens.

## Failure Model

**Everything throws `TypeError` with `[helper-themer-ext-react]` prefix.** No operational envelope, no error catalog beyond expected-shape clauses.

| Trigger | Message |
|---|---|
| missing React | `shared_libs.React is required (inject React via the loader)` |
| missing Themer | `shared_libs.Thermer is required (inject a built Themer instance via the loader)` |
| non-object template | `template must be a plain object` |
| non-array layers | `layers must be an array of layer objects` |
| bad platform | `platform must be one of: web, native` |
| non-function transform | `transform must be a function` |

## Gotchas

- **`update_layers` is a React state setter.** Pass a new array, not a mutation of the old one
- **`useTheme` returns `null` outside a provider.** Guard against this in components that may render above the provider
- **Two factory instances do not share context.** Render both to assert isolation in tests
- **The transform runs inside `useMemo`.** It re-computes only when `template`, `layers`, `platform`, `options`, or `transform` change
- **The module owns no token names.** All vocabulary logic lives in the transform

## Testing

```bash
cd _test && npm install && npm test
```

Pure Node with `react-test-renderer`. No container, no emulator, no network.
