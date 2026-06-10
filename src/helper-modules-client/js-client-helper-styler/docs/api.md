# API Reference

Here's everything you can do with Styler. Each function is explained with examples in plain English.

---

## Getting Started

First, load the module:

```js
const Styler = require('@superloomdev/js-client-helper-styler')({});
```

The `{}` is the `Lib` container — you can pass `Lib.Debug` if you want logging, but it's optional.

---

## The Main Functions

### `Styler.assemble(template, base, variant)`

**This is the function you'll use most.**

It merges your base theme with variant overrides, then runs it through the template to produce a complete theme.

```js
const base = {
  color: { primary: '#0D9488', bg: '#FFFFFF' },
  dimension: { baseSize: 16, unit: 8 },
  font: { primaryFamily: 'Inter' }
};

const variant = { color: { primary: '#FF0000' } };

const theme = Styler.assemble(Styler.defaultTemplate, base, variant);

// Result: { Color, Dimension, Font }
theme.Color.APP_PRIMARY;      // '#FF0000' (from variant)
theme.Color.TEXT_ON_PRIMARY;  // auto-calculated for contrast
theme.Dimension.fontSize.sm;  // 12.8 (calculated from your values)
```

**Why this is useful:** One call gives you everything. No need to call `extend` then `derive` separately.

---

### `Styler.extend(base, variant)`

Just merges two theme value objects. The variant wins when there's a conflict.

```js
const base = { color: { primary: '#0D9488', secondary: '#64748B' } };
const variant = { color: { primary: '#FF0000' } };

const merged = Styler.extend(base, variant);
// Result: { color: { primary: '#FF0000', secondary: '#64748B' } }
```

**When to use this:** When you want to merge themes manually before passing to `derive()`.

---

### `Styler.derive(template, values)`

Turns a template + values into a complete theme. Doesn't do any merging — you give it one set of values.

```js
const values = {
  color: { primary: '#0D9488', bg: '#FFFFFF' },
  dimension: { baseSize: 16 },
  font: { primaryFamily: 'Inter' }
};

const theme = Styler.derive(Styler.defaultTemplate, values);
```

**When to use this:** When you already have your final merged values and just want to derive the tokens.

---

### `Styler.generateUtilities(theme)`

Takes a complete theme and gives you back atomic utility styles.

```js
const theme = Styler.assemble(Styler.defaultTemplate, base, variant);
const styles = Styler.generateUtilities(theme);

// Now you have:
styles.font_size_md;         // { fontSize: 16, lineHeight: 24 }
styles.font_text_primary;    // { color: '#0D9488' }
styles.background_app_primary; // { backgroundColor: '#0D9488' }
styles.p_a_md;               // { padding: 12 } (a = all sides)
styles.m_t_lg;               // { marginTop: 16 } (t = top)
styles.br_pill;              // { borderRadius: 9999 }
```

**The naming pattern:**
- `font_size_<step>` — Font size utilities
- `font_<token>` — Text color utilities
- `background_<token>` — Background color utilities
- `p_<side>_<step>` — Padding (sides: a=all, h=horizontal, v=vertical, t=top, b=bottom, s=start, e=end)
- `m_<side>_<step>` — Margin (same side codes)
- `br_<step>` — Border radius

---

## Individual Derivers (For Advanced Use)

Sometimes you want to derive just one system instead of everything:

### `Styler.deriveColor(colorTemplate, colorValues)`

Just derives color tokens.

```js
const colorTemplate = {
  defaults: { primary: '#0D9488', bg: '#FFFFFF' },
  swatches: {
    APP_PRIMARY: { ref: 'primary' },
    TEXT_ON_PRIMARY: { operation: 'contrast', args: ['APP_PRIMARY', 'bg', 4.5] }
  }
};

const colors = Styler.deriveColor(colorTemplate, {});
// Result: { APP_PRIMARY: '#0D9488', TEXT_ON_PRIMARY: '#FFFFFF' }
```

---

### `Styler.deriveDimension(dimTemplate, dimValues)`

Just derives dimension tokens (sizes, spacing).

```js
const dimTemplate = {
  defaults: { baseSize: 16, ratio: 1.25 },
  scales: {
    fontSize: { type: 'modular', base: 'baseSize', ratio: 'ratio', steps: ['sm', 'md', 'lg'] }
  },
  constants: ['lineHeightRatio']
};

const dims = Styler.deriveDimension(dimTemplate, {});
// Result: { fontSize: { sm: 12.8, md: 16, lg: 20 }, lineHeightRatio: undefined }
```

**Scale types:**
- `modular` — Multiplies by a ratio (good for font sizes)
- `linear` — Adds a unit repeatedly (good for spacing)

---

### `Styler.deriveFont(fontTemplate, fontValues)`

Just derives font tokens.

```js
const fontTemplate = {
  defaults: {},
  roles: ['primary', 'secondary']
};

const fonts = Styler.deriveFont(fontTemplate, {
  primaryFamily: 'Inter',
  secondaryFamily: 'System'
});

// Result: { family: { primary: 'Inter', secondary: 'System' }, weight: {...} }
```

**Font family fallback:** If a role doesn't have a family, it falls back to the previous role, ultimately to 'System'.

---

## What Else Is Available

### `Styler.defaultTemplate`

The built-in template with all the default tokens and rules. Pass this to `assemble()` or `derive()`.

```js
const theme = Styler.assemble(Styler.defaultTemplate, base, variant);
```

---

## Extension Module (React)

For React integration, use the extension module instead of this one directly:

```js
const Ext = require('@superloomdev/js-client-helper-styler-ext-react-native-web')({
  React: require('react')
});

// In your component:
const theme = Ext.useTheme();      // Same as Styler.assemble() output
const styles = Ext.useStyles();    // Same as Styler.generateUtilities() output
```

The extension gives you:
- `ThemeProvider` — Wraps your app, provides theme via context
- `useTheme()` — Hook to get the current theme
- `useStyles()` — Hook to get utility styles
- `useThemeController()` — Get the theme + a function to update it

See the extension module's docs for full details.

---

## Quick Reference

| Function | What It Does |
|---|---|
| `assemble(template, base, variant)` | Merge + derive in one call |
| `extend(base, variant)` | Just merge two value objects |
| `derive(template, values)` | Derive tokens from template + values |
| `deriveColor(template, values)` | Derive just color tokens |
| `deriveDimension(template, values)` | Derive just dimension tokens |
| `deriveFont(template, values)` | Derive just font tokens |
| `generateUtilities(theme)` | Get atomic style objects |
| `defaultTemplate` | The built-in template object |
