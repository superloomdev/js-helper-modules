# React Extension for Styler

Works with React DOM, React Native, and React Native Web.

This module brings the Styler theme engine into React. It gives you hooks and a provider so your components can read themes and update them dynamically.

**The extension pattern**: The core Styler is pure JavaScript with no React knowledge. This extension imports the core and adds React-specific bindings (context, hooks, lifecycle).

---

## What You Get

Three hooks and a provider:

- **`ThemeProvider`** — Wraps your app and holds the current theme
- **`useTheme()`** — Reads the theme in any component
- **`useStyles()`** — Gets atomic style objects (font sizes, colors, spacing)
- **`useThemeController()`** — Full control: read theme + change it at runtime

The core Styler handles the heavy lifting: merging base and variant themes, deriving colors, building scales. This extension just bridges that to React.

---

## Quick Start

Install the peer dependencies first:

```bash
npm install react @superloomdev/js-client-helper-styler
```

Then load the extension:

```js
const React = require('react');
const StylerExt = require('@superloomdev/js-client-helper-styler-ext-react');

// Build the extension with React injected
const { ThemeProvider, useTheme, useStyles } = StylerExt({ React });
```

Wrap your app with the provider:

```js
const base = {
  color: { primary: '#4F46E5', secondary: '#0D9488' },
  dimension: { unit: 8, baseSize: 16 },
  font: { primaryFamily: 'System' }
};

function App() {
  return (
    <ThemeProvider base={base} variant={{ color: { primary: '#DC2626' } }}>
      <Screen />
    </ThemeProvider>
  );
}
```

Use the hooks in any child component:

```js
function Screen() {
  const theme = useTheme();
  const styles = useStyles();

  return (
    <View style={{ backgroundColor: theme.Color.APP_PRIMARY }}>
      <Text style={styles.font_size_md}>Hello World</Text>
    </View>
  );
}
```

---

## How It Works

1. **ThemeProvider** receives `base` and optional `variant` props
2. It calls `Styler.assemble()` to build the full theme
3. The theme goes into a React context
4. `useTheme()` and `useStyles()` read from that context
5. `useThemeController()` also gives you `updateTheme()` to change themes at runtime

---

## Extension vs Core

| | Core Styler | This Extension |
|---|-------------|----------------|
| **What it is** | Pure JavaScript theme engine | React bindings |
| **Dependencies** | None | React 18+ |
| **Exports** | Functions (derive, assemble, etc.) | Hooks and components |
| **Where to use** | Anywhere (Node, browser, RN) | React apps only |

The extension is "boss" — it decides when to call the core, how to cache results, and when to trigger React re-renders. The core is just a library of pure functions.

---

## Testing

```bash
cd _test
npm install
npm test
```

Tests use React's test renderer to verify hooks work correctly. All tests run in Node.js — no browser needed.

---

## Files

| File | Purpose |
|------|---------|
| `extension.js` | Extension loader — creates hooks with injected React |
| `docs/api.md` | Full API reference |
| `docs/philosophy.md` | Extension pattern explained |
| `_test/` | Unit tests using React test renderer |

---

## Related

- [js-client-helper-styler](../js-client-helper-styler/) — The pure core engine
