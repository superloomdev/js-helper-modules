# Configuration & Integration. `@superloomdev/js-client-helper-styler`

How a host app consumes the package.

## On this page

- [Install / resolve](#install--resolve)
- [What the host owns](#what-the-host-owns)
- [Wiring (RNW super-app)](#wiring-rnw-super-app)
- [Config knobs](#config-knobs)
- [Loader pattern](#loader-pattern)

---

## Install / resolve

In production this resolves like any package:

```js
// The package entry IS the Styler loader (no index.js).
const styler   = require('@superloomdev/js-client-helper-styler')(Lib);  // inject your Lib (Lib.Debug optional)

// React binding — its own subpath; only where React exists; inject Lib.React:
const adapter  = require('@superloomdev/js-client-helper-styler/styler.adapter-react.js')({ React: require('react') });
```

In this monorepo demo it lives at `src/styler/` and is required by relative path
from the client loader (Metro picks it up via `watchFolders`; dev-time only,
see app `thoughts.md` T16).

`peerDependencies`: `react` (`>=18`, **optional** — needed only for the adapter,
and injected via `Lib.React` rather than imported directly). The core has
**zero** runtime dependencies.

## What the host owns

| Concern | Owner | Location (demo) |
|---|---|---|
| Styler + default template | package | `src/styler/` |
| Schemes (`base` + variants) | **host** | `src/client/common/theme/schemes/*.json` |
| Font manifest (`.ttf` / CDN) | **host** | `src/client/common/theme/fonts.js` |
| React context wiring | **host** | `src/client/common/theme/ThemeContext.js` |

The package never bundles schemes or fonts — those are app data.

## Wiring (RNW super-app)

```js
// loader.js (DI root) — inject React, build the Styler instance
const stylerLoader = require('@superloomdev/js-client-helper-styler');                      // entry IS the loader
const StylerTemplate = require('@superloomdev/js-client-helper-styler/styler.template.js'); // data subpath
Lib.React = require('react');           // centralized React, injected for the adapter
Lib.StylerTemplate = StylerTemplate;    // data
Lib.Styler = stylerLoader(Lib);         // Styler instance (Lib.Debug injected for logging)

// ThemeContext.js — assemble per app shape, provide to subtree
const base    = require('./schemes/base.json');
const variant = require('./schemes/tasks.json');
const theme   = Lib.Styler.assemble(Lib.StylerTemplate, base, variant);
```

## Config knobs

`styler.config.js` currently exposes **no knobs** (`module.exports = {}`). It is
kept and still merged by the loaders so the signature stays uniform and future
knobs have a home.

In particular there is **no `LOG_ASSEMBLY` flag**: Styler's assembly log is
emitted at **DEBUG** level, so you control it through the injected logger's own
level threshold — raise `Lib.Debug`'s level above debug to silence it. No
injected `Lib.Debug` means no log at all.

Logic modules (`styler.js`, `styler.adapter-react.js`, `styler.validators.js`, and
the `parts/`) are **loaders**: call them with `(Lib, config?)`. They merge `config`
over `styler.config.js`, capture the injected `Lib` (e.g. `Lib.Debug`, `Lib.React`),
and return the module's interface.

## Loader pattern

The logic modules follow the JS helper-module loader convention and are
**singletons**: the public/private objects live at module scope and the loader
just wires in `Lib` + config once. Node's `require` cache then guarantees a
single instance per process:

```js
let Lib, CONFIG;
module.exports = function loader (shared_libs, config) {
  Lib = shared_libs || {};
  CONFIG = Object.assign({}, require('./styler.config'), config || {});
  return Styler; // module-scope object
};
```

**Styler** additionally initializes its siblings on load — the frozen `errors`
catalog, the `validators` subloader (`validators(Lib)`), and the pure `parts/`
(`color-ops`, `scale`, `utilities`) — so a single `require('@superloomdev/js-client-helper-styler')(Lib)`
call yields a fully wired interface with `generateUtilities` exposed. The **adapter** creates its React context once in the loader and exposes
it on the returned bindings.

The `shared_libs` (Lib) container is how dependencies are injected —
`Lib.Debug` for Styler's assembly logging, `Lib.React` for the adapter. Pure
data modules (`config`, `errors`) are plain objects, used as-is.
