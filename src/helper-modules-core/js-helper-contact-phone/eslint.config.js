// Info: ESLint flat config for helper-contact-phone. Delegates to the shared
// @superloomdev/js-helper-eslint-config package via the `base` preset.
// No per-module rule overrides are permitted - if the module cannot pass
// the shared config, the finding goes to the retrospective, not to a local
// override.
const { base } = require('@superloomdev/js-helper-eslint-config');

module.exports = base;
