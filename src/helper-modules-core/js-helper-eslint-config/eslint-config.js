// Info: Entry point for the shared ESLint configuration. Exports named presets.
// Consumers pick a preset by name; they never assemble rules themselves.
'use strict';

const base = require('./presets/base');
const browser = require('./presets/browser');
const app = require('./presets/app');


module.exports = {
  base: base,
  browser: browser,
  app: app
};
