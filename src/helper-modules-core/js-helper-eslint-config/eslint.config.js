// Info: Self-hosted ESLint config for the js-helper-eslint-config package itself.
// Uses a relative require (not the package name) so the package never depends
// on a published copy of itself. Consumers use the package name instead:
//   const { base } = require('@superloomdev/js-helper-eslint-config');
const { base } = require('./eslint-config');

module.exports = base;
