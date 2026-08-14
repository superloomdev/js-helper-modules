// Info: ESLint flat config for js-client-helper-font-ext-web. Delegates to the shared
// @superloomdev/js-helper-eslint-config package via the `browser` preset
// (base plus DOM globals). No per-module rule overrides are permitted.
// See docs/languages/js/code-formatting.md for the rule catalog.
const { browser } = require('@superloomdev/js-helper-eslint-config');

module.exports = browser;
