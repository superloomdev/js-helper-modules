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
- [Icons](#icons)
- [Contrast Rules](#contrast-rules)
- [Platform Availability](#platform-availability)
- [Authoring Checklist](#authoring-checklist)
- [Motion](#motion)
- [Anatomy](#anatomy)
- [Control Roles](#control-roles)

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
| `shadow` | `box-shadow` string, every layer | `{ boxShadow: '<list>' }`, every layer |
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
| `alpha` | `[token, opacity]` | An already-resolved color drawn at an opacity (its alpha times the opacity), as `rgba`; a layer that changes the operand changes the result |

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

## Icons

An icon is a value-tier literal (contract version 4): one `icon.*` token per semantic glyph name, so a template carries its own glyphs and a component system never ships an icon file.

```javascript
'icon.close': {
  icon: true,
  viewBox: '0 0 32 32',
  paths: [{ d: 'M24 9.4L22.6 8 16 14.6 9.4 8 8 9.4l6.6 6.6L8 22.6 9.4 24l6.6-6.6 6.6 6.6 1.4-1.4-6.6-6.6L24 9.4z' }],
  sizes: {
    '16': { viewBox: '0 0 16 16', paths: [{ d: 'M12 4.7l-.7-.7L8 7.3 4.7 4l-.7.7L7.3 8 4 11.3l.7.7L8 8.7l3.3 3.3.7-.7L8.7 8z' }] }
  }
}
```

`viewBox` is four space-separated finite numbers with positive width and height (`'0 -960 960 960'` is valid). `paths` is a non-empty list of `{ d, fillRule? }`; `d` is non-empty SVG path data and `fillRule` is `nonzero` or `evenodd`. `sizes` is optional and maps positive integer pixel sizes to variants `{ viewBox, paths }`, each in its own coordinate space, for sets that publish size-tuned glyphs. No other keys are allowed at any level, and no color: the component system supplies the fill from a color token. Both platforms emit the literal unchanged. A layer overrides one icon by supplying a new literal for its token; the template's other icons stand.

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

---

## Motion

Motion has two halves. Curves and timings are data tokens: durations in milliseconds, and curves of three kinds, a **bezier** (`[x1, y1, x2, y2]`), a **spring** (`{ spring: true, stiffness, damping, mass }`), and **segments** (`{ segments: true, curves: [[t, [x1, y1, x2, y2]], ...] }`, an ordered list of beziers with split points). Every curve in Carbon and Material is one of the three, and both platforms render all three: React Native through `Easing.bezier`, `Animated.spring`, and a sequenced bezier list; the web through `cubic-bezier()` and `linear()`.

Choreography is the component system: what animates, in which order, and which part moves. The component library implements the three curve interpreters once, in `parts/motion.js`, and every component animates through them. A new curve value is a theme edit. A new curve kind is a new interpreter, which is a component release plus a contract version.

Discrete behaviors that design systems answer differently are enum tokens, and the component system implements every listed value: `feedback.press` selects `highlight` (swap to hover and active colors), `opacity` (paint a state layer at `state.*` opacities), or `ripple` (radial spread from the touch point); `feedback.focus_trigger` (the version 5 amendment) selects whether a focus ring shows on `any` focus or on `keyboard` focus only (the ring itself is each family's role-grid cells; `feedback.focus` of version 2 was removed). Stacking order is template data in contract version 3: `stacking.dropdown`, `stacking.modal`, `stacking.header`, `stacking.overlay`, and `stacking.floating` are raw numeric structure tokens. A component reads the named surface token and never carries a private z-index table.

---

## Anatomy

Where two design systems draw the same component with a different shape, the choice is an enum token in the `anatomy` structure group (contract version 4). A template picks one value per token; a component system implements every listed value; a layer may pick another.

| Token | Values |
|---|---|
| `anatomy.label` | `above`, `floating` |
| `anatomy.switch_handle` | `fixed`, `grows` |
| `anatomy.status_marker` | `bar_icon`, `plain` |
| `anatomy.dialog_actions` | `stretched`, `trailing` |
| `anatomy.slider_handle` | `round`, `bar` |
| `anatomy.button_label` | `top`, `center` |
| `anatomy.field_counter` | `label`, `message` |
| `anatomy.switch_state_text` | `shown`, `hidden` |
| `anatomy.progress_indeterminate` | `sweep`, `travel` |
| `anatomy.tab_indicator` | `full`, `content` |
| `anatomy.dialog_close` | `shown`, `hidden` |

`anatomy.button_label` (the second version 5 amendment) says where a button taller than the default height draws its label: `top` keeps it where the default height puts it, `center` centers it in the taller button.

The version 6 anatomy values: `anatomy.field_counter` places a field's character counter in the `label` row or the `message` row; `anatomy.switch_state_text` shows or `hidden` an on/off label beside the switch; `anatomy.progress_indeterminate` animates an indeterminate bar as a `sweep` (the bar travels the track) or `travel` (Material's indeterminate motion); `anatomy.tab_indicator` draws the active-tab indicator the `full` tab width or the `content` (label) width; `anatomy.dialog_close` shows or `hidden` a dialog's close button.

Values are named by what they do, never by a design system. `validateContract` rejects a value outside the list with `CONTRACT_INVALID_VALUE`.

## Role grid

Contract version 6 carries the role grid (`getContract().grid`, group -> cell names; each token marked `grid: true`). For each component family, one role per part the component draws, per state, per property:

- `field` (text input, select and later field-like components): container, outline, label, value, placeholder, helper, invalid message, indicator and invalid icon colors per rest, hover, focus, disabled and invalid state; outline, invalid ring and focus ring widths, focus offset, inline padding, icon inset and gap, message inset and gap; value, label and helper type sets. A member cell (`text_input_container_hover`, `select_outline_disabled`, `select_indicator_focus`) exists only where a reference gives one member a different value than its family.
- `button`, per kind (`primary`, `secondary`, `tertiary`, `ghost`, `danger`, `danger_tertiary`, `danger_ghost`, `tonal`, `elevated`): container and label colors per rest, hover, active, focus, disabled and selected state, border colors per rest, hover, active and disabled, elevation (`shadow.button_<kind>[_state]`); the focus ring and its inner gap, ghost padding and minimum width.
- `selection` (checkbox, later radio and switch): outline, container, mark, state layer, label and message colors per state; focus ring width, offset and corner; state layer size.

Contract version 6 adds eight families for the next component batch:

- `list`: the option list a Select, Dropdown, Menu or ComboBox opens — container, item label and container colors per rest, hover, active, selected, selected-hover and disabled state; item height, inline padding, divider width, block padding and corner radius; the item type set; the list's elevation. `menu_*` member cells carry the menu's own padding, item height, icon size and the danger item's label and hover fill.
- `switch`: track, outline, handle, mark and state-layer colors per rest, hover, focus, active and disabled state in both unchecked and selected; track width and height, outline width, the three handle sizes, focus ring width and offset.
- `tag`: container, label, outline and icon colors at rest and disabled; height, radius, inline and icon paddings, outline width, icon size, label type set. (The ten `color.tag_*_<hue>` semantic colors stay semantic; this family is the neutral tag chrome.)
- `progress`: track, indicator and status indicator colors; track height and radius.
- `tooltip`: container and label colors, label type set, both paddings, radius, caret size, anchor offset and max width; `tooltip_compact_*` member cells carry the compact variant.
- `tab`: bar container and divider, tab track, indicator and label colors per state, state layers, focus ring; bar height, tab padding, divider and track widths, indicator width and radius, focus width and offset; `tab_contained_*` member cells carry the contained variant.
- `dialog`: scrim, container, border, heading and body colors; border width, radius, min and max width clamps, paddings, header gap, body spacing, actions row geometry and the close icon size; heading and body type sets; the dialog's elevation.
- `notification`: container, text, close icon, action and per-status marker colors; width, radius, marker width, icon size; title and body type sets; the notification's elevation.

Member cells added in version 6: `text_area_container_hover`, `text_area_outline_disabled`, `type.text_area_value` (the multiline field), `radio_size`, `radio_border`, `radio_dot_size`, `radio_focus_offset` and the `radio_outline_selected_*` colors (the radio's own geometry and checked ring), `icon_button_size` and `icon_button_icon_size` plus the `icon_button_<kind>_icon_*` colors, and `dialog_close_icon_size`.

A template answers every cell. A neutral or Carbon-shaped template points each cell at the semantic token the part draws in (`{color.field_01}`); a template generated from a design system's component tokens fills each cell from them. A color the design system states as a role at an opacity stays `rgba` (exact over any backdrop). `shadow.level_00` is no elevation. `feedback.focus_trigger` (`any` | `keyboard`) decides whether a focus ring shows on every focus or on keyboard focus only.

---

## Control Roles

Where the shared scales hold one value for every design system but a system states its own geometry for a control (a button 48 tall in one system and 40 in another, both drawn from a `size` scale that reads 48 in both), the geometry is a role token in the `control` structure group (contract version 5). A component reads the role; each template answers it with its own number; a layer may answer differently. Roles emit like `size.*`: a number on native, a `rem` string on web.

| Token | The number a template states |
|---|---|
| `control.button_height` | a button's default height |
| `control.button_radius` | a button's corner radius |
| `control.button_padding_start`, `control.button_padding_end` | a button's inline paddings, from the border inward |
| `control.button_icon_size` | the glyph size inside a button |
| `control.field_height` | a single-line field's height |
| `control.field_radius` | a field frame's corner radius |
| `control.field_icon_size` | the glyph size inside a field (status icon, caret) |
| `control.checkbox_size`, `control.checkbox_border` | a checkbox's box size and border width |
| `control.option_height` | one option row in a select list |

Two role type sets accompany them in the `type` group: `type.button_label`, the set a button label is drawn in, and `type.field_label_raised`, the set a floating field label is drawn in once raised. Eight role colors accompany them in the `color` group: `color.button_tonal`, `color.button_tonal_hover`, `color.button_tonal_active`, `color.text_on_button_tonal`, `color.button_elevated`, `color.button_elevated_hover`, `color.button_elevated_active` and `color.control_checked`, the fill of a checked checkbox or radio.
