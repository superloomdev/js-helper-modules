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
    carbonType: { base: 12 }
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

  // 6. Shadow - layered geometry plus an elevation
  cardShadow: { shadow: true, level: 2 }

}
```

**A pinned literal is not a failure of the system.** A colour chosen by eye against a specific background is a real design decision that no positional rule reproduces. Pin it.

---

## Metadata and Token Groups

`meta` tells the engine which emitter a token goes through. A token with no metadata is treated as group `raw` and passes through unchanged.

| Group | Web emits | Native emits |
|---|---|---|
| `colour` | unchanged | unchanged |
| `dimension` | `'1rem'` | `16` |
| `fontSize` | `'0.75rem'` | `12` |
| `letterSpacing` | `'0.32px'` | `0.32` |
| `duration` | `'110ms'` | `110` |
| `easing` | `'cubic-bezier(0.2, 0, 0.38, 0.9)'` | `[0.2, 0, 0.38, 0.9]` |
| `typeSet` | declaration block with a ratio line height | style object with an absolute line height |
| `shadow` | `box-shadow` string, every layer | style object, one layer plus elevation |
| `raw` | unchanged | unchanged |

```javascript
meta: {
  background: { group: 'colour' },
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
| `carbonType` | `step` | `base` | A widening curve: each group of four steps adds two more pixels per step |
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
| `rampStep` | `[steps]` | A colour that distance along the neutral ramp, away from the background |
| `hue` | `[family, step]` | The named palette entry, for example `blue` and `60` |
| `mix` | `[token_a, token_b, weight]` | A blend of two resolved tokens, weighted toward the first |
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

**Leaving `weight` out is legitimate.** Some design systems deliberately leave certain type sets without a weight. The emitters omit the key rather than inventing a value, so CSS inherits and React Native is not handed the string `'undefined'`.

---

## Shadows

Geometry comes from either an elevation level or explicit layers.

```javascript
// Seeded from the built-in elevation table, levels 1 through 5
cardShadow: { shadow: true, level: 2 },

// Explicit geometry
customShadow: {
  shadow: true,
  layers: [
    { offset_x: 0, offset_y: 2, blur: 4, spread: 3, opacity: 0.2 }
  ],
  color: '{shadowColor}',
  elevation: 2
}
```

Web renders every layer. React Native collapses to the layer with the greatest blur and drops `spread`, and both losses appear in the emit result's `lossy` list rather than happening silently.

---

## Contrast Rules

Each rule names a foreground token, its background, and the required ratio.

```javascript
contrast_rules: [
  ['textPrimary', 'background', 4.5],
  ['warning', 'background', 4.5]
]
```

Enforcement runs after resolution, so it covers literals, aliases, and rules alike. A failing colour is corrected by one of three strategies, tried in order:

1. **Snap** to a compliant step in the value's own palette family. Keeps the result inside the design system.
2. **Shift lightness** while holding hue and saturation. Keeps a brand colour recognizable.
3. **Mix** toward white or black. Last resort, because it invents a colour the palette does not contain.

Pass `{ contrast: 'report' }` to record violations without rewriting anything, which is what a build-time check wants.

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

- [ ] Every token in `tokens` has an entry in `meta` naming its group
- [ ] Every alias target exists
- [ ] Every generator's scale has seeds in `scales`
- [ ] Every `hue` rule's palette entry exists
- [ ] `ramp` is ordered lightest first, and is present if any `rampStep` rule is used
- [ ] Type sets carry a family **token**, not a family name or a font stack
- [ ] Any token unavailable on a platform declares a `fallback` for it
- [ ] `contrast_rules` name real tokens and ratios between 1 and 21
- [ ] `validateTemplate` passes, and a `resolve` against an empty layer stack does not throw
