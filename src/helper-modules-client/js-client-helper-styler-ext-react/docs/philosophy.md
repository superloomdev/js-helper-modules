# Philosophy. Extension Pattern

Extension consumes core. That is the whole pattern.

## The Difference

**Adapter pattern**: Core calls adapter. Core is boss.  
**Extension pattern**: Extension calls core. Extension is boss.

Extension → Core means:
- Extension imports the core package
- Extension decides when to call core functions
- Core provides pure functions, knows nothing about the extension

## Why This Matters

Core stays pure. No React, no Vue, no framework code. Extension adds the framework layer.

Example with this module:

**Core (pure JavaScript)**
```js
const Styler = require('@superloomdev/js-client-helper-styler')({});
const theme = Styler.assemble(Styler.template, base, variant);
```

**Extension (React)**
```js
const Ext = require('@superloomdev/js-client-helper-styler-ext-react')({
  React: require('react')
});

// In your component
const theme = Ext.useTheme();  // gets reactive theme from context
```

The extension imports the core. Not the other way around.

## Naming

Extensions use `ext-[framework]` suffix:
- `js-client-helper-styler-ext-react` (works with React DOM, React Native, React Native Web)
- Future: `js-client-helper-styler-ext-vue`
- Future: `js-client-helper-styler-ext-angular`

## When to Use Extension

Use extension when:
- Core is pure and should stay pure
- Framework adds real value (context, hooks, lifecycle)
- You might support multiple frameworks

Do not use extension when:
- Core needs pluggable parts (use adapter instead)
- Only one framework ever (add to core)

## This Module

This module wraps the styler core in React. It provides:
- ThemeProvider — puts theme in React context
- useTheme — hook to read theme
- useStyles — hook to read utility styles
- useThemeController — hook to get theme + update function

Core provides the engine. Extension provides the React integration.
