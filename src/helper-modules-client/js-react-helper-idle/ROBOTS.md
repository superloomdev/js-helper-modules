# ROBOTS.md - AI Agent Reference

> Compact reference for code generation. For human docs see README.md

## Type

Class I Framework Module. No external service dependency. React injected via `shared_libs.React`.

## Peer Dependencies

| Injection Name | Package | Alias |
|---|---|---|
| `React` | `react` | - |
| `Utils` | `@superloomdev/js-helper-utils` | `helper-utils` |
| `Debug` | `@superloomdev/js-helper-debug` | `helper-debug` |

## Direct Dependencies

None. All dependencies are peer dependencies.

## Companion Files

- `idle.config.js` - keys: `idle_ms` (default 300000)
- `idle.errors.js` - constants: `INVALID_CALLBACK`, `INVALID_THRESHOLD`, `INVALID_CONFIG`
- `idle.validators.js` - functions: `validateConfig(CONFIG)`, `validateUseIdle(options)`

## Loader Pattern

```javascript
import idle from '@superloomdev/js-react-helper-idle';

const Idle = idle({
  React: React,
  Utils: Utils,
  Debug: Debug
}, {
  idle_ms: 300000
});
```

## Config Keys

| Key | Type | Default | Required |
|---|---|---|---|
| `idle_ms` | number | 300000 | No |

## Exported Functions (11 total)

### React Hook

```
useIdle(options) → { isIdle, touch, pause, resume } | async:no
  React hook bridging the idle threshold registry into re-renders.
  options.sources: array of { subscribe(onActivity) → unsubscribe } objects.
  options.thresholds: array of { ms, callback } to register on mount.
```

### Control

```
touch() → { success, data: { touched }, error } | async:no
  Records activity. Re-arms all registered thresholds. Ignored while paused.

pause() → { success, data: { paused }, error } | async:no
  Pauses idle detection. Closes analytics period, clears timers. Idempotent.

resume() → { success, data: { paused }, error } | async:no
  Resumes from paused. Reschedules thresholds for remaining delta. Idempotent.
```

### Threshold Registration

```
registerIdleHandler(ms, callback) → { success, data: { id }, error } | async:no
  Registers callback to fire after ms of continuous inactivity.
  ms must be a positive number. callback must be a function.
  Returns unique id for unregister.

unregisterIdleHandler(id) → { success, data: { removed }, error } | async:no
  Removes handler by id. Clears pending timer. Unknown id returns removed: false.

clearIdleHandlers() → { success, data: { removed_count }, error } | async:no
  Removes all handlers. Returns count of removed handlers.
```

### Query

```
getElapsed() → Number | async:no
  Ms since last activity. Frozen while paused.

getLastActive() → Number | async:no
  Unix ms timestamp of last activity.

getTotalIdle() → Number | async:no
  Total ms spent in idle state, including in-progress period.

getTotalActive() → Number | async:no
  Total ms spent in active state, including in-progress period.
```

## Patterns

- **Factory-per-loader**: each `loader(shared_libs, config)` call returns an independent instance
- **Framework injection**: React arrives via `shared_libs.React`, never `import React`
- **Activity source injection**: host supplies subscribe/unsubscribe pairs; module never references DOM or RN APIs
- **Threshold registry**: caller-defined idle thresholds with generic ms/callback pairs
- **Return envelope**: all functions return `{ success, data, error }`

## Error Catalog

| Constant | Type | Trigger |
|---|---|---|
| `INVALID_CALLBACK` | `helper-idle/invalid-callback` | Non-function passed to registerIdleHandler |
| `INVALID_THRESHOLD` | `helper-idle/invalid-threshold` | Non-positive ms passed to registerIdleHandler |
| `INVALID_CONFIG` | `helper-idle/invalid-config` | Config validation failed |
