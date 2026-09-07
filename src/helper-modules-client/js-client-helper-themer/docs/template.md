# Template Reference. `@superloomdev/js-client-helper-themer`

A template declares **which tokens exist** and **how each one is produced**. A theme then supplies only the values that differ. This page is the authoring guide; the enforced contract is in [Schemas](schemas.md).

## On This Page

- [Who Reads a Template](#who-reads-a-template)
- [Top-Level Shape](#top-level-shape)
- [The Six Routes](#the-six-routes)
- [Metadata and Token Groups](#metadata-and-token-groups)
- [Scales](#scales)
- [Operations](#operations)
- [Type Sets](#type-sets)
- [Shadows](#shadows)
- [Contrast Rules](#contrast-rules)
- [Platform Availability](#platform-availability)
- [Authoring Checklist](#authoring-checklist)

---

## Who Reads a Template

| Reader | What it needs |
|---|---|
| The engine | `tokens` and `meta`, plus whatever seeds the routes reference |
| A theme author | The token names, so a layer can pin one |
| A component | Nothing. Components read the emitted theme, never the template |

A template is data. It ships as its own package or arrives from a server, and it contains no code.

---

## Top-Level Shape

```javascript
{
  polarity: 'light',
  ramp: ['#ffffff', '#f4f4f4', '#e0e0e0', '#8d8d8d', '#393939', '#161616'],
  palette: { blue60: '#0f62fe', red60: '#da1e28' },
  scales: {
    base_font_size: 16,
    miniUnit: { base: 8 },
    stepPairIncrement: { base: 12 }
  },
  tokens: { },
  meta: { },
  contrast_rules: [ ]
}
```

Only `tokens` is required. Everything else is needed when a route references it: a `rampStep` rule needs `ramp`, a `hue` rule needs `palette`, a generator needs its seeds in `scales`.

---

## The Six Routes

Every token entry takes one of six shapes, and the engine dispatches on the shape. Nothing downstream can tell which route produced a value, so routes are freely mixed within one template.

```javascript
tokens: {

  // 1. Literal - the value itself
  background: '#ffffff',
  durationFast: 110,

  // 2. Alias - another token's value
  surface: '{background}',

  // 3. Rule - an operation over other values
  textPrimary: { op: 'rampStep', args: [5] },

  // 4. Generator - a step on a named scale
  spacing03: { scale: 'miniUnit', multiplier: 2 },

  // 5. Type set - a complete text style, as one object
  body01: { type_set: true, step: 2, weight: 400, line_height: 1.42857, letter_spacing: 0.16 },

  // 6. Shadow - layered geometry with per-layer colors
  cardShadow: { shadow: true, layers: [ { x: 0, y: 2, blur: 4, spread: 3, color: '#00000033' } ] }

}
```

**A pinned literal is not a failure of the system.** A color chosen by eye against a specific background is a real design decision that no positional rule reproduces. Pin it.

---

## Metadata and Token Groups

`meta` tells the engine which emitter a token goes through. A token with no metadata is treated as group `raw` and passes through unchanged. A `group` value the engine does not recognize is a build-time `TypeError` naming every offending token, not a silent pass-through.

| Group | Web emits | Native emits |
|---|---|---|
| `color` | unchanged | unchanged |
| `dimension` | `'1rem'` | `16` |
| `fontSize` | `'0.75rem'` | `12` |
| `letterSpacing` | `'0.32px'` | `0.32` |
| `duration` | `'110ms'` | `110` |
| `easing` | `'cubic-bezier(0.2, 0, 0.38, 0.9)'` | `[0.2, 0, 0.38, 0.9]` |
| `typeSet` | declaration block with a ratio line height | style object with an absolute line height |
| `shadow` | `box-shadow` string, every layer | style object, one layer |
| `raw` | unchanged | unchanged |

```javascript
meta: {
  background: { group: 'color' },
  spacing03: { group: 'dimension' },
  body01: { group: 'typeSet' }
}
```

---

## Scales

A scale turns a step or multiplier into a number, so one seed moves the whole ramp.

| Scale | Parameters | Seeds | Produces |
|---|---|---|---|
| `miniUnit` | `multiplier` | `base` | `base * multiplier` |
| `stepPairIncrement` | `step` | `base` | A widening curve: each group of four steps adds two more pixels per step |
| `geometric` | `step` | `base`, `ratio` | `base * ratio^(step-1)` |

Scale names are `camelCase` because they are identifiers naming an engine capability, not data fields.

A layer can override a seed, which is what makes a density change a one-number edit:

```javascript
{ name: 'compact', scales: { miniUnit: { base: 4 } } }
```

---

## Operations

| Operation | Arguments | Produces |
|---|---|---|
| `rampStep` | `[steps]` | A color that distance along the neutral ramp, away from the background |
| `hue` | `[family, step]` | The named palette entry, for example `blue` and `60` |
| `mix` | `[token_a, token_b, weight]` | A blend of two resolved numeric colors, including alpha, weighted toward the first |
| `scaleBy` | `[token, multiplier]` | An already-resolved number, scaled |

`rampStep` is polarity aware. On a light theme it walks darker, on a dark theme it walks lighter, so one rule serves both:

```javascript
textPrimary: { op: 'rampStep', args: [5] }
```

---

## Type Sets

A type set resolves to **one object** rather than to separate sibling tokens. That is what lets the native emitter compute an absolute line height without reaching across tokens.

```javascript
code01: {
  type_set: true,
  step: 1,
  weight: 400,
  line_height: 1.33333,
  letter_spacing: 0.32,
  font_family: 'mono'
}
```

**`font_family` is a token, never a family name and never a font stack.** The engine passes it through untranslated; `helper-font` maps it to a registered family. Writing `'IBM Plex Mono, monospace'` here is wrong twice over: it hard-codes a vendor into a generic template, and React Native cannot represent a fallback list at all.

An exact type set replaces `step` with `font_size` and may replace the ratio with `line_height_px`. Both exact fields accept a number or a normal token alias. Exact values are unit-free, finite, and never rounded. A type set must not declare both `step` and `font_size`, or both `line_height` and `line_height_px`.

```javascript
body01: {
  type_set: true,
  font_size: '{bodySize}',
  line_height_px: 20.25,
  letter_spacing: 0.16,
  weight: 400
}
```

**Leaving `weight`, `line_height`, or `letter_spacing` out is legitimate.** The emitters omit absent properties rather than inventing a value, so CSS inherits and React Native is not handed `undefined` or `NaN`.

---

## Shadows

A shadow declares `layers`, an array of geometry objects. Each layer carries its own color.

```javascript
cardShadow: {
  shadow: true,
  layers: [
    { x: 0, y: 1, blur: 2, spread: 0, color: '#00000033' },
    { x: 0, y: 4, blur: 8, spread: -1, color: '#0000001a' }
  ]
}
```

Each layer is `{ x, y, blur, spread, color, inset? }`. `x` and `y` are pixel offsets and may be negative. `blur` is zero or greater. `spread` may be negative. `color` is a hex or rgb/rgba string and is required on every layer. `inset` is optional and defaults to false; when true, the layer paints inside the border box.

Web emits the list as a CSS `box-shadow` string. Native emits `{ boxShadow: '<list>' }` using React Native 0.76+ `boxShadow` support, preserving every layer, spread, and inset. `lossy` is empty for every current emitter.

---

## Contrast Rules

Each rule names a foreground token, its background, and the required ratio.

```javascript
contrast_rules: [
  ['textPrimary', 'background', 4.5],
  ['warning', 'background', 4.5]
]
```

Enforcement runs after resolution, so it covers literals, aliases, and rules alike. After a correction, the engine discovers and invalidates the complete dependent token subgraph before recomputing it, so forward references, aliases, and diamond-shaped rule graphs cannot retain stale values. A failing color is corrected by one of three strategies, tried in order:

1. **Snap** to a compliant step in the value's own palette family. Keeps the result inside the design system.
2. **Shift lightness** while holding hue and saturation. Keeps a brand color recognizable.
3. **Mix** toward white or black. Last resort, because it invents a color the palette does not contain.

Pass `{ contrast: 'report' }` to record violations without rewriting anything, which is what a build-time check wants. For translucent foregrounds, the named background is the compositing background and must be opaque. The engine measures the displayed composite but reports `unsupported-alpha-correction` instead of changing authored alpha. A translucent named background has no complete compositing context and throws.

---

## Platform Availability

A token that cannot exist on a platform declares a fallback rather than disappearing.

```javascript
meta: {
  fluidGutter: {
    group: 'raw',
    platforms: ['web'],
    fallback: { native: 16 }
  }
}
```

Both platforms then emit the same token keys, and the substitution is reported in the emit result. Omitting the key instead would force every caller to guard against `undefined`.

---

## Authoring Checklist

- [ ] Every token in `tokens` has an entry in `meta` naming its group, and every group is one the engine recognizes
- [ ] Every alias target exists
- [ ] Every generator's scale has seeds in `scales`
- [ ] Every `hue` rule's palette entry exists
- [ ] `ramp` is ordered lightest first, and is present if any `rampStep` rule is used
- [ ] Type sets carry a family **token**, not a family name or a font stack
- [ ] Any token unavailable on a platform declares a `fallback` for it
- [ ] `contrast_rules` name real tokens and ratios between 1 and 21
- [ ] `validateTemplate` passes, and a `resolve` against an empty layer stack does not throw
