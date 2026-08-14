# API Reference. `helper-eslint-config`

Every exported preset with its rule set and globals. For dependency and setup notes see [Configuration](https://github.com/superloomdev/superloom/blob/main/src/helper-modules-core/js-helper-eslint-config/docs/configuration.md).

## On This Page

- [Presets](#presets)
- [Rule Blocks](#rule-blocks)
- [Globals](#globals)

---

## Presets

### `base`

The Node 24 CommonJS baseline. Every Superloom module lints against this unless it needs browser globals or ESM/JSX support.

**Shape:** Array of 3 config objects.

| Index | Contents |
|---|---|
| 0 | Ignores: `_test/**`, `node_modules/**`, `.git/**`, `coverage/**` |
| 1 | `js.configs.recommended` (from `@eslint/js`) |
| 2 | Language options (`ecmaVersion: 2022`, `sourceType: 'commonjs'`, Node 24 globals) plus the full rule set |

### `browser`

`base` plus browser globals layered on top. For modules that touch the DOM or Web Storage directly.

**Shape:** Array of 4 config objects (the 3 from `base` plus a globals overlay).

Browser globals added: `document`, `window`, `localStorage`, `sessionStorage`, `navigator`, `location`.

### `app`

ESM plus JSX plus browser globals. For application repos. Finalized during the client rollout phase.

---

## Rule Blocks

The rule set is organized into named blocks:

### Code Style

| Rule | Setting | Purpose |
|---|---|---|
| `semi` | `['error', 'always']` | Require semicolons |
| `quotes` | `['error', 'single']` | Single quotes only |
| `indent` | `['error', 2]` | Two-space indentation, no `SwitchCase` option |
| `comma-dangle` | `['error', 'never']` | No trailing commas |
| `no-trailing-spaces` | `'error'` | No trailing whitespace |
| `eol-last` | `'error'` | Require newline at end of file |

### Spacing

| Rule | Setting | Purpose |
|---|---|---|
| `padding-line-between-statements` | 4 entries | Blank lines around blocks and functions |
| `no-multiple-empty-lines` | `['error', { max: 3, maxEOF: 1, maxBOF: 0 }]` | Codifies 3/2/1 banner spacing |
| `space-before-function-paren` | `['error', 'always']` | Space before function parentheses |
| `space-before-blocks` | `'error'` | Space before opening braces |
| `keyword-spacing` | `'error'` | Space after keywords |
| `space-infix-ops` | `'error'` | Space around operators |
| `object-curly-spacing` | `['error', 'always']` | Spaces inside curly braces |
| `array-bracket-spacing` | `['error', 'never']` | No spaces inside array brackets |
| `comma-spacing` | `['error', { before: false, after: true }]` | Comma spacing |
| `curly` | `['error', 'all']` | Always use braces |
| `brace-style` | `['error', '1tbs', { allowSingleLine: false }]` | One true brace style |

### Variables

| Rule | Setting | Purpose |
|---|---|---|
| `no-unused-vars` | `['error', { args: 'after-used' }]` | No unused args, no underscore escape |
| `no-var` | `'error'` | Use `let` or `const` |
| `prefer-const` | `['error', { destructuring: 'any' }]` | Prefer `const` where possible |

### Safety

| Rule | Setting |
|---|---|
| `no-eval` | `'error'` |
| `no-implied-eval` | `'error'` |
| `no-new-func` | `'error'` |
| `no-with` | `'error'` |
| `no-alert` | `'error'` |
| `no-throw-literal` | `'error'` |
| `prefer-promise-reject-errors` | `'error'` |
| `no-async-promise-executor` | `'error'` |
| `no-constant-binary-expression` | `'error'` |
| `no-duplicate-imports` | `'error'` |
| `no-self-compare` | `'error'` |

### Disabled (flexibility)

| Rule | Setting | Reason |
|---|---|---|
| `array-element-newline` | `'off'` | Array formatting stays flexible |
| `array-bracket-newline` | `'off'` | Array formatting stays flexible |
| `object-curly-newline` | `'off'` | Object formatting stays flexible |
| `object-property-newline` | `'off'` | Object formatting stays flexible |

---

## Globals

### Node 24 surface (in `base`)

`console`, `process`, `Buffer`, `__dirname`, `__filename`, `global`, `globalThis`, `module`, `require`, `exports`, `structuredClone`, `URL`, `URLSearchParams`, `setTimeout`, `clearTimeout`, `setInterval`, `clearInterval`, `setImmediate`, `queueMicrotask`, `TextEncoder`, `TextDecoder`, `atob`, `btoa`, `crypto`, `fetch`, `AbortController`, `AbortSignal`, `Blob`, `FormData`, `Headers`, `Request`, `Response`.

### Browser surface (in `browser` and `app`)

`document`, `window`, `localStorage`, `sessionStorage`, `navigator`, `location`.
