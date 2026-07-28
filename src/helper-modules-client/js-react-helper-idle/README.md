# @superloomdev/js-react-helper-idle

![MIT License](https://img.shields.io/badge/license-MIT-blue)
![Node 24+](https://img.shields.io/badge/node-%3E%3D24-green)

An idle detection helper for React that ships pre-tested and injects activity sources so it works on web, React Native, and React Native Web. Part of [Superloom](https://superloom.dev).

## What This Is

A standalone idle detection module for React applications. It tracks user activity and exposes a generic threshold registry so the host can register callbacks at any inactivity duration. Both a React hook and plain functions are provided for controlling idle detection.

The module does not reference `document`, `window`, or `react-native`. Activity sources are injected by the host. On web, you pass DOM event listeners. On React Native, you pass AppState or PanResponder subscriptions. The module calls them and stays platform-agnostic.

Every read and every write returns the same envelope:

```
{ success: true, data: { ... }, error: null }
```

## Why Use This Module

1. **Platform-agnostic by design.** Activity sources are injected, never imported. The same module works on web, React Native, and React Native Web. You supply the listeners; the module supplies the state machine.

2. **Pre-tested at every release.** A full test suite runs against React's test renderer in CI on every push. Your project trusts the module instead of re-verifying idle detection logic on each release.

3. **Designed for human review.** The code is laid out as clearly-marked visual sections (section banners, short functions, scoped comments) so a reviewer can read it top to bottom in order. Open the module's source file (`idle.js`) to see the structure.

4. **Hook and function API in one package.** Use `useIdle()` for React components that need reactive idle state. Use `touch()`, `pause()`, `registerIdleHandler()` for non-React code or imperative control. Both share the same threshold registry.

5. **Generic threshold registry.** Register callbacks at any inactivity duration with `registerIdleHandler(ms, callback)`. Fire one at 30s for a warning, another at 5min for auto-logout. The module handles scheduling, re-arming on activity, and cleanup.

## Supported Renderers

This module works with any React 18+ renderer:

- React DOM (web)
- React Native
- React Native Web

Install `react` as a peer dependency. The module receives React by injection, so it bundles no React copy.

## Aligned with Superloom Philosophy

If your project is built on Superloom conventions, this module slots in without you needing to learn anything new. It follows the standard loader pattern, companion file structure, and documentation footprint.

## Extended Documentation

- [API Reference](https://github.com/superloomdev/js-helper-modules/blob/main/src/helper-modules-client/js-react-helper-idle/docs/api.md) - full API, hook signature, activity source contract
- [Configuration](https://github.com/superloomdev/js-helper-modules/blob/main/src/helper-modules-client/js-react-helper-idle/docs/configuration.md) - config keys, peer dependencies, testing tiers
- [Superloom](https://superloom.dev) - the framework

## Adding to Your Project

This module is a peer dependency. Add it to your project's `package.json` and load it through the [loader pattern](https://github.com/superloomdev/superloom/blob/main/docs/server/server-loader.md).

See [npmrc setup](https://github.com/superloomdev/superloom/blob/main/docs/dev/npmrc-setup.md) for one-time GitHub Packages registry configuration.

## Dependencies

No bundled npm packages. All dependencies are peer dependencies:

- `react` (>= 18.0.0) - React hooks (useState, useEffect)
- `@superloomdev/js-helper-utils` - type checks, timestamp utilities
- `@superloomdev/js-helper-debug` - logging, performance audit

## Testing Status

| Tier | Runtime | Status |
|---|---|---|
| Emulated | Node.js + react-test-renderer | Pass |
| Integration | N/A | N/A |

## License

MIT
