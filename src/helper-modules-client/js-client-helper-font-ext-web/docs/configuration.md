# Configuration

## Config Keys

| Key | Type | Default | Description |
|---|---|---|---|
| `PARENT_SELECTOR` | string | `'head'` | CSS selector for the DOM element to inject style nodes into |

## Peer Dependencies

| Name | Package | Alias |
|---|---|---|
| `Utils` | `@superloomdev/js-helper-utils` | `helper-utils` |
| `Debug` | `@superloomdev/js-helper-debug` | `helper-debug` |
| `Font` | `@superloomdev/js-client-helper-font` | `helper-font` |

## Testing Tiers

| Tier | Runtime | Setup |
|---|---|---|
| Emulated | Node.js | Inject a minimal `document` stub via `shared_libs.Document` |
| Integration | Browser | Real DOM; `document` is available globally |
