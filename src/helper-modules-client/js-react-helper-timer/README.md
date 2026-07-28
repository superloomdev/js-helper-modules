# @superloomdev/js-react-helper-timer

![MIT License](https://img.shields.io/badge/license-MIT-blue)
![Node 24+](https://img.shields.io/badge/node-%3E%3D24-green)

A keyed count-down and count-up timer helper for React with drift-corrected remaining and elapsed, pause/resume/reset, and `useTimer`/`useCountdown` hooks. Part of [Superloom](https://superloom.dev).

## What This Is

A standalone timer module for React applications. It manages keyed timers with wall-clock-based drift correction, so a one-hour countdown does not accumulate error from tick jitter. Both a React hook and plain functions are provided for controlling timers.

The module does not reference `document`, `window`, or `react-native`. React is injected by the host. Every function returns the standard envelope:

```
{ success: true, data: { ... }, error: null }
```

## Why Use This Module

1. **Drift-corrected by design.** Remaining and elapsed are computed from wall-clock arithmetic against a stored deadline, never by decrementing a counter on each tick. The tick callback is a display feed, not the source of truth.

2. **Keyed timers in one instance.** `start(key, options)` and every other function take a `key`, defaulting to `'default'`. KDS order-age tickers, POS auto-lock countdowns, and attract-loop rotations can all share one module instance.

3. **Pre-tested at every release.** A full test suite runs against React's test renderer in CI on every push.

4. **Designed for human review.** The code is laid out as clearly-marked visual sections (section banners, short functions, scoped comments) so a reviewer can read it top to bottom in order.

5. **Hook and function API in one package.** Use `useTimer()` or `useCountdown()` for React components that need reactive display values. Use `start()`, `pause()`, `resume()` for non-React code or imperative control.

## Boundary Against Idle

This module is distinct from `js-react-helper-idle`. The idle module detects inactivity (clock starts implicitly at last activity, resets on user input). This module is an explicit timer (clock starts when the application calls `start`, never observes activity).

## Supported Renderers

This module works with any React 18+ renderer:

- React DOM (web)
- React Native
- React Native Web

Install `react` as a peer dependency. The module receives React by injection, so it bundles no React copy.

## Documentation

- [API Reference](docs/api.md)
- [Configuration](docs/configuration.md)

## License

MIT
