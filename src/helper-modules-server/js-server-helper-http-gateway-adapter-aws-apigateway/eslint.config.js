// Info: ESLint flat config for js-server-helper-http-gateway-adapter-aws-apigateway. Delegates to the shared
// @superloomdev/js-helper-eslint-config package via the `base` preset.
// No per-module rule overrides are permitted - if the module cannot pass
// the shared config, the finding goes to the retrospective, not to a local
// override. See docs/languages/js/code-formatting.md for the rule catalog.
const { base } = require('@superloomdev/js-helper-eslint-config');

module.exports = base;
