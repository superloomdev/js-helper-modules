# ROBOTS.md - AI Agent Reference

> Compact reference for code generation. For human docs see README.md

## File Naming Convention

**Extension modules** follow the same pattern as adapters and stores:
- `extension.js` — Main entry point (like `adapter.js`, `store.js`)
- Consistent with: `styler.js` (core), `extension.js` (React bindings)

## Module Identity

- **Name**: `@superloomdev/js-client-helper-styler-ext-react-native-web`
- **Class**: Extension (consumes core styler)
- **Pattern**: Stateless singleton
- **Runtime**: React 18+, React Native, React Native Web
- **Peer Dependencies**: `react`, `js-client-helper-styler`, `js-helper-utils`, `js-helper-debug`

## Loader

```javascript
const Extension = require('@superloomdev/js-client-helper-styler-ext-react-native-web')({
  React: required,      // React 18+ (createContext, useState, useContext)
  Styler: optional,     // Core styler engine (if not provided, loads default)
  Utils: optional,      // Type checks, validation
  Debug: optional       // Logging
});
```

## Public Interface

| Export | Type | Purpose |
|--------|------|---------|
| `ThemeProvider` | Component | Wraps app, provides theme context |
| `useTheme` | Hook | Reads current theme |
| `useStyles` | Hook | Generates atomic style objects for current theme |
| `useThemeController` | Hook | Returns `{ theme, styles, updateTheme }` |
| `ThemeContext` | Context | Direct React context access (advanced) |

## Critical Behaviors

1. **ThemeProvider creates context once** — singleton pattern ensures one theme context per app
2. **useStyles memoizes** — returns stable style objects, safe for React props
3. **updateTheme triggers re-render** — all useTheme/useStyles consumers update
4. **Base + variant supported** — ThemeProvider accepts both, merges them via Styler.extend()
5. **No runtime CSS** — Returns plain JS objects (React Native StyleSheet compatible)

## Example (Canonical)

```javascript
// App.js
const { ThemeProvider, useStyles } = Extension;

function App() {
  const base = { color: { primary: '#0D9488' }, dimension: { baseSize: 16 } };
  const darkMode = { color: { bg: '#1a1a1a' } };

  return (
    <ThemeProvider base={base} variant={darkMode}>
      <MyComponent />
    </ThemeProvider>
  );
}

// Component.js
function MyComponent() {
  const styles = useStyles();
  return <View style={styles.bg_primary} />;  // bg_primary is derived from theme
}
```

## Extension vs Core

- **Core (js-client-helper-styler)**: Pure JS, no React, works anywhere
- **This extension**: React bindings, hooks, context — bridges core to React world

## Error Handling

- Throws if React not provided at loader time
- Graceful fallback if Styler not provided (uses default template)
- No runtime errors on theme updates — always valid output
