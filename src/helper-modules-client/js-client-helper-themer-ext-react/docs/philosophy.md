# Philosophy

## 1. The Extension Pattern

Themer is a pure engine. It derives a theme from a template and layers, emits it for web or native, and returns plain objects. It has no React, no DOM, no I/O.

The extension adds the thin layer of React plumbing that sits between the engine and a component tree: a context, a provider that holds state, and hooks that read from it. The extension is the boss; the core is the library. The extension imports nothing from the core's source - it receives a built instance via injection and calls its public API.

## 2. Why a Module, Not App Code

The plumbing is generic. Every React app that uses themer needs a context, a provider, and the same three hooks. Writing this in each app duplicates the same 50 lines and invites divergence. A module gives every app the same tested surface.

The vocabulary is not generic. Each app has its own token names, font families, and component registry. That logic stays in the app, passed through the `transform` seam. The module owns the plumbing; the app owns the vocabulary.

## 3. Why Factory, Not Singleton

The provider calls `Lib.React.useState`. A singleton would share one state object across every caller, so two providers mounting the same hook would write into one layer stack. The factory pattern gives each loader call its own React context and its own state, which is the module-level equivalent of the isolation `React.createContext` provides at the tree level.

Two loader calls produce two independent extensions. Two providers rendered from the same factory instance share one context, which is correct when they are part of the same tree. Two providers rendered from different factory instances are fully isolated, which is correct when they belong to different apps or different test cases.

## 4. The Transform Seam

The `transform` prop is the boundary between generic plumbing and app-specific logic. The module calls `transform(built, layers)` inside `useMemo` and spreads the return value into the context. The app decides what to put there:

- **Token bridging**: map the engine's token names to the names a component library expects
- **Font validation**: check that every `font_family` token has a registered family, and flag or substitute
- **Component building**: pre-compute a themed component registry from the emitted tokens
- **Nothing**: omit `transform` and read `built.tokens` directly through `useTokens`

The transform runs inside `useMemo`, so it re-computes only when the theme actually changes. It receives the full `buildTheme` result (tokens, substituted, lossy, corrections, violations, stats), not just the token map, so the app can act on contrast violations and lossy projections too.

## 5. What Stays in the App

| Responsibility | Owner | Note |
|---|---|---|
| Fetching a theme document | The app | The engine takes an already-parsed object |
| Token vocabulary bridging | The app, via `transform` | The module knows no token names |
| Font family validation | The app, via `transform` | The module knows no font registry |
| Themed component registry | The app, via `transform` | The module knows no components |
| Deciding what to do with `violations` | The app | A build tool fails, a runtime accepts |
| Loading fonts | `helper-font` and its extensions | Theming never waits on it |
| Applying the emitted theme to components | The app, or a framework extension | The engine returns plain objects |
