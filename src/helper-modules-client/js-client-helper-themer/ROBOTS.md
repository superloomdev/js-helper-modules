# ROBOTS.md - helper-themer

> Compact signature reference for AI agents. Read this before calling any function in this module.

**Module:** `@superloomdev/js-client-helper-themer` | **Alias:** `helper-themer` | **Class:** G (pure engine, factory) | **Runtime:** Node.js 24+, React Native (Hermes)

## Load

```javascript
import themer from 'helper-themer';

Lib.Themer = themer(Lib, CONFIG);
```

Factory. Each call returns an independent instance with its own cache. `Lib` must carry `Utils` and `Debug`.

## Peer Dependencies

| Package | Range |
|---|---|
| `helper-utils` | `^1.0.0` |
| `helper-debug` | `^1.0.0` |

Not a dependency: `helper-font`. The two modules are independent by design.

## CONFIG

| Key | Type | Default | Constraint |
|---|---|---|---|
| `BASE_FONT_SIZE` | Number | `16` | `> 0` |
| `CACHE_CAPACITY` | Number | `32` | whole, `>= 1` |
| `CACHE_ENABLED` | Boolean | `true` | strict boolean |
| `MIN_CONTRAST_RATIO` | Number | `4.5` | `1` to `21` |

Validated at load. Bad config throws immediately.

## Signatures

```javascript
buildTheme(template, layers, platform, options?) -> { tokens, substituted, lossy, corrections, violations, stats }
resolve(template, layers, options?)              -> { tokens, scales, polarity, anchor_index, motion_factor, contrast_mode, stats, corrections, violations }
emit(resolved, template, platform)               -> { tokens, substituted, lossy }
validateTemplate(template)                       -> { success, errors }
platforms()                                      -> ['web', 'native']
cacheStats()                                     -> { hits, misses, evictions, size }
clearCache()                                     -> undefined
```

`platform` is `'web'` or `'native'`. `layers` is always an array, never a single object.

## Failure Model

**Everything throws `TypeError`. There is no operational envelope.**

The single exception is `validateTemplate`, which returns `{ success, errors }` and never throws. It is a pre-resolution reporting surface, so it collects every finding.

Message format: `[helper-themer] <field-path> <expected-shape>`

| Trigger | Message |
|---|---|
| non-object template | `template must be a plain object` |
| missing token map | `template.tokens must be a plain object` |
| non-array layers | `layers must be an array of layer objects` |
| bad layer entry | `layers[1] must be a plain object` |
| alias to nothing | `tokens.X must be a declared token or alias target` |
| alias loop | `tokens.X resolves through an alias cycle` |
| unknown scale | `tokens.X.scale must name a generator this engine provides` |
| unknown operation | `tokens.X.op must name an operation this engine provides` |
| unknown platform | `platform must be one of: web, native` |
| unknown group | `tokens.X (group: Y) must name a known emitter group` |

## Naming Rule (important)

| Surface | Case |
|---|---|
| Template / layer / options / result keys | `snake_case` |
| Scale and operation identifiers | `camelCase` (`carbonType`, `miniUnit`, `geometric`, `rampStep`, `hue`, `mix`, `scaleBy`) |
| Keys **inside** an emitted token value | `camelCase` (`fontSize`, `lineHeight`, `shadowRadius`) - React Native's contract, do not rename |

## Template Entry Shapes

```javascript
'#0f62fe'                                                    // literal
'{brand}'                                                    // alias
{ op: 'rampStep', args: [5] }                                // rule
{ scale: 'miniUnit', multiplier: 2 }                         // generator
{ type_set: true, step: 1, weight: 400, line_height: 1.33,
  letter_spacing: 0.32, font_family: 'mono' }                // type set
{ shadow: true, level: 2 }                                   // shadow
```

Type set and shadow require their boolean marker. Shadow needs `level` (1-5) **or** `layers`.

Shadow layer geometry: `offset_x`, `offset_y`, `blur`, `spread`, `opacity`.

## Metadata Groups

`color`, `dimension`, `fontSize`, `letterSpacing`, `duration`, `easing`, `typeSet`, `shadow`, `raw`.

A token with no `meta` entry defaults to `raw`. A token with a `platforms` list that excludes a platform **must** declare `fallback` for it. An unknown `group` is a build-time `TypeError` naming every offending token, not a silent pass-through.

## Layer Fields

`name`, `tokens`, `scales`, `polarity` (`'light'`/`'dark'`), `motion_factor` (`0`-`1`, scales the `duration` group).

## Options

`contrast` (`'correct'` rewrites, anything else only reports), `min_contrast_ratio`, `motion_factor`.

## Gotchas

- **`resolve` returns a cached object by reference.** Do not mutate the result; a later hit sees the mutation
- **A hand-built `resolved` object misses the emit cache every time.** Correct, just uncached
- **`font_family` is a token, never a family name and never a CSS font stack.** The engine passes it through untranslated; React Native cannot represent a fallback list
- **An absent `weight` stays absent.** Do not `String()` it blindly; that emits the literal `'undefined'`
- **Both platforms emit identical token keys.** Never guard against a missing key; check `substituted` instead
- **`lossy` and `substituted` are return values, not warnings.** The caller decides whether they are fatal
- **Contrast correction can override an explicit pin.** A tenant's brand color may be altered; use `{ contrast: 'report' }` at build time to see it instead
- **The engine does no I/O.** It never fetches a theme, loads a font, or reads the DOM

## Testing

```bash
cd _test && npm install && npm test
```

Pure Node. No container, no emulator, no network, no environment variables.
