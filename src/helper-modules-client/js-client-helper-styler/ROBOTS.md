# ROBOTS.md - AI Agent Reference

> Compact reference for code generation. For human docs see README.md and docs/api.md

## Module Identity

- **Name**: `@superloomdev/js-client-helper-styler`
- **Class**: A (Foundation Utility) - Client variant
- **Pattern**: Stateless singleton
- **Runtime**: Universal (Node, browser, React Native)
- **Dependencies**: Peer deps `@superloomdev/js-helper-utils`, `@superloomdev/js-helper-debug`

## Loader

```javascript
const Styler = require('@superloomdev/js-client-helper-styler')({
  Utils: optional,    // Type checks, validation
  Debug: optional     // Logging (debug level assembly summary)
});
```

## Public Interface

| Function | Signature | Returns |
|----------|-----------|---------|
| `assemble` | `(template, base, variant)` | `{ Color, Dimension, Font }` |
| `extend` | `(base, variant)` | Merged values object |
| `derive` | `(template, values)` | `{ Color, Dimension, Font }` |
| `deriveColor` | `(colorTemplate, colorValues)` | Color token map |
| `deriveDimension` | `(dimTemplate, dimValues)` | Dimension object |
| `deriveFont` | `(fontTemplate, fontValues)` | `{ family, weight }` |
| `generateUtilities` | `(theme)` | Atomic style map |
| `defaultTemplate` | Property | Template object |

## Critical Behaviors

1. **Merge semantics**: `extend(base, variant)` does shallow merge per group. `variant` wins.
2. **Scale types**: `modular` (geometric, good for fonts) vs `linear` (arithmetic, good for spacing).
3. **Color operations**: mix, lighten, darken, contrast, accessible via swatch rules.
4. **Font fallback**: Each role falls back to previous role's family, ultimately 'System'.
5. **Utilities naming**: `font_size_md`, `p_a_md` (a=all, h=horizontal, v=vertical, t=top, b=bottom, s=start, e=end), `br_pill`.
6. **No React**: This is pure JS. React bindings live in extension module `js-client-helper-styler-ext-react-native-web`.

## Error Handling

- Throws on malformed templates (validate before assemble)
- Returns empty objects when inputs are empty (graceful degradation)
- Uses error catalog with `.code` for programmatic handling

## Example (Canonical)

```javascript
const Styler = require('@superloomdev/js-client-helper-styler')({});

const base = {
  color: { primary: '#0D9488', bg: '#FFFFFF' },
  dimension: { baseSize: 16, unit: 8, ratio: 1.25 },
  font: { primaryFamily: 'Inter' }
};

const variant = { color: { primary: '#FF0000' } };

const theme = Styler.assemble(Styler.defaultTemplate, base, variant);
const styles = Styler.generateUtilities(theme);

// theme.Color.APP_PRIMARY === '#FF0000'
// styles.font_size_md === { fontSize: 16, lineHeight: 24 }
```
