# API Reference. js-client-helper-styler-ext-react-native-web

React Native Web extension for the js-client-helper-styler core.

## On this page

- [Installation](#installation)
- [Quick start](#quick-start)
- [Extension exports](#extension-exports)
- [ThemeProvider](#themeprovider)
- [Hooks](#hooks)
- [Context](#context)

---

## Installation

This extension has peer dependencies on React and the styler core:

```bash
npm install react @superloomdev/js-client-helper-styler
# Extension is used via require in this monorepo setup
```

## Quick start

```js
const React = require('react');
const StylerExt = require('@superloomdev/js-client-helper-styler-ext-react-native-web');

// Build the extension with injected React
const { ThemeProvider, useTheme, useStyles } = StylerExt({ React });

// Your base theme values
const base = {
  color: { primary: '#4F46E5', secondary: '#0D9488' },
  dimension: { unit: 8 },
  font: { primaryFamily: 'System' }
};

// App component
function App() {
  return (
    <ThemeProvider base={base} variant={{ color: { primary: '#DC2626' } }}>
      <Screen />
    </ThemeProvider>
  );
}

// Screen component
function Screen() {
  const theme = useTheme();   // { Color, Dimension, Font }
  const styles = useStyles();   // atomic utility styles
  
  return (
    <View style={{ backgroundColor: theme.Color.APP_PRIMARY }}>
      <Text style={styles.font_size_md}>Hello</Text>
    </View>
  );
}
```

---

## Extension exports

The extension is a loader function that returns React bindings:

```js
const StylerExt = require('@superloomdev/js-client-helper-styler-ext-react-native-web');
const bindings = StylerExt({ React, Styler? });
```

| Export | Type | Description |
|--------|------|-------------|
| `ThemeProvider` | Component | Wraps subtree, provides theme context |
| `useTheme()` | Hook | Returns assembled theme `{ Color, Dimension, Font }` |
| `useStyles()` | Hook | Returns utility styles object |
| `useThemeController()` | Hook | Returns full context + updateTheme function |
| `ThemeContext` | Object | Raw React context (advanced use) |

---

## ThemeProvider

```jsx
<ThemeProvider
  template={?Object}  // Optional: custom template (defaults to core template)
  base={Object}       // Required: complete base theme values
  variant={?Object}   // Optional: partial variant overrides
>
  {children}
</ThemeProvider>
```

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `base` | Object | Yes | Complete theme values `{ color, dimension, font }` |
| `variant` | Object | No | Partial overrides (applied over base) |
| `template` | Object | No | Custom template (defaults to core's default) |
| `children` | Node | Yes | Subtree to receive theme context |

### Behavior

1. Assembles theme on mount: `Styler.assemble(template, base, variant)`
2. Generates utility styles: `Styler.generateUtilities(theme)`
3. Provides both via React context
4. Re-assembles when `base`, `variant`, or `template` change

---

## Hooks

### useTheme()

Returns the assembled theme object.

```js
const theme = useTheme();
// theme = { Color: {...}, Dimension: {...}, Font: {...} }
```

Returns `null` when called outside a ThemeProvider.

### useStyles()

Returns atomic utility styles generated from the theme.

```js
const styles = useStyles();
// styles = { font_size_sm: {...}, p_a_md: {...}, background_primary: {...} }
```

Returns `null` when called outside a ThemeProvider.

### useThemeController()

Returns the full context value including update function.

```js
const controller = useThemeController();
// controller = {
//   theme,      // assembled theme
//   styles,     // utility styles
//   template,   // template used
//   base,       // base values
//   updateTheme // function(nextVariant) → re-assembles with new variant
// }
```

Use for advanced cases like theme switching:

```js
const { updateTheme } = useThemeController();

function switchToDarkMode() {
  updateTheme({ color: { isDark: true } });
}
```

---

## Context

### ThemeContext

Raw React context object for advanced use cases:

```js
const { ThemeContext } = StylerExt({ React });

// Custom consumer component
function CustomConsumer() {
  const value = React.useContext(ThemeContext);
  // ...
}
```

Most apps should use the provided hooks instead.

---

## How it works

The extension internally:

1. Imports the styler core: `require('@superloomdev/js-client-helper-styler')`
2. Calls `Styler.assemble()` with provided base + variant
3. Calls `Styler.generateUtilities()` with assembled theme
4. Wraps results in React context
5. Provides hooks to access context values

This follows the **extension pattern**: extension consumes core, not vice versa.

---

## Comparison: Core vs Extension

| Task | Core (pure JS) | Extension (React) |
|------|---------------|-------------------|
| Assemble theme | `Styler.assemble(template, base, variant)` | `<ThemeProvider base={base} variant={variant}>` |
| Access theme | `const theme = ...` (immediate) | `const theme = useTheme()` (reactive) |
| Get styles | `Styler.generateUtilities(theme)` | `const styles = useStyles()` |
| Update theme | Re-call assemble | `updateTheme(nextVariant)` (reactive) |
| Distribution | Manual prop passing | React context (automatic) |

Use the **core** for:
- SSR/Node scripts
- Non-React frameworks
- Testing (pure, no JSDOM)
- Build-time theme generation

Use the **extension** for:
- React/RNW apps
- Reactive theme switching
- Automatic context distribution
- Turnkey theming solution
