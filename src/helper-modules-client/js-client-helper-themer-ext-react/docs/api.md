# API Reference

Every exported function of `helper-themer-ext-react`, its arguments, and its return shape. For the extension pattern see [Philosophy](philosophy.md). For the parent engine's API see [helper-themer docs](https://github.com/superloomdev/superloom/tree/main/docs/languages/js).

## Loader

```javascript
import themerExtReact from '@superloomdev/js-client-helper-themer-ext-react';

const Extension = themerExtReact({
  React: React,
  Themer: Lib.Themer,
  Utils: Lib.Utils,
  Debug: Lib.Debug
});
```

### Parameters

| Parameter | Type | Description |
|---|---|---|
| `shared_libs.React` | `Function` | React 18+ (createContext, useState, useContext, useMemo, createElement) |
| `shared_libs.Thermer` | `Object` | A built themer instance from `import themer from 'helper-themer'; themer(Lib, config)` |
| `shared_libs.Utils` | `Object` | Type-check primitives (optional) |
| `shared_libs.Debug` | `Object` | Logging (optional) |

Each loader call returns an independent instance with its own React context. A host that renders one theme makes one instance at startup and keeps it.

## The Provider

### `ThemeProvider`

Holds the layer stack as React state, derives a theme through the pure themer engine, and provides it via context.

| Prop | Type | Required | Description |
|---|---|---|---|
| `template` | `Object` | Yes | The themer template to derive from |
| `layers` | `Object[]` | Yes | Ordered sparse overlays |
| `platform` | `String` | Yes | `'web'` or `'native'` |
| `options` | `Object` | No | Per-call themer options |
| `transform` | `Function` | No | Transform seam (see below) |
| `children` | `Node` | Yes | Subtree to provide theme to |

```javascript
const { ThemeProvider } = Extension;

function App() {
  return (
    <ThemeProvider template={carbonTemplate} layers={layers} platform="native">
      <MyComponent />
    </ThemeProvider>
  );
}
```

### The `transform` Seam

The transform is the whole design. The module knows nothing about token vocabularies, fonts, or component libraries. An app that needs to reshape tokens, validate font families, or build a themed component registry does it inside `transform` and reads the result back through `useThemeController`.

```javascript
function transform(built, layers) {
  return {
    theme: bridgeTokens(built.tokens),
    components: buildComponentRegistry(built.tokens)
  };
}

<ThemeProvider
  template={carbonTemplate}
  layers={layers}
  platform="native"
  transform={transform}
>
  <MyComponent />
</ThemeProvider>
```

The transform receives the full `buildTheme` result and the current layers, and returns an object whose fields are spread into the context value. When a transform sets `theme`, `useTheme` returns it instead of the raw emitted tokens.

## The Hooks

### `useThemeController()`

Returns the full context value, or `null` outside a provider.

```javascript
const ctx = Extension.useThemeController();
// { built, theme, update_layers, ...transformed }
```

### `useTheme()`

Returns `ctx.theme` - the transform's `theme` field when a transform is set, else `built.tokens`. Returns `null` outside a provider.

```javascript
const theme = Extension.useTheme();
theme.spacing03;  // 16 on native, '1rem' on web
```

### `useTokens()`

Returns `ctx.built.tokens` - the raw emitted token map from the pure engine, before any transform. Returns `null` outside a provider.

```javascript
const tokens = Extension.useTokens();
tokens.spacing03;  // always the raw emitted value
```

## The Context

### `ThemeContext`

The React context object, created once per factory instance. Exposed for advanced consumers that need direct context access.

```javascript
const { ThemeContext } = Extension;
```

## `update_layers`

The context value carries `update_layers`, which is the React state setter for the layer stack. Calling it with a new array triggers a re-derive and re-render.

```javascript
const ctx = Extension.useThemeController();

ctx.update_layers([{ name: 'dark', polarity: 'dark' }]);
```

## Failure Behavior

Every failure throws `TypeError` with an `[helper-themer-ext-react]` prefix. There is no operational envelope because the module performs no I/O.

```javascript
Extension.ThemeProvider({ template: 'oops' });
// TypeError: [helper-themer-ext-react] template must be a plain object
```

## What This Module Does Not Do

It does not know about token vocabularies, font families, or component libraries. It does not fetch themes, load fonts, or read the DOM. All app-specific logic lives in the `transform` seam. See [Philosophy](philosophy.md).
