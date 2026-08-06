# Configuration

## Config Keys

| Key | Type | Default | Description |
|---|---|---|---|
| `DEFAULT_FAMILY` | string | `'System'` | Fallback family when `resolveFamily` cannot find a token |
| `roles` | object | `{}` | Role-to-family mapping seeded at construction. Can be extended at runtime via `registerRoles()` |

## Peer Dependencies

| Name | Package | Alias |
|---|---|---|
| `Utils` | `@superloomdev/js-helper-utils` | `helper-utils` |
| `Debug` | `@superloomdev/js-helper-debug` | `helper-debug` |

## Testing Tiers

| Tier | Runtime | Setup |
|---|---|---|
| Unit | Node.js | No stubs required; pure computation |
