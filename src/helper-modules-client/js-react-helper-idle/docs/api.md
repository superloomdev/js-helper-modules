# API Reference

> Module: `@superloomdev/js-react-helper-idle`
> Class: I (Framework Module)

## Loader

```javascript
const Idle = require('@superloomdev/js-react-helper-idle')({
  React: React,           // required - React 18+ (useState, useEffect)
  Utils: Utils,           // required - helper-utils instance
  Debug: Debug            // required - helper-debug instance
}, {
  idle_ms: 300000         // optional - ms before idle classification flips (default: 300000 = 5 min)
});
```

## React Hook

### useIdle(options)

Bridges the idle state machine into React re-renders. Subscribes to host-supplied activity sources on mount, unsubscribes on unmount.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `options.sources` | `Array<{ subscribe, unsubscribe }>` | No | Activity source subscribe/unsubscribe pairs |
| `options.thresholds` | `Array<{ ms, callback }>` | No | Thresholds to register on mount, unregistered on unmount |

Returns:

```text
{ isIdle, touch, pause, resume }
```

| Field | Type | Description |
|---|---|---|
| `isIdle` | `boolean` | True when idle_ms has elapsed since last activity |
| `touch` | `Function` | Record activity, re-arm thresholds |
| `pause` | `Function` | Pause idle detection |
| `resume` | `Function` | Resume idle detection |

## Control Functions

### touch()

Records user activity. Re-arms all registered thresholds. Ignored while paused (returns `touched: false`).

Returns: `{ success, data: { touched }, error }`

### pause()

Pauses idle detection. Closes the current analytics period, clears all pending threshold timers, and freezes the elapsed clock.

Returns: `{ success, data: { paused }, error }`

### resume()

Resumes idle detection from a paused state. Adjusts `last_active_ms` so `getElapsed()` continues from the frozen value. Reschedules all thresholds for their remaining delta.

Returns: `{ success, data: { paused }, error }`

## Threshold Registration

### registerIdleHandler(ms, callback)

Registers a callback to fire after `ms` milliseconds of continuous inactivity. If `ms` has already elapsed since the last activity, the callback fires immediately.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `ms` | `number` | Yes | Threshold in milliseconds (must be positive) |
| `callback` | `Function` | Yes | Called when threshold fires |

Returns: `{ success, data: { id }, error }`

The returned `id` is used with `unregisterIdleHandler`.

### unregisterIdleHandler(id)

Removes a handler by the id returned from `registerIdleHandler`. Clears the pending timer if one exists.

Returns: `{ success, data: { removed }, error }`

### clearIdleHandlers()

Removes every registered handler. Returns the count of removed handlers.

Returns: `{ success, data: { removed_count }, error }`

## Query Functions

### getElapsed()

Returns milliseconds elapsed since the last recorded activity. Frozen while paused.

Returns: `Number` (elapsed ms)

### getLastActive()

Returns the timestamp (Unix ms) of the last recorded activity.

Returns: `Number` (Unix ms timestamp)

### getTotalIdle()

Returns total milliseconds spent in the idle state, including the in-progress period.

Returns: `Number` (total idle ms)

### getTotalActive()

Returns total milliseconds spent in the active state, including the in-progress period.

Returns: `Number` (total active ms)

## Callback Registration

Callbacks are registered via `registerIdleHandler(ms, callback)` (see Threshold Registration above). The module does not provide fixed `onIdle`/`onPrompt`/`onActive` callbacks. Instead, the host registers as many thresholds as needed at any ms value.

## Activity Source Contract

Activity sources are injected by the host. The module never references `document`, `window`, or `react-native`. Each source is an object with a `subscribe` function:

```text
{
  subscribe: function(onActivity) -> unsubscribe function
}
```

### Web Example

```javascript
function createDOMActivitySource() {
  return {
    subscribe: function (onActivity) {
      var events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
      events.forEach(function (e) {
        document.addEventListener(e, onActivity, { passive: true });
      });
      return function () {
        events.forEach(function (e) {
          document.removeEventListener(e, onActivity);
        });
      };
    }
  };
}
```

### React Native Example

```javascript
function createRNActivitySource() {
  return {
    subscribe: function (onActivity) {
      var subscription = AppState.addEventListener('change', onActivity);
      return function () {
        subscription.remove();
      };
    }
  };
}
```

## Idle Classification

The module tracks elapsed time since the last activity. When elapsed exceeds `idle_ms`, the analytics classification flips from active to idle. This classification drives `getTotalIdle()` and `getTotalActive()`.

Registered thresholds fire independently of the classification - a threshold at 500ms fires at 500ms regardless of `idle_ms`.
