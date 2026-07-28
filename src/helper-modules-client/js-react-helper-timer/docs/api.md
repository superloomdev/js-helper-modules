# API Reference

> Module: `@superloomdev/js-react-helper-timer`
> Class: I (Framework Module)

## Loader

```javascript
const Timer = require('@superloomdev/js-react-helper-timer')({
  React: React,           // required - React 18+ (useState, useEffect)
  Utils: Utils,           // required - helper-utils instance
  Debug: Debug            // required - helper-debug instance
}, {
  // No config keys - timer options are passed per-start call
});
```

## Boundary Against Idle

This module is distinct from `js-react-helper-idle`. The idle module detects inactivity (clock starts implicitly at last activity, resets on user input). This module is an explicit timer (clock starts when the application calls `start`, never observes activity). Two different questions, two different modules.

## Timer Lifecycle

### start(key, options)

Starts a keyed timer. If the key already exists, the previous timer is stopped and replaced.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `key` | `string` | No | Timer key (defaults to `'default'`) |
| `options.duration_ms` | `number` | Yes | Total duration in milliseconds (must be positive) |
| `options.direction` | `string` | No | `'down'` or `'up'` (default: `'down'`) |
| `options.tick_ms` | `number` | No | Tick interval in ms (default: `1000`) |
| `options.onTick` | `Function` | No | Called on each tick with the current value |
| `options.onDone` | `Function` | No | Called when a countdown reaches zero |

Returns: `{ success, data: { key, state }, error }`

### pause(key)

Pauses a keyed timer. Freezes the elapsed clock and clears pending tick/done timers. Idempotent.

Returns: `{ success, data: { key, paused }, error }`

### resume(key)

Resumes a paused timer. Adjusts the pause accumulator so `getRemaining` and `getElapsed` continue from the frozen value. Reschedules tick/done timers for the remaining delta. Idempotent.

Returns: `{ success, data: { key, paused }, error }`

### stop(key)

Stops a keyed timer. Clears all timers and removes the record.

Returns: `{ success, data: { key, stopped }, error }`

### reset(key)

Resets a keyed timer to its initial state. Keeps the same options but restarts the clock from now. Clears any pause state.

Returns: `{ success, data: { key, state }, error }`

### stopAll()

Stops every timer and clears the registry.

Returns: `{ success, data: { stopped_count }, error }`

## Query Functions

### getRemaining(key)

Returns milliseconds remaining for a countdown timer. Computed from wall-clock arithmetic against a stored deadline, never by decrementing a per-tick counter. Returns 0 for count-up timers or when time has expired.

Returns: `{ success, data: { remaining_ms }, error }`

### getElapsed(key)

Returns milliseconds elapsed since the timer started. Computed from wall-clock arithmetic, subtracting paused time. Frozen while paused.

Returns: `{ success, data: { elapsed_ms }, error }`

### getState(key)

Returns the current state of a keyed timer.

Returns: `{ success, data: { key, state, direction, paused }, error }`

## React Hooks

### useTimer(key, options)

React hook for a keyed timer. Owns `useState` for the displayed value, feeds it from `onTick`, and stops the timer on unmount.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `key` | `string` | No | Timer key (defaults to `'default'`) |
| `options` | `Object` | Yes | Same options as `start()` |

Returns:

```text
{ value, start, pause, resume, stop, reset, getRemaining, getElapsed }
```

| Field | Type | Description |
|---|---|---|
| `value` | `number` | Current displayed value (updated on each tick) |
| `start` | `Function` | Start the timer with new or existing options |
| `pause` | `Function` | Pause the timer |
| `resume` | `Function` | Resume the timer |
| `stop` | `Function` | Stop the timer |
| `reset` | `Function` | Reset the timer |
| `getRemaining` | `Function` | Get remaining ms |
| `getElapsed` | `Function` | Get elapsed ms |

### useCountdown(key, duration_ms)

Convenience wrapper around `useTimer` with direction fixed to `'down'`. The countdown starts automatically on mount and stops on unmount.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `key` | `string` | No | Timer key (defaults to `'default'`) |
| `duration_ms` | `number` | Yes | Countdown duration in ms |

Returns: same shape as `useTimer`.

## Drift Correction

Remaining and elapsed values are computed from wall-clock arithmetic (`Utils.getUnixTimeInMilliSeconds() - start_ms - pause_accumulated_ms`), never by decrementing a counter on each tick. A one-hour countdown does not accumulate error from tick jitter or missed intervals. The tick callback is a display feed, not the source of truth.

## Keyed Timers

All functions accept a `key` parameter (defaulting to `'default'`). This allows multiple concurrent timers within one module instance. Use cases: KDS order-age tickers (one per order), POS auto-lock countdown alongside attract-loop rotation. Keys are supplied by the caller; the module does not generate IDs.
