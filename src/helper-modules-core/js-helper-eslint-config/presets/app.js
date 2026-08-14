// Info: Application preset for application repos (codebase-demo-client-rnw and
// future product repos). Extends the browser preset with two additions:
//
//   1. JSX parsing support. The languageOptions.parserOptions.ecmaFeatures
//      jsx flag tells ESLint to parse JSX syntax. This does not add React
//     -specific rules - it only allows the parser to understand JSX.
//
//   2. varsIgnorePattern: '^React$'. React is imported for the JSX transform
//      but is not directly referenced in code (the JSX desugars to
//      React.createElement). Without this ignore pattern, every file that
//      imports React triggers no-unused-vars.
//
// The preset inherits all rules from base (via browser) unchanged. No rules
// are overridden - only language options are extended.
//
// Structure: Exports a flat-config array of 5 objects:
//   [0..2] - The 3 objects from base (ignores, recommended, rules + Node globals)
//   [3]     - Browser globals overlay (from browser preset)
//   [4]     - App-specific language options (JSX parsing, React ignore pattern)
//
// Note: The client repo uses a mix of ESM (import/export) and CommonJS
// (require/module.exports). ESLint's flat config handles this by setting
// sourceType to 'module' globally; CommonJS files that use require still
// work because require is in the Node globals from base.
'use strict';

const browser = require('./browser');


/////////////////////////// App Language Options START /////////////////////////

// Additional language options for application repos. Layered on top of
// browser's globals overlay. ESLint merges languageOptions from multiple
// config objects, so these supplement (not replace) the base + browser options.
const APP_LANGUAGE_OPTIONS = {
  ecmaVersion: 2022,
  sourceType: 'module',
  parserOptions: {
    ecmaFeatures: {
      jsx: true
    }
  }
};

//////////////////////////// App Language Options END //////////////////////////


/////////////////////////// Flat-Config Export START ///////////////////////////

// The exported flat-config array. Spreads browser (4 objects) and appends a
// 5th object with JSX parsing support and the React ignore pattern.
//
// The no-unused-vars override uses varsIgnorePattern so that `import React`
// does not trigger the rule. All other rules remain identical to base.
module.exports = [
  ...browser,

  // [4] App-specific language options and rule overrides.
  {
    files: ['**/*.js', '**/*.mjs', '**/*.cjs', '**/*.jsx'],
    languageOptions: APP_LANGUAGE_OPTIONS,
    rules: {
      // React is imported for JSX transform, not directly referenced.
      // Without this, every file with `import React from 'react'` fails.
      'no-unused-vars': ['error', { args: 'after-used', varsIgnorePattern: '^React$' }]
    }
  }
];

//////////////////////////// Flat-Config Export END ////////////////////////////
