// Info: ESM variant of the base preset. Same rules and Node globals as base,
// but with sourceType: 'module' for packages that use "type": "module".
// Used by foundation modules migrating from CommonJS to ESM.
//
// Structure: Exports a flat-config array of 3 objects:
//   [0] - Global ignores (from base, unchanged)
//   [1] - js.configs.recommended (from base, unchanged)
//   [2] - Language options (ecmaVersion, sourceType: 'module', Node 24 globals)
//         plus the full rule set from base
//
// The rule set and globals are identical to base. Only sourceType differs.
// NODE_GLOBALS includes `module` and `require` because ESM modules may use
// createRequire(import.meta.url) for CJS interop.
'use strict';

const base = require('./base');


/////////////////////////// Flat-Config Export START ///////////////////////////

// The exported flat-config array. Spreads base's first two objects (ignores
// and recommended) and replaces the third with ESM language options.
module.exports = [
  base[0],

  base[1],

  // [2] Project rules with ESM sourceType
  {
    files: ['**/*.js', '**/*.mjs', '**/*.cjs', '**/*.jsx'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: base.NODE_GLOBALS
    },
    rules: base.RULES
  }
];

//////////////////////////// Flat-Config Export END ////////////////////////////
