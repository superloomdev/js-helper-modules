# @superloomdev/js-client-helper-styler

A simple way to turn JSON values into complete design themes.

Think of it like this: you give it a **template** (what tokens exist and how to make them) and a **set of values** (your colors, sizes, fonts), and it gives you back a full theme with design tokens ready to use.

The neat part? You can layer themes. Define a complete `base` theme, then send just the changes as a `variant` — perfect for server-driven theming or brand customization.

> **Want React integration?** Check out the extension module: `js-client-helper-styler-ext-react-native-web`.

---

## What This Is (In Plain English)

Styler takes three things:

1. **The Engine** (`styler.js`) — Pure JavaScript functions that do the math. Mix colors, build scales, generate utility styles. No dependencies. No React. Just logic.

2. **The Template** (`styler.template.js`) — A JSON structure that says "these are my color tokens, these are my font sizes, and here's how to derive each one."

3. **Your Values** (`base + variant`) — Your actual colors (`#0D9488`), sizes (`16px`), font names (`Inter`).

```
Template + Values → Styler → { Color, Dimension, Font }
```

The output is a complete theme object with semantic tokens like `APP_PRIMARY`, `font_size_md`, and utility styles you can drop straight into components.

---

## How to Use It

### Without Any Framework (Node, Tests, SSR)

```js
// Load the module
const Styler = require('@superloomdev/js-client-helper-styler')({});

// Your complete base theme
const base = {
  color: { primary: '#0D9488', bg: '#FFFFFF' },
  dimension: { baseSize: 16, unit: 8, ratio: 1.25 },
  font: { primaryFamily: 'Inter' }
};

// Just a few overrides
const variant = { color: { primary: '#FF0000' } };

// Assemble the full theme
const theme = Styler.assemble(Styler.defaultTemplate, base, variant);

// Get utility styles
const styles = Styler.generateUtilities(theme);

// Use it
theme.Color.APP_PRIMARY;     // '#FF0000' (variant won)
theme.Color.TEXT_ON_PRIMARY; // auto-calculated contrast color
styles.p_a_md;               // { padding: 12 }
```

### With React / React Native Web

Use the extension module:

```js
const Ext = require('@superloomdev/js-client-helper-styler-ext-react-native-web')({
  React: require('react')
});

function App() {
  return (
    <Ext.ThemeProvider base={base} variant={variant}>
      <Screen />
    </Ext.ThemeProvider>
  );
}

function Screen() {
  const theme = Ext.useTheme();   // The full theme object
  const styles = Ext.useStyles(); // Utility styles map
  // theme.Color.APP_PRIMARY, styles.font_size_md, etc.
}
```

You can even update the theme live: `useThemeController().updateTheme(newVariant)`

---

## What's Inside

| File | What It Does |
|---|---|
| `styler.js` | **Main entry point.** The functions you'll actually call: `assemble`, `derive`, `extend`, `generateUtilities`. |
| `parts/color-ops.js` | Color math: mix, lighten, darken, contrast calculations. |
| `parts/scale.js` | Build modular (ratio-based) or linear scales. |
| `parts/utilities.js` | Turn a theme into atomic utility styles. |
| `styler.template.js` | The default template with all tokens and rules. |
| `styler.config.js` | Default configuration. |
| `styler.errors.js` | Error codes and messages. |

---

## Extensions

This is the **first extension-based module** in the system. Here's how it works:

- **This core module** (`js-client-helper-styler`) is pure JavaScript. No React, no framework-specific code.
- **Extension modules** add framework bindings — React hooks, Vue composables, Angular services.
- The extension **imports** Styler. Styler never knows about React.

This pattern keeps the core tiny and universal while letting each framework have its own idiomatic wrapper.

---

## Fonts: A Quick Note

Styler only deals with font **names** and **weights** — it says "use Inter at weight 600". 

Actually **loading** the font files (via `expo-font`, Google Fonts, or your bundler) is up to your app. If your theme says "Inter", you need to make sure "Inter" is actually loaded.

There's a helper for this: `validators.findUnregisteredFamilies(theme, registered)` tells you which fonts you're missing.

---

## Want More?

- **[API Reference](./docs/api.md)** — Every function explained with examples
- **[Template Guide](./docs/template.md)** — How templates work and how to customize them
- **[Philosophy](./docs/philosophy.md)** — Why it's built this way

---

## Running the Tests

```bash
cd _test
npm test
```

Pure JavaScript, no framework needed.
