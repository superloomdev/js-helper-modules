# ROBOTS.md - js-react-helper-timer

> Compact reference for AI agents. Read this before calling any function.

## Module

| Field | Value |
|---|---|
| Package | `@superloomdev/js-react-helper-timer` |
| Alias | `helper-timer` |
| Class | I (Framework Module) |
| Entry | `timer.js` |
| Peers | `react >=18.0.0`, `helper-utils ^1.0.0`, `helper-debug ^1.0.0` |

## Injected Dependencies

| Parameter | Source | Alias |
|---|---|---|
| `React` | `react` | - |
| `Utils` | `@superloomdev/js-helper-utils` | `helper-utils` |
| `Debug` | `@superloomdev/js-helper-debug` | `helper-debug` |

## Direct Dependencies

None. All dependencies are peer dependencies.

## Companion Files

- `timer.config.js` - no config keys (options are per-start)
- `timer.errors.js` - constants: `INVALID_DURATION`, `INVALID_DIRECTION`, `INVALID_TICK_MS`, `INVALID_CALLBACK`, `TIMER_NOT_FOUND`
- `timer.validators.js` - functions: `validateConfig(CONFIG)`, `validateStart(options)`

## Loader Pattern

```javascript
const Timer = require('@superloomdev/js-react-helper-timer')({
  React: React,
  Utils: Utils,
  Debug: Debug
}, {});
```

## Exported Functions (11 total)

### Timer Lifecycle

```
start(key, options) -> { success, data: { key, state }, error } | async:no
  Start a keyed timer. key defaults to 'default'.
  options: { duration_ms (required), direction ('down'|'up', default 'down'),
             tick_ms (default 1000), onTick, onDone }

pause(key) -> { success, data: { key, paused }, error } | async:no
  Pause a timer. Idempotent. Unknown key returns error.

resume(key) -> { success, data: { key, paused }, error } | async:no
  Resume a paused timer. Idempotent. Unknown key returns error.

stop(key) -> { success, data: { key, stopped }, error } | async:no
  Stop and delete a timer. Unknown key returns error.

reset(key) -> { success, data: { key, state }, error } | async:no
  Restart a timer from now with same options. Unknown key returns error.

stopAll() -> { success, data: { stopped_count }, error } | async:no
  Stop every timer and clear the registry.
```

### Query

```
getRemaining(key) -> { success, data: { remaining_ms }, error } | async:no
  Drift-corrected remaining ms. 0 for count-up or expired. Unknown key returns error.

getElapsed(key) -> { success, data: { elapsed_ms }, error } | async:no
  Drift-corrected elapsed ms (subtracts paused time). Unknown key returns error.

getState(key) -> { success, data: { key, state, direction, paused }, error } | async:no
  Current timer state. Unknown key returns error.
```

### React Hooks

```
useTimer(key, options) -> { value, start, pause, resume, stop, reset, getRemaining, getElapsed } | async:no
  React hook. Owns useState for displayed value. Stops on unmount.

useCountdown(key, duration_ms) -> same as useTimer | async:no
  Convenience wrapper. direction fixed to 'down'.
```

## Patterns

- **Factory-per-loader**: each `loader(shared_libs, config)` call returns an independent instance
- **Framework injection**: React arrives via `shared_libs.React`, never `import React`
- **Drift correction**: remaining/elapsed computed from wall-clock arithmetic, never per-tick counter
- **Keyed timers**: all functions accept key (default `'default'`); keys supplied by caller
- **Return envelope**: all functions return `{ success, data, error }`

## Error Catalog

| Constant | Type | Trigger |
|---|---|---|
| `INVALID_DURATION` | `helper-timer/invalid-duration` | Non-positive or non-number duration_ms (thrown as TypeError) |
| `INVALID_DIRECTION` | `helper-timer/invalid-direction` | Direction not 'down' or 'up' (thrown as TypeError) |
| `INVALID_TICK_MS` | `helper-timer/invalid-tick-ms` | Non-positive or non-number tick_ms (thrown as TypeError) |
| `INVALID_CALLBACK` | `helper-timer/invalid-callback` | onTick or onDone not a function (thrown as TypeError) |
| `TIMER_NOT_FOUND` | `helper-timer/not-found` | No timer found for the given key |
