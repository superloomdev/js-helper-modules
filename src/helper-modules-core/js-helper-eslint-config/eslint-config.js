// Info: Entry point for the shared ESLint configuration. Exports four named
// presets: `base` (Node 24 CommonJS), `esm` (base with sourceType: 'module'),
// `browser` (base plus DOM globals), and `app` (ESM plus JSX plus browser
// globals). Consumers pick a preset by name and never assemble rules themselves.
//
// Compatibility: ESLint 9+ flat config format. Requires @eslint/js as a peer.
'use strict';


// Preset imports. Each preset is a flat-config array ready to be exported
// directly as a consumer's `module.exports`.
const base = require('./presets/base');
const esm = require('./presets/esm');
const browser = require('./presets/browser');
const app = require('./presets/app');


// Public surface. Consumers destructure a preset name:
//   const { base } = require('@superloomdev/js-helper-eslint-config');
module.exports = {
  base: base,
  esm: esm,
  browser: browser,
  app: app
};
