# Configuration

> Module: `@superloomdev/js-react-helper-idle`
> Class: I (Framework Module)

## Loader

```javascript
const Idle = require('@superloomdev/js-react-helper-idle')({
  React: React,
  Utils: Utils,
  Debug: Debug
}, config);
```

## Config Keys

| Key | Type | Default | Required | Description |
|---|---|---|---|---|
| `idle_ms` | `number` | `300000` | No | Milliseconds of inactivity before the idle classification flips |

## Peer Dependencies

| Package | Alias | Version | Purpose |
|---|---|---|---|
| `@superloomdev/js-helper-utils` | `helper-utils` | `^1.0.0` | Type checks, timestamp utilities |
| `@superloomdev/js-helper-debug` | `helper-debug` | `^1.0.0` | Logging, performance audit |
| `react` | - | `>=18.0.0` | React hooks (useState, useEffect) |

## Environment Variables

None. This module reads no environment variables.

## Testing Tiers

| Tier | Runtime | Status |
|---|---|---|
| Emulated | Node.js + react-test-renderer | Pass |
| Integration | N/A (no external service) | N/A |

Tests run in pure Node with a stub React injection. No Metro, no browser, no emulator required.
