# Schemas. `helper-styler`

The validated contracts at the module boundary: what a caller must pass and what the engine expects. These contracts are enforced in `styler.validators.js` and are the module's hard edges. For the function reference see [API Reference](api.md). For configuration keys see [Configuration](configuration.md). For the template authoring guide see [Template Reference](template.md).

## On This Page

- [Throw Versus Return](#throw-versus-return)
- [CONFIG Schema](#config-schema)
- [Template Schema](#template-schema)
- [Theme-Values Schema](#theme-values-schema)
- [Font Registration Check](#font-registration-check)
- [Error Codes](#error-codes)

---

## Throw Versus Return

| Category | Trigger | Mechanism | When |
|---|---|---|---|
| **Programmer error** | Malformed template, malformed theme values, missing required section | Throws `Error` with `.code` property | At authoring time or at startup, before first render |
| **Operational warning** | Theme references a font family the host has not registered | Returns a list of missing family names (not a throw) | At startup, after theme assembly |

The styler is a pure engine with no I/O. All failures are programmer errors that surface at authoring or startup time. The font-registration check is the only non-throwing validator; it returns a list so the host can decide whether to warn or throw.

---

## CONFIG Schema

The merged `CONFIG` object passed to the loader. Currently empty - no config knobs exist. The file is kept for loader-signature uniformity and future knobs. No validation runs on `CONFIG`.

---

## Template Schema

The template object passed to `assembleTheme`. Validated by `validateTemplate`. A violation throws an `Error` with `.code` set to a value from the error catalog.

| Section | Type | Required | Constraint |
|---|---|---|---|
| `color` | `object` | Yes | Must be present. Contains a `swatches` map |
| `color.swatches` | `object` | No | Map of swatch name to rule. Each rule must declare either `ref` or `operation` |
| `dimension` | `object` | Yes | Must be present. Contains a `scales` map |
| `dimension.scales` | `object` | No | Map of scale name to scale spec. Each scale must declare `type` as `"modular"` or `"linear"` |
| `font` | `object` | Yes | Must be present |

A missing `color`, `dimension`, or `font` section throws with code `THEME_TEMPLATE_INVALID`. A swatch rule without `ref` or `operation` throws with code `THEME_TEMPLATE_COLOR_RULE_INVALID`. A scale with an unknown `type` throws with code `THEME_TEMPLATE_SCALE_INVALID`.

---

## Theme-Values Schema

The values object (base or variant) passed to `assembleTheme`. Validated by `validateThemeValues`. A violation throws an `Error` with `.code` set.

| Group | Type | Required | Constraint |
|---|---|---|---|
| `color` | `object` | No | If present, must be a plain object (not an array, not null) |
| `dimension` | `object` | No | If present, must be a plain object |
| `font` | `object` | No | If present, must be a plain object |

The values object itself must be a plain object; a non-object value throws with code `THEME_VALUES_INVALID`. A group that is present but not an object throws with the same code plus a detail suffix naming the group.

---

## Font Registration Check

After theme assembly, the host can call `findUnregisteredFamilies(theme, families)` to confirm every font family the assembled theme references has been registered by the host. `System` is always considered available.

| Parameter | Type | Description |
|---|---|---|
| `theme` | `object` | The assembled theme object (must contain `Font.family`) |
| `families` | `array` | Family names the host has registered |

Returns an array of missing family names. An empty array means all families are registered. The host decides whether to warn or throw based on the result.

---

## Error Codes

| Code | Trigger |
|---|---|
| `THEME_TEMPLATE_INVALID` | Template is missing a required section (`color`, `dimension`, or `font`) |
| `THEME_TEMPLATE_COLOR_RULE_INVALID` | A color swatch rule declares neither `ref` nor `operation` |
| `THEME_TEMPLATE_SCALE_INVALID` | A dimension scale declares an unknown `type` (expected `"modular"` or `"linear"`) |
| `THEME_VALUES_INVALID` | Theme values object is not a plain object, or a group (`color`, `dimension`, `font`) is present but not an object |
| `THEME_FONT_FAMILY_UNREGISTERED` | Theme references a font family the host has not registered (informational, returned as a list) |
| `THEME_OPERATION_UNKNOWN` | A color swatch references an unknown operation |
| `THEME_SCALE_TYPE_UNKNOWN` | A dimension scale declares an unknown type |
