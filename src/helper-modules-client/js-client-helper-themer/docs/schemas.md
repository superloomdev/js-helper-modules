# Schemas. `helper-themer`

The validated contracts at the module boundary: what a caller must pass and what the engine returns. These contracts are enforced in `themer.validators.js` and are the module's hard edges. For the function reference see [API Reference](api.md). For configuration keys see [Configuration](configuration.md). For the authoring guide see [Template Reference](template.md).

An application that receives a theme document from a server forwards it in exactly these shapes.

## On This Page

- [Throw Versus Return](#throw-versus-return)
- [Naming Convention](#naming-convention)
- [CONFIG Schema](#config-schema)
- [Template Schema](#template-schema)
- [Layer Schema](#layer-schema)
- [Options Schema](#options-schema)
- [Resolution Result Schema](#resolution-result-schema)
- [Template Check Result Schema](#template-check-result-schema)
- [Emitted Theme Schema](#emitted-theme-schema)
- [What This Module Does Not Validate](#what-this-module-does-not-validate)
- [Error Messages](#error-messages)

---

## Throw Versus Return

| Category | Trigger | Mechanism | When |
|---|---|---|---|
| **Programmer error** | Malformed template, malformed layer, bad option, unknown platform | Throws `TypeError` | At the call, before any derivation |
| **Review finding** | A template submitted to `validateTemplate` | Returns `{ success, errors }` | Before resolution, by deliberate choice |

The engine is a pure engine: synchronous derivation with no I/O, no network, and no external state. Its **operational** error set is empty, so there is no `{ success, error }` operational envelope anywhere in this module.

The second row is not an operational envelope. `validateTemplate` exists to inspect a document that is under review rather than in use, and a reviewer wants every finding at once. Raising the first one makes checking a theme package iterative for no reason. Once a template reaches `resolve`, it has been reviewed, and any remaining defect is a caller bug that throws like everything else.

This places a duty on the host. A theme document arriving over the network is **not** trusted input, and handing a malformed one straight to `resolve` throws. Validate and handle the failure before calling, or wrap the call. The loader module that owns fetching is the correct place for that, because it is the layer that does I/O and therefore has operational errors to report.

---

## Naming Convention

Two conventions meet in this module, and the boundary between them is deliberate.

| Surface | Convention | Why |
|---|---|---|
| Template keys, layer keys, options keys, result keys | `snake_case` | These are this module's own public shapes |
| Scale names and operation names | `camelCase` | These are identifiers naming an engine capability (`carbonType`, `rampStep`), not data fields |
| Keys **inside** an emitted token value | `camelCase` | These are React Native and CSS-in-JS property names (`fontSize`, `shadowRadius`). Renaming them would produce a style object neither platform accepts |

---

## CONFIG Schema

The merged `CONFIG` object passed to the loader. Validated by `validateConfig`. Every key has a default, so `{}` is valid.

| Key | Type | Default | Constraint |
|---|---|---|---|
| `BASE_FONT_SIZE` | `Number` | `16` | Greater than zero. Web emit divides pixel sizes by this to produce rem |
| `CACHE_CAPACITY` | `Number` | `32` | Whole number, one or greater |
| `CACHE_ENABLED` | `Boolean` | `true` | Must be a real boolean, not a truthy value |
| `MIN_CONTRAST_RATIO` | `Number` | `4.5` | Between 1 and 21 inclusive |

---

## Template Schema

The template passed to `resolve`, `buildTheme`, and `validateTemplate`. Validated by `validateTemplate` for structure; individual token entries are validated during resolution, where the token name is known and can be named in the message.

| Section | Type | Required | Constraint |
|---|---|---|---|
| `tokens` | `Object` | Yes | Map of token name to entry. The one section the engine cannot derive without |
| `meta` | `Object` | No | Map of token name to metadata. A token with no entry is treated as group `raw` |
| `scales` | `Object` | No | Seed values per named scale |
| `scales.base_font_size` | `Number` | No | Greater than zero. Overrides `CONFIG.BASE_FONT_SIZE` for this template |
| `palette` | `Object` | No | Flat map of palette name to hex. The operand pool for `hue` rules and contrast snapping |
| `ramp` | `String[]` | No | Ordered neutral ramp, lightest first. Required only if a `rampStep` rule is used |
| `polarity` | `String` | No | `'light'` or `'dark'`. Defaults to `'light'` |
| `contrast_rules` | `Array[]` | No | Each entry is `[token_name, background_token_name, min_ratio]` |

### Token entry shapes

A token entry takes one of six shapes. The engine dispatches on shape, and nothing downstream can tell which route produced a value.

| Route | Shape | Example |
|---|---|---|
| **Literal** | String, number, boolean, or array | `'#0f62fe'`, `110`, `[0.2, 0, 0.38, 0.9]` |
| **Alias** | String wrapped in braces | `'{brand}'` |
| **Rule** | Object with `op` and `args` | `{ op: 'rampStep', args: [5] }` |
| **Generator** | Object with `scale` | `{ scale: 'miniUnit', multiplier: 2 }` |
| **Type set** | Object with `type_set: true` | `{ type_set: true, step: 1, weight: 400, line_height: 1.33333 }` |
| **Shadow** | Object with `shadow: true` | `{ shadow: true, level: 2 }` |

### Type set fields

| Field | Type | Required | Note |
|---|---|---|---|
| `type_set` | `Boolean` | Yes | Must be `true`. Distinguishes a type set from a generator, since both name a scale |
| `step` | `Number` | Yes | Position on the type scale |
| `scale` | `String` | No | Defaults to `carbonType` |
| `line_height` | `Number` | No | A ratio. Zero or greater |
| `letter_spacing` | `Number` | No | In pixels |
| `weight` | `Number` | No | Omitted from emit when absent, never stringified |
| `font_family` | `String` | No | A **token**, never a family name and never a font stack |

### Shadow fields

| Field | Type | Required | Note |
|---|---|---|---|
| `shadow` | `Boolean` | Yes | Must be `true` |
| `level` | `Number` | One of `level` or `layers` | 1 through 5. Seeds geometry from the built-in elevation table |
| `layers` | `Object[]` | One of `level` or `layers` | Explicit geometry: `offset_x`, `offset_y`, `blur`, `spread`, `opacity` |
| `color` | `String` | No | Hex or an alias. Defaults to `'#000000'` |
| `elevation` | `Number` | No | Android elevation. Defaults to `level` |

### Metadata fields

| Field | Type | Required | Note |
|---|---|---|---|
| `group` | `String` | No | Selects the emitter: `colour`, `dimension`, `fontSize`, `letterSpacing`, `duration`, `easing`, `typeSet`, `shadow`, `raw` |
| `platforms` | `String[]` | No | Platforms this token is available on. Defaults to all |
| `fallback` | `Object` | Required when `platforms` excludes a platform | Value to substitute per excluded platform |

---

## Layer Schema

Layers are applied in array order, so the last layer to pin a token wins. Every field is optional; an empty layer is valid and contributes nothing.

| Field | Type | Constraint |
|---|---|---|
| `name` | `String` | Free-form label, used in no logic |
| `tokens` | `Object` | Sparse map of token name to entry, in any of the six shapes |
| `scales` | `Object` | Sparse seed overrides, merged per scale |
| `polarity` | `String` | `'light'` or `'dark'` |
| `motion_factor` | `Number` | Between 0 and 1 inclusive. Scales every token in the `duration` group |

A layer must be a plain object. A non-object entry throws and names its index.

---

## Options Schema

The optional per-call bundle passed to `resolve` and `buildTheme`.

| Key | Type | Default | Constraint |
|---|---|---|---|
| `contrast` | `String` | `'correct'` | `'correct'` rewrites failing colours; any other value only reports them |
| `min_contrast_ratio` | `Number` | `CONFIG.MIN_CONTRAST_RATIO` | Between 1 and 21 inclusive |
| `motion_factor` | `Number` | From the layer stack | Between 0 and 1 inclusive |

---

## Resolution Result Schema

Returned by `resolve`.

| Key | Type | Description |
|---|---|---|
| `tokens` | `Object` | Canonical, unit-free value per token name |
| `scales` | `Object` | Merged scale seeds after the cascade |
| `polarity` | `String` | Effective polarity |
| `anchor_index` | `Number` | Ramp position the background occupies |
| `motion_factor` | `Number` | Factor applied to durations |
| `contrast_mode` | `String` | Mode the pass ran in |
| `stats.route` | `Object` | Count per route: `literal`, `alias`, `rule`, `generator`, `type_set`, `shadow` |
| `stats.source` | `Object` | Count per source: `theme`, `default` |
| `corrections` | `Object[]` | Contrast rewrites that were applied |
| `violations` | `Object[]` | Contrast failures that were found, whether or not corrected |

Route is **how** a value was produced; source is **where** the entry came from. Conflating them hides which parts of the chain a theme actually uses.

---

## Template Check Result Schema

Returned by `validateTemplate`. Never throws, including when the argument is not an object.

| Key | Type | Description |
|---|---|---|
| `success` | `Boolean` | True when no finding was recorded |
| `errors` | `String[]` | Every finding, in the order found, in the standard message format |

A non-object template is reported as a single finding, because there are no fields left to go on checking.

---

## Emitted Theme Schema

Returned by `emit`. `buildTheme` returns the same three keys plus `corrections`, `violations`, and `stats` carried through from resolution.

| Key | Type | Description |
|---|---|---|
| `tokens` | `Object` | Platform-ready value per token name |
| `substituted` | `Object[]` | Tokens the platform cannot carry, replaced by their declared fallback |
| `lossy` | `Object[]` | Facts a projection could not represent |

Both platforms emit **the same token keys**. A token unavailable on a platform takes its fallback rather than disappearing, because omitting the key would force every caller to guard against `undefined`.

A `lossy` entry carries `token`, `fact`, and `reason`. A value that vanishes with no record is the failure this reporting exists to prevent.

---

## What This Module Does Not Validate

Stated explicitly, because the gaps are deliberate rather than oversights.

- **Whether a `font_family` token names a real typeface.** The engine has no font registry and does no I/O. It emits the token unchanged; `helper-font` resolves it to a registered family name. See [Philosophy](philosophy.md) for why the two modules do not depend on each other.
- **Whether a colour is a valid hex string.** A malformed hex produces `NaN` channels rather than a throw. Templates are authored artifacts, and a build-time check is the right place for this.
- **Whether a theme document came from a trusted source.** Schema shape is not provenance.
- **Whether the emitted values look right.** Contrast rules are the only aesthetic constraint the engine enforces.

---

## Error Messages

Every throw follows the framework's programmer-error format: an alias prefix, the field path that is wrong, and the constraint it failed.

```text
[helper-themer] <field-path> <expected-shape>
```

| Example | Cause |
|---|---|
| `[helper-themer] template must be a plain object` | Template argument was null or a non-object |
| `[helper-themer] template.tokens must be a plain object` | Token map missing |
| `[helper-themer] layers must be an array of layer objects` | Layers argument was not an array |
| `[helper-themer] layers[1] must be a plain object` | One layer entry was not an object |
| `[helper-themer] tokens.brand must be a declared token or alias target` | An alias named a token nothing declares |
| `[helper-themer] tokens.loopA resolves through an alias cycle` | Aliases form a loop |
| `[helper-themer] tokens.pad.scale must name a generator this engine provides` | Unknown scale name |
| `[helper-themer] tokens.brand.op must name an operation this engine provides` | Unknown operation name |
| `[helper-themer] platform must be one of: web, native` | Unknown emit target |
| `[helper-themer] CONFIG.CACHE_CAPACITY must be a whole number of 1 or greater` | Misconfigured at load time |

The expected-shape clauses live in `themer.errors.js`, so the format stays in one place and every message reads alike.
