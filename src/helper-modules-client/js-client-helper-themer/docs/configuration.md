# Configuration & Integration. `@superloomdev/js-client-helper-themer`

How to install, load, and configure the module, and what the host owns.

## On This Page

- [Install and Resolve](#install-and-resolve)
- [Loader Pattern](#loader-pattern)
- [Config Keys](#config-keys)
- [Peer Dependencies](#peer-dependencies)
- [What the Host Owns](#what-the-host-owns)
- [Caching](#caching)
- [Testing Tiers](#testing-tiers)

---

## Install and Resolve

The module is published to GitHub Packages under the `@superloomdev` scope. A project adds it as a peer dependency through its own loader rather than importing it directly in application code.

Registry setup is a one-time step: see [npmrc setup](https://github.com/superloomdev/superloom/blob/main/docs/dev/npmrc-setup.md).

Internal references use the npm alias, so source code stays free of the scope:

```json
{
  "peerDependencies": {
    "helper-themer": "npm:@superloomdev/js-client-helper-themer@^1.0.0"
  }
}
```

---

## Loader Pattern

```javascript
Lib.Themer = require('helper-themer')(Lib, {
  BASE_FONT_SIZE: 16,
  CACHE_CAPACITY: 32
});
```

Each loader call returns an independent instance with its own result cache. A host that renders one theme makes one instance at startup and keeps it for the life of the process. A build tool that sweeps many themes makes one and discards it.

Config is validated at load time, so a misconfigured value fails at startup rather than on first render.

---

## Config Keys

| Key | Type | Default | Purpose |
|---|---|---|---|
| `BASE_FONT_SIZE` | `Number` | `16` | Root font size in pixels. Web emit divides pixel sizes by this to produce rem, so it must match the host document's root size |
| `CACHE_CAPACITY` | `Number` | `32` | Maximum results held per instance. Bounds a live theme editor, which would otherwise mint an unbounded number of entries |
| `CACHE_ENABLED` | `Boolean` | `true` | Set false to make every call derive fresh. Useful when measuring cold cost |
| `MIN_CONTRAST_RATIO` | `Number` | `4.5` | Default floor for contrast rules that do not state their own. 4.5 is the WCAG AA threshold for body text |

A template may override the root size for itself with `scales.base_font_size`, which wins over `CONFIG.BASE_FONT_SIZE`.

Constraints and failure messages are in [Schemas](schemas.md).

---

## Peer Dependencies

| Package | Range | Used for |
|---|---|---|
| `helper-utils` | `^1.0.0` | Type-check primitives in the validators and inline guards |
| `helper-debug` | `^1.0.0` | Received on the container for uniformity with every other module |

There are no runtime dependencies outside the framework, and no external service dependency of any kind. The engine performs no I/O.

**`helper-font` is deliberately absent.** Themer does not depend on the font module, and the font module does not depend on themer. A type set carries a font family token that this engine passes through untranslated. See [Philosophy](philosophy.md).

---

## What the Host Owns

The engine is pure, so several responsibilities sit with the application rather than here.

| Responsibility | Owner | Note |
|---|---|---|
| Fetching a theme document | The host, or a loader module | The engine takes an already-parsed object |
| Validating an untrusted document | The host | `validateTemplate` throws; the host decides what to do about it |
| Deciding what to do with `violations` | The host | A build tool fails, a runtime accepts the correction |
| Deciding what to do with `lossy` and `substituted` | The host | Both are ordinary return values, not warnings |
| Loading fonts | `helper-font` and its extensions | Theming never waits on it |
| Applying the emitted theme to components | The host, or a framework extension | The engine returns plain objects |

---

## Caching

Each instance holds a bounded, least-recently-used cache over both stages.

The key is hybrid, because the two inputs have opposite lifetimes. A template is a long-lived import, so it is keyed by **identity**. A layer stack is rebuilt on every render, so it is keyed by **content**. That combination is what makes a framework provider's freshly built array hit rather than miss, while keeping the hit path from scaling with template size.

Two consequences worth knowing:

- **A cached result is returned by reference.** Do not mutate it; a later hit would observe the mutation.
- **A hand-built resolved object misses every time** when passed to `emit`. That is correct, just uncached.

`cacheStats()` reports hits, misses, evictions, and size. `clearCache()` resets all of it.

---

## Testing Tiers

| Tier | Status | What it covers |
|---|---|---|
| Emulated | Passing | The full suite. Pure Node, no container, no emulator, no network |
| Integration | Not applicable | The module performs no I/O, so there is no external service to integrate with |

Run from the module's `_test/` directory:

```bash
npm install && npm test
```

No environment variables are required, and `_test/loader.js` is the only file that would read them.
