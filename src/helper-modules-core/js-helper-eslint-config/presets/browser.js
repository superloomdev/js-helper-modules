// Info: base plus the browser global surface. For modules that touch the DOM
// or Web Storage directly. Layered rather than duplicated so a rule change in
// base propagates here automatically.
'use strict';

const base = require('./base');


const BROWSER_GLOBALS = {
  document: 'readonly',
  window: 'readonly',
  localStorage: 'readonly',
  sessionStorage: 'readonly',
  navigator: 'readonly',
  location: 'readonly'
};


module.exports = [
  ...base,
  {
    files: ['**/*.js', '**/*.mjs', '**/*.cjs'],
    languageOptions: {
      globals: BROWSER_GLOBALS
    }
  }
];

module.exports.BROWSER_GLOBALS = BROWSER_GLOBALS;
