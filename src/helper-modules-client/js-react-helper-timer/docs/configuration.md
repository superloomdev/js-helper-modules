# Configuration

> Module: `@superloomdev/js-react-helper-timer`

## Loader

```javascript
import timer from '@superloomdev/js-react-helper-timer';

const Timer = timer({
  React: React,
  Utils: Utils,
  Debug: Debug
}, config);
```

## Config Keys

No config keys. Timer options are passed per-start call. This file exists for structural uniformity with other Superloom modules.

## Peer Dependencies

| Package | Alias | Version | Purpose |
|---|---|---|---|
| `@superloomdev/js-helper-utils` | `helper-utils` | `^1.0.0` | Type checks, timestamp utilities |
| `@superloomdev/js-helper-debug` | `helper-debug` | `^1.0.0` | Logging, performance audit |
| `react` | - | `>=18.0.0` | React hooks (useState, useEffect) |

## Environment Variables

None. The timer module reads no environment variables.
