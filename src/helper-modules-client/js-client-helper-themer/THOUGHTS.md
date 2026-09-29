# THOUGHTS.md - helper-themer

Engineering decision journal. Records why the module is designed the way it is, including the places where it deliberately diverges from the constitution and why. Not published.

## Intentional deviations from the function-naming doctrine

### `resolve` and `emit` are not catalog verbs

The engine's public API is two stages, `resolve(template, layers)` then `emit(resolved, template, platform)`, with `buildTheme` running both. The constitution itself names the stages this way (`docs/languages/js/client/theming.md` - "Resolve Then Emit"), the extension module and every template test call them by these names, and the words describe exactly what happens: resolution produces canonical unit-free values, emission projects them onto one platform. A catalog verb (`build`, `generate`, `get`) would be less precise for either stage and would separate the code from the vocabulary the documentation uses. `buildTheme` carries the catalog verb for the one-call form. Decision: keep `resolve` and `emit`; revisit only if the catalog gains a projection verb.

### `validateTemplate` and `validateContract` return `{ success, errors }` shapes

The doctrine's `validate` verb is config-time and throws or returns an error list. These two functions are pre-resolution *reporting* surfaces: they collect every finding (and, for the contract, warnings) so an author sees the whole gap at once, and they never throw on content. `validateContract` is named in several constitution rules (`AGENTS.md` - "Token contract", "Theme token contract") and in the component library's `createSystem` contract, so renaming it to the `check` verb is a constitution change. Decision: keep the names; queue the rename for the launch reset to 1.0.0 with real SemVer, when the constitution's rules are revised in the same pass.

## Injected `Lib.Debug` is declared and unused

The loader takes `{ Utils, Debug }` because the module skeleton (`docs/languages/js/module-structure.md`) fixes that shape for every module, and the engine may report `from_default` reads at debug level in a later version (`docs/languages/js/client/theming.md` - "The default template and the subset rule"). The peer dependency therefore stays declared; a module that drops it would need a skeleton exception, and a consumer that omits it would break the day the debug report lands.
