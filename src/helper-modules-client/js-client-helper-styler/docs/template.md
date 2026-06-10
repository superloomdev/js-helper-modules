# Template Schema. `@superloomdev/js-client-helper-styler`

A **template** is the opinionated layer, expressed entirely as **data**. It
declares *which* design values exist and *how* each is derived. **Styler**
(`styler.js`) reads the template, fills it with a **scheme**'s values (`base +
variant`), and produces the final theme: `{ Color, Dimension, Font }`.

This page is a complete authoring reference: every key, every allowed value, and
every operation. You should be able to write a valid template from this page
**without reading the Styler source**.

## On this page

- [Who reads a template](#who-reads-a-template)
- [Top-level shape](#top-level-shape)
- [Color section](#color-section)
  - [Color operations (full list)](#color-operations-full-list)
  - [How arguments resolve](#how-arguments-resolve)
- [Dimension section](#dimension-section)
- [Font section](#font-section)
- [What Styler produces](#what-styler-produces)
- [Authoring a new template (checklist)](#authoring-a-new-template-checklist)
- [Validation & rules](#validation--rules)

---

## Who reads a template

**Styler** is the only reader. Three pure functions interpret the three
sections and never change, no matter how you label things:

| Section | Styler function | Produces |
|---|---|---|
| `color` | `deriveColor(template.color, themeColorValues)` | `Color` — a flat map of named colors |
| `dimension` | `deriveDimension(template.dimension, themeDimValues)` | `Dimension` — named scales + scalars |
| `font` | `deriveFont(template.font, themeFontValues)` | `Font` — `{ family, weight }` |

`assemble(template, base, variant)` runs all three after merging `base + variant`.
A template is therefore a *recipe*; the theme supplies the *ingredients*.

## Top-level shape

```js
module.exports = {
  color:     { defaults: { … }, swatches:  { … } },
  dimension: { defaults: { … }, scales:    { … }, constants: [ … ] },
  font:      { defaults: { … }, roles:     [ … ] }
};
```

Every section has a **`defaults`** block — the complete fallback values a theme
overrides. The rest of each section is the *derivation spec*, named in that
section's own vocabulary: color **`swatches`**, dimension **`scales`**, font
**`roles`**.

---

## Color section

```js
color: {

  // Raw input values. Author-defined keys. A theme overrides any of these,
  // e.g. a variant of { color: { primary: '#0D9488' } }.
  defaults: {
    primary: '#4F46E5', textPrimary: '#111827', backgroundPrimary: '#FFFFFF',
    success: '#16A34A', danger: '#DC2626', warning: '#D97706', info: '#2563EB'
  },

  // Output colors. Each key becomes Color.<KEY>; each value is ONE rule.
  swatches: {
    APP_PRIMARY:        { ref: 'primary' },
    APP_PRIMARY_SUBTLE: { operation: 'mix', args: ['primary', 'backgroundPrimary', 12] },
    TEXT_ON_PRIMARY:    { operation: 'contrast', args: ['primary'] }
    // …
  }
}
```

- **`defaults`** — a flat map of input color values. Keys are arbitrary names you
  choose (e.g. `primary`, `success`); values are hex strings (`#rgb` or `#rrggbb`).
- **`swatches`** — a map of **output name → rule**. The output name is copied
  verbatim into `Color` (convention: `UPPER_SNAKE`). A rule is exactly one of:

| Rule form | Meaning |
|---|---|
| `{ ref: 'key' }` | Copy a value. `key` is a `defaults`/theme key, or a literal hex (`{ ref: '#FFFFFF' }`). |
| `{ operation: 'name', args: [ … ] }` | Run a named color operation (below). `args` are passed to it in order. |

### Color operations (full list)

These are the **only** operations a swatch may name. Each takes hex string(s)
and/or a numeric weight (0–100) and returns a hex string (except `luminance`/
`isDark`, which are used internally by the others).

| `operation` | `args` (in order) | Result |
|---|---|---|
| `mix` | `(a, b, weightA)` | Blend: `weightA`% of color `a` + the rest of `b`. |
| `lighten` | `(hex, amount)` | Mix `amount`% white into `hex`. |
| `darken` | `(hex, amount)` | Mix `amount`% black into `hex`. |
| `contrast` | `(hex)` | A readable foreground for `hex`: `#FFFFFF` on dark, `#111827` on light. |
| `pseudoHover` | `(hex)` | Hover state (lightens dark colors, darkens light ones). |
| `pseudoPress` | `(hex)` | Pressed state (stronger than hover). |
| `disabled` | `(hex)` | Muted state: 45% `hex` + 55% white. |
| `luminance` | `(hex)` | Perceived brightness 0–255 (rarely referenced directly). |
| `isDark` | `(hex)` | `true` when `luminance < 128`. |

> Adding a **new** operation is the one change that touches code: add a function
> to `ColorOps` in `parts/color-ops.js`, then reference it by name here.

### How arguments resolve

Each entry in `args` is resolved before the operation runs:

- A **number** is used literally (it is the weight/amount, `0–100`).
- A **string** is looked up as a key in the resolved values (`defaults` merged
  with the theme). If no such key exists, the string is used **literally** — so
  an inline hex like `'#FFFFFF'` works without being a declared value.

Example: `{ operation: 'mix', args: ['primary', '#FFFFFF', 12] }` → 12% of the
theme's `primary` blended with literal white.

**Theme escape hatch:** a theme may pass `color.overrides`, a flat
`OUTPUT_NAME → hex` map that wins over every derived swatch.

---

## Dimension section

```js
dimension: {

  defaults: { fontBase: 16, fontRatio: 1.2, spaceUnit: 4, radiusUnit: 4, lineHeightRatio: 1.45 },

  scales: {
    fontSize: { type: 'modular', base: 'fontBase', ratio: 'fontRatio',
                steps: { xs: -2, sm: -1, md: 0, lg: 1, xl: 2, xxl: 3 } },
    space:    { type: 'linear', unit: 'spaceUnit',
                steps: { none: 0, xs: 1, sm: 2, md: 3, lg: 4, xl: 6, xxl: 8 } },
    radius:   { type: 'linear', unit: 'radiusUnit',
                steps: { none: 0, sm: 1, md: 2, lg: 3 }, presets: { pill: 999 } }
  },

  constants: ['lineHeightRatio']
}
```

- **`defaults`** — scalar seed numbers. Keys are arbitrary; values are numbers.
- **`scales`** — a map of **scale name → scale spec**. Each scale produces an
  object `Dimension.<scaleName>.<step>`. A scale has a `type`, which decides the
  rest of its keys:

| `type` | Required keys | Formula per step | `steps` value means |
|---|---|---|---|
| `modular` | `base`, `ratio`, `steps` | `round(base * ratio ^ step)` | the **exponent** (may be negative or `0`) |
| `linear` | `unit`, `steps` | `unit * multiplier` | the **multiplier** |

  - `base`, `ratio`, `unit` are **names of keys** in the resolved values (not
    literal numbers) — so a theme can retune the whole scale by overriding one seed.
  - **`presets`** *(optional)* — a map of non-derived entries merged into the
    scale as-is (e.g. `pill: 999`). Useful for fixed values that don't fit the formula.
  - A theme may override individual steps via `dimension.<scaleName>`, e.g.
    `{ dimension: { space: { md: 20 } } }`.
- **`constants`** — an array of `defaults` key names copied straight through to
  `Dimension.<key>` (not a scale), e.g. `lineHeightRatio`.

Override precedence within a scale (last wins): derived steps → `presets` →
theme's per-step overrides.

---

## Font section

```js
font: {
  defaults: { primaryFamily: 'System', secondaryFamily: null },
  roles: ['primary', 'secondary']
}
```

- **`defaults`** — for each role `X` in `roles`, a `<X>Family` key naming the
  font family (a string, or `null`/empty to fall back). May also include a
  `weight` map (see below).
- **`roles`** — an **ordered** array of role names. For each role, Styler
  reads `<role>Family`; if empty it falls back to the **previous** resolved
  role's family, and ultimately to `'System'`. Order therefore matters.
- **Weights** — resolved from an optional `weight` map with a fallback chain:
  `regular` (default `'400'`) → `medium` (→ `regular`) → `semibold` (default
  `'600'`) → `bold` (default `'700'`). A theme may supply `font.weight` to override.

> Only family **names** live here — pure data. Loading the actual font **files**
> (`.ttf`, web `<link>`) is a host concern. See `docs/philosophy.md`.

---

## What Styler produces

Given the default template, `assemble(...)` returns:

```js
{
  Color: { APP_PRIMARY: '#4F46E5', TEXT_ON_PRIMARY: '#FFFFFF', /* one key per swatch */ },
  Dimension: {
    fontSize: { xs: 11, sm: 13, md: 16, lg: 19, /* … */ },
    space:    { none: 0, xs: 4, sm: 8, md: 12, /* … */ },
    radius:   { none: 0, sm: 4, md: 8, lg: 12, pill: 999 },
    lineHeightRatio: 1.45            // a constant, copied through
  },
  Font: {
    family: { primary: 'System', secondary: 'System' },
    weight: { regular: '400', medium: '400', semibold: '600', bold: '700' }
  }
}
```

- `Color` keys are exactly your `swatches` names.
- `Dimension.<scaleName>.<step>` mirror your `scales`; `constants` appear as
  scalar siblings.
- `Font.family.<role>` mirrors your `roles`.

> **If you use `styler.generateUtilities(theme)`**, note it looks for a set of
> conventional `Color` names (`APP_PRIMARY`, `TEXT_PRIMARY`, `STATUS_*`, …) when
> emitting color utilities. Keep those names if you rely on it — see
> `docs/api.md`. Scales/radii/spacing utilities are generated dynamically from
> whatever steps you declare.

---

## Authoring a new template (checklist)

A new template is just a new data file shaped like the above. Styler never
changes. Steps:

1. **Color** — list your input colors in `color.defaults`, then declare each
   output in `color.swatches` as a `ref` or an `operation` rule.
2. **Dimension** — set seed numbers in `dimension.defaults`, define `scales`
   (`modular`/`linear`), add any `presets`, and list scalar `constants`.
3. **Font** — set `<role>Family` defaults and the ordered `roles` array.
4. **Validate** — `require('@superloomdev/js-client-helper-styler').validators(Lib).validateTemplate(myTemplate)`
   throws (with a `.code`) on the first structural problem.
5. **Use it** — pass your template wherever the default is used:
   `styler.assemble(myTemplate, base, variant)`.

**Additive changes** (all data-only):

- *Add a color* — add an input to `defaults` and an output rule to `swatches`:
  ```js
  color.defaults.tertiary = '#DB2777';
  color.swatches.APP_TERTIARY = { ref: 'tertiary' };
  color.swatches.APP_TERTIARY_SUBTLE = { operation: 'mix', args: ['tertiary', 'backgroundPrimary', 12] };
  ```
- *Add a scale step* — add an entry to a scale's `steps` (e.g. `xxs`, `xxxl`).
- *Add a font role* — append to `font.roles` and add `<role>Family` to `defaults`
  (or let it fall back).

---

## Validation & rules

`validators.validateTemplate(template)` enforces the structural contract and
throws an `Error` with a stable `.code` on the first failure:

| `.code` | Cause |
|---|---|
| `THEME_TEMPLATE_INVALID` | missing a `color` / `dimension` / `font` section |
| `THEME_TEMPLATE_COLOR_RULE_INVALID` | a swatch rule declares neither `ref` nor `operation` |
| `THEME_TEMPLATE_SCALE_INVALID` | a scale's `type` is not `modular` or `linear` |

Styler additionally throws a `TypeError` at derive time for an unknown
`operation` name or an unknown scale `type`. After editing a template, run
`validators.validateTemplate(...)` and the package unit tests.
