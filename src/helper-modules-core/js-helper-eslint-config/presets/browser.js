// Info: base plus the browser global surface. For modules that touch the DOM
// or Web Storage directly (currently only js-client-helper-font-ext-web).
// Layered rather than duplicated so a rule change in base propagates here
// automatically - this preset adds globals only, never overrides rules.
//
// Structure: Exports a flat-config array of 4 objects:
//   [0..2] - The 3 objects from base (ignores, recommended, rules + Node globals)
//   [3]     - Browser globals overlay (document, window, localStorage, etc.)
//
// The spread (`...base`) ensures that any future change to base.js - new rules,
// new ignores, new Node globals - is inherited without editing this file.
'use strict';

const base = require('./base');


//////////////////////////// Browser Globals START /////////////////////////////

// Browser global surface. These are the globals a client-side module may
// reference. Anything not listed here (and not in NODE_GLOBALS from base)
// is an error when referenced.
const BROWSER_GLOBALS = {
  document: 'readonly',
  window: 'readonly',
  localStorage: 'readonly',
  sessionStorage: 'readonly',
  navigator: 'readonly',
  location: 'readonly',
  PopStateEvent: 'readonly'
};

//////////////////////////// Browser Globals END ///////////////////////////////


/////////////////////////// Flat-Config Export START ///////////////////////////

// The exported flat-config array. Spreads base (3 objects) and appends a
// 4th object that adds browser globals on top of the Node globals from base.
// ESLint merges globals from multiple config objects, so both Node and
// browser globals are available in modules using this preset.
module.exports = [
  ...base,

  // [3] Browser globals overlay. No rules are set here - only globals.
  // This ensures the rule set stays identical to base; the only difference
  // is which global variables are recognized.
  {
    files: ['**/*.js', '**/*.mjs', '**/*.cjs', '**/*.jsx'],
    languageOptions: {
      globals: BROWSER_GLOBALS
    }
  }
];

// Named export for test assertions and for the app preset to layer on top.
module.exports.BROWSER_GLOBALS = BROWSER_GLOBALS;

//////////////////////////// Flat-Config Export END ////////////////////////////
