# @superloomdev/js-client-helper-themer

A design-token engine that derives a complete theme from a template plus a cascade of layers, then delivers it to web and React Native from one resolved source.

A theme is a **derivation**, not a list. A template declares what tokens exist and how each is produced; a theme supplies only the values that differ. A theme pinning four seeds and a theme pinning every value are the same object on the same code path.

## Features

- **One derivation, two platforms.** Resolve produces canonical, unit-free values; emit projects them onto web or React Native. No second theme to keep in step
- **Six resolution routes.** Literal, alias, rule, generator, type set, and shadow, freely mixed, with nothing downstream able to tell which one produced a value
- **Layer cascade, not modes.** Dark mode, density, tenant brand, and reduced motion are sparse layers that compose, so nobody enumerates the combinations
- **Nothing disappears quietly.** A token a platform cannot carry takes a declared fallback; a fact a projection cannot represent is reported. Both come back as ordinary return values
- **Contrast enforcement built in.** Runs after resolution so it covers every route, corrects by snapping inside the palette, and reports in both modes
- **Pure and synchronous.** No I/O, no network, no React, no DOM. A theme is ready in the same tick
- **Bounded result cache** per instance, keyed so a framework provider's freshly built layer array still hits

## Installation

```bash
npm install @superloomdev/js-client-helper-themer
```

Published to GitHub Packages under the `@superloomdev` scope. Registry setup is a one-time step: see [npmrc setup](https://github.com/superloomdev/superloom/blob/main/docs/dev/npmrc-setup.md).

## Quick Start

```javascript
import helperUtils from 'helper-utils';
import helperDebug from 'helper-debug';
import themer from 'helper-themer';

const Lib = {};
Lib.Utils = helperUtils(Lib, {});
Lib.Debug = helperDebug(Lib, {});

Lib.Themer = themer(Lib, {});

const theme = Lib.Themer.buildTheme(template, [
  { name: 'brand', tokens: { brand: '#0f62fe' } },
  { name: 'dark', polarity: 'dark' }
], 'web');

theme.tokens.spacing03;   // '1rem'
theme.tokens.brand;       // '#0f62fe'
```

The same call with `'native'` returns `16` for `spacing03`, from the same derivation.

## Core Concepts

### Resolve, then emit

Resolution is platform independent and produces a spacing token as the number `16`. Emit projects it: `'1rem'` on web, `16` on native. The difference between platforms lives in one table rather than scattered through the token values.

This is also why a type set resolves to an **object**. React Native needs an absolute line height, which is the font size times the ratio; because both are inside the same object, emit never reaches across tokens.

### Layers

Layers apply in order and the last to pin a token wins. Each pins only what it changes.

```javascript
[
  { name: 'base' },
  { name: 'compact', scales: { miniUnit: { base: 4 } } },
  { name: 'reduced', motion_factor: 0.5 }
]
```

Density is a one-number change. Reduced motion is a derivation over the durations the theme already has, not a second set.

### Reports, not silence

```javascript
const native = Themer.emit(resolved, template, 'native');

native.substituted;  // tokens the platform cannot carry, and their fallback
native.lossy;        // facts the projection could not represent, and why
```

Both platforms emit the same token keys, so no caller has to guard against `undefined`.

## API Overview

| Function | Purpose |
|---|---|
| `buildTheme(template, layers, platform, options)` | Derive and emit in one call |
| `resolve(template, layers, options)` | Derive a platform-independent token map |
| `emit(resolved, template, platform)` | Project a resolved map onto one platform |
| `validateTemplate(template)` | Check a template and report every finding |
| `platforms()` | List the platforms this engine emits for |
| `cacheStats()` / `clearCache()` | Inspect and reset the per-instance cache |

Full signatures and return shapes: [API Reference](docs/api.md).

## Configuration

| Key | Default | Purpose |
|---|---|---|
| `BASE_FONT_SIZE` | `16` | Root size the web emitter divides by to produce rem |
| `CACHE_CAPACITY` | `32` | Maximum cached results per instance |
| `CACHE_ENABLED` | `true` | Set false to derive fresh every call |
| `MIN_CONTRAST_RATIO` | `4.5` | Default floor for contrast rules |

See [Configuration](docs/configuration.md).

## Fonts

This module decides which typeface text should use. It does **not** load it.

A type set carries a font family **token** such as `'mono'`, which the engine passes through untranslated. `helper-font` maps that token to a registered family and loads the file. **The two modules do not depend on each other**, and theming never waits on a font: text renders immediately in a fallback and swaps when the font module finishes. The single point of contact is name equality.

See [Philosophy](docs/philosophy.md).

## Error Handling

Every failure throws `TypeError`, because a pure engine has no operational failures. The one exception is `validateTemplate`, which reports `{ success, errors }` so a build tool sees every problem at once.

```javascript
Themer.emit(resolved, template, 'android');
// TypeError: [helper-themer] platform must be one of: web, native
```

A theme document from a server is untrusted input: check it before calling `resolve`. See [Schemas](docs/schemas.md).

## Compatibility

Node.js 24+ and React Native (Hermes). No React, no DOM, no runtime dependencies outside the framework.

| Peer dependency | Range |
|---|---|
| `helper-utils` | `^1.0.0` |
| `helper-debug` | `^1.0.0` |

## Documentation

- [API Reference](docs/api.md) - every function and return shape
- [Template Reference](docs/template.md) - authoring a template
- [Schemas](docs/schemas.md) - the validated contracts
- [Configuration](docs/configuration.md) - config keys and integration
- [Philosophy](docs/philosophy.md) - why the engine is shaped this way
- [ROBOTS.md](ROBOTS.md) - compact signature reference for AI agents

## Testing

```bash
cd _test && npm install && npm test
```

Pure Node. No container, no emulator, no network, no environment variables.

## License

MIT
