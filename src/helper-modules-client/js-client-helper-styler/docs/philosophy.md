# Philosophy: Why Styler Exists

Styler is built on three simple ideas that make theming flexible and portable:

---

## 1. Data Over Code

Your theme is just **JSON**. Colors, sizes, fonts — all data. No CSS variables, no SASS, no build-time magic.

This means:
- You can store themes in a database
- You can send them from a server
- You can switch themes instantly at runtime
- You can validate themes before applying them

```js
// This is a complete theme definition
const myTheme = {
  color: { primary: '#0D9488', bg: '#FFFFFF' },
  dimension: { baseSize: 16 },
  font: { primaryFamily: 'Inter' }
};
```

---

## 2. Layer Your Themes

Instead of one giant theme file, use **base + variant**:

- **Base**: Your complete fallback theme (all values present)
- **Variant**: Just the overrides (only what changed)

```js
// Base has everything
const base = { color: { primary: '#0D9488', secondary: '#64748B', ... } };

// Variant is tiny — just what's different
const variant = { color: { primary: '#FF0000' } };

// Result: secondary stays '#64748B', primary becomes '#FF0000'
```

Why this matters:
- **Server can push small updates**: "Just change the primary color"
- **Brands share a base**: 90% shared, 10% brand-specific
- **Runtime switching**: Load base once, swap variants instantly

---

## 3. Extensions, Not Built-Ins

This module is **pure JavaScript**. No React. No Vue. No Angular.

Framework bindings live in **extension modules**:
- `js-client-helper-styler-ext-react-native-web` → React hooks
- (future) `js-client-helper-styler-ext-vue` → Vue composables

The extension imports Styler. Styler doesn't know React exists.

Why?
- **Universal**: Use the same core in Node, browser, React Native
- **Lightweight**: Don't ship React code if you're using Vue
- **Testable**: Pure functions are easy to test
- **Stable**: Core never changes when frameworks update

This is the **first extension-based module** in the system — the pattern that other modules will follow.

---

## How It Actually Works

1. **Template** defines the structure: "These tokens exist, here's how to derive them"
2. **Your values** fill the template: "Primary is teal, base size is 16px"
3. **Styler** does the math: mixes colors, builds scales, calculates contrast
4. **Output** is a complete theme object with utilities

The engine never sees your UI. It just gives you data. Your UI uses that data.

---

## Fonts: The One Thing We Don't Do

Styler deals with font **identity** (names, weights) not font **files**.

We tell you: "Use 'Inter' at weight 600"

We don't: Load the `.ttf` file, register it with expo-font, or inject a Google Fonts link.

That's the **host's job**. Your app knows how it loads fonts. Styler just uses the names.

(There is a helper `findUnregisteredFamilies()` to catch missing fonts before they break your UI.)
