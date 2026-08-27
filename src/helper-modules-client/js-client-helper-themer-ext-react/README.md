# @superloomdev/js-client-helper-themer-ext-react

React extension for [js-client-helper-themer](https://github.com/superloomdev/superloom). Provides ThemeProvider, useTheme, useTokens, useThemeController, and ThemeContext. Works with React DOM, React Native, and React Native Web.

## What This Is

A thin React binding that sits between the pure themer engine and a component tree. The provider holds the layer stack as React state, derives through the engine on change, and exposes the result via context. A `transform` seam lets the app inject engine-agnostic logic (token bridging, font validation, component building) without coupling the module to any vocabulary.

## Why

- **One derivation, one context.** The provider calls `buildTheme` inside `useMemo`, so the theme is derived once per change and every consumer reads the same object
- **Live re-derive.** `update_layers` with a new array re-derives and re-renders, so dark mode, density, and tenant brand are live layer swaps
- **Factory isolation.** Each loader call creates its own React context, so two apps or two test cases never share state
- **The transform seam.** The module owns the plumbing; the app owns the vocabulary. Token bridging, font validation, and component building stay in the app

## Hot-Swappable

Swap the entire theme by calling `update_layers` with a new layer stack. The provider re-derives synchronously and every consumer updates in the same render pass.

## Aligned with Superloom

- Receives React and a built themer instance via dependency injection, never imports them directly
- Factory pattern: each loader call returns an independent instance with its own context
- Peer dependencies declare the full runtime contract with caret ranges
- No runtime dependencies outside the framework

## Installation

The module is published to GitHub Packages under the `@superloomdev` scope. A project adds it as a peer dependency through its own loader.

Registry setup: see [npmrc setup](https://github.com/superloomdev/superloom/blob/main/docs/dev/npmrc-setup.md).

```json
{
  "peerDependencies": {
    "helper-themer-ext-react": "npm:@superloomdev/js-client-helper-themer-ext-react@^1.0.0"
  }
}
```

## Quick Start

```javascript
import React from 'react';
import themer from 'helper-themer';
import themerExtReact from 'helper-themer-ext-react';

const Themer = themer(Lib, {});
const Extension = themerExtReact({
  React: React,
  Themer: Themer,
  Utils: Lib.Utils,
  Debug: Lib.Debug
});

const { ThemeProvider, useTheme } = Extension;

function App() {
  return React.createElement(ThemeProvider, {
    template: carbonTemplate,
    layers: [{ name: 'base' }, { name: 'dark', polarity: 'dark' }],
    platform: 'native'
  }, React.createElement(MyComponent));
}

function MyComponent() {
  const theme = useTheme();
  return React.createElement('View', { style: { backgroundColor: theme.background } });
}
```

## The Transform Seam

```javascript
function transform(built, layers) {
  return {
    theme: bridgeTokens(built.tokens),
    components: buildComponentRegistry(built.tokens)
  };
}

React.createElement(ThemeProvider, {
  template: carbonTemplate,
  layers: layers,
  platform: 'native',
  transform: transform
}, children);
```

When `transform` sets `theme`, `useTheme` returns it instead of the raw emitted tokens. `useTokens` always returns the raw map.

## Peer Dependencies

| Package | Range |
|---|---|
| `react` | `>=18.0.0` |
| `helper-themer` | `^1.0.0` |
| `helper-utils` | `^1.0.0` |
| `helper-debug` | `^1.0.0` |

## Extended Documentation

- [API Reference](docs/api.md) - every export, its arguments, and its return shape
- [Philosophy](docs/philosophy.md) - the extension pattern, the transform seam, why factory not singleton

## Testing Status

| Tier | Status | What it covers |
|---|---|---|
| Emulated | Passing | Provider renders, hooks read context, transform seam, isolation, loader validation. Pure Node with react-test-renderer |
| Integration | Not applicable | The module performs no I/O |

```bash
cd _test && npm install && npm test
```

## License

MIT
