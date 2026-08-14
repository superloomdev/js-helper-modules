// Info: The Node 24 CommonJS baseline. Every Superloom module lints against
// this preset unless it needs browser globals (use `browser`) or ESM/JSX
// (use `app`). Globals are the Node 24 global surface only - no browser
// globals - so a stray `document` or `window` reference in a server module
// is caught as no-undef.
//
// Compatibility: ESLint 9+ flat config format. Requires @eslint/js as a peer.
//
// Structure: Exports a flat-config array of 3 objects:
//   [0] - Global ignores (test dirs, node_modules, .git, coverage)
//   [1] - js.configs.recommended (baseline security and correctness rules)
//   [2] - Language options (ecmaVersion, sourceType, Node 24 globals) plus
//         the full rule set (code style, spacing, variables, safety)
//
// The rule set is split into named blocks so docs/api.md can describe each
// block independently. NODE_GLOBALS and RULES are also attached as named
// exports so the browser and app presets can layer on top without duplicating.
'use strict';

const js = require('@eslint/js');


///////////////////////////// Node Globals START ///////////////////////////////

// Node 24 global surface. Anything not listed here is an error when referenced.
// This covers the full Node 24 runtime: core modules, timers, Web APIs that
// Node 24 exposes globally (fetch, crypto, AbortController, etc.).
const NODE_GLOBALS = {
  console: 'readonly',
  process: 'readonly',
  Buffer: 'readonly',
  __dirname: 'readonly',
  __filename: 'readonly',
  global: 'readonly',
  globalThis: 'readonly',
  module: 'readonly',
  require: 'readonly',
  exports: 'readonly',
  structuredClone: 'readonly',
  URL: 'readonly',
  URLSearchParams: 'readonly',
  setTimeout: 'readonly',
  clearTimeout: 'readonly',
  setInterval: 'readonly',
  clearInterval: 'readonly',
  setImmediate: 'readonly',
  queueMicrotask: 'readonly',
  TextEncoder: 'readonly',
  TextDecoder: 'readonly',
  atob: 'readonly',
  btoa: 'readonly',
  crypto: 'readonly',
  fetch: 'readonly',
  AbortController: 'readonly',
  AbortSignal: 'readonly',
  Blob: 'readonly',
  FormData: 'readonly',
  Headers: 'readonly',
  Request: 'readonly',
  Response: 'readonly'
};

////////////////////////////// Node Globals END ////////////////////////////////


/////////////////////////////// Rules START ///////////////////////////////////

// The rule set. Organized into named blocks matching docs/api.md:
//   - Code style (semicolons, quotes, indentation, trailing commas)
//   - Spacing (blank lines, function/block padding, keyword/operator spacing)
//   - Variables (no-unused-vars, no-var, prefer-const)
//   - Safety (eval, implied-eval, throw-literal, etc.)
//
// Key decisions documented inline so future maintainers know WHY a value is
// what it is, not just WHAT it is.
const RULES = {
  // Code style
  'semi': ['error', 'always'],
  'quotes': ['error', 'single'],
  'indent': ['error', 2],
  'comma-dangle': ['error', 'never'],
  'no-trailing-spaces': 'error',
  'eol-last': 'error',

  // Spacing - blank lines around functions and blocks
  'padding-line-between-statements': [
    'error',
    { blankLine: 'always', prev: 'block', next: '*' },
    { blankLine: 'always', prev: '*', next: 'block' },
    { blankLine: 'always', prev: 'function', next: '*' },
    { blankLine: 'always', prev: '*', next: 'function' }
  ],

  // Codifies the house 3/2/1 banner spacing. max:2 would flag 202 sites.
  'no-multiple-empty-lines': ['error', { max: 3, maxEOF: 1, maxBOF: 0 }],

  // Array and object formatting stays flexible
  'array-element-newline': 'off',
  'array-bracket-newline': 'off',
  'object-curly-newline': 'off',
  'object-property-newline': 'off',

  // Additional formatting preferences
  'space-before-function-paren': ['error', 'always'],
  'space-before-blocks': 'error',
  'keyword-spacing': 'error',
  'space-infix-ops': 'error',
  'object-curly-spacing': ['error', 'always'],
  'array-bracket-spacing': ['error', 'never'],
  'comma-spacing': ['error', { before: false, after: true }],
  'curly': ['error', 'all'],
  'brace-style': ['error', '1tbs', { allowSingleLine: false }],

  // No underscore escape. Parity params use an inline eslint-disable-line.
  'no-unused-vars': ['error', { args: 'after-used' }],

  // Modern JS preferences
  'no-var': 'error',
  'prefer-const': ['error', { destructuring: 'any' }],

  // Correctness and safety
  'no-eval': 'error',
  'no-implied-eval': 'error',
  'no-new-func': 'error',
  'no-with': 'error',
  'no-alert': 'error',
  'no-throw-literal': 'error',
  'prefer-promise-reject-errors': 'error',
  'no-async-promise-executor': 'error',
  'no-constant-binary-expression': 'error',
  'no-duplicate-imports': 'error',
  'no-self-compare': 'error'
};

//////////////////////////////// Rules END //////////////////////////////////////


/////////////////////////// Flat-Config Export START ///////////////////////////

// The exported flat-config array. ESLint consumes this directly when a
// consumer's `eslint.config.js` does `module.exports = base`.
module.exports = [

  // [0] Global ignores. Directories that ESLint should never lint.
  {
    ignores: [
      '_test/**',
      'node_modules/**',
      '.git/**',
      'coverage/**'
    ]
  },

  // [1] Baseline recommended rules from @eslint/js. Provides security and
  // correctness rules like no-undef, no-unused-vars (overridden below),
  // no-cond-assign, etc.
  js.configs.recommended,

  // [2] Project rules. Language options (Node 24 globals, CommonJS) plus
  // the full rule set defined above. This is the block that consumers
  // override if they need browser globals (see presets/browser.js).
  {
    files: ['**/*.js', '**/*.mjs', '**/*.cjs'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: NODE_GLOBALS
    },
    rules: RULES
  }
];

// Named exports for preset layering. The browser preset spreads `base` and
// adds its own globals overlay; it needs NODE_GLOBALS to avoid duplication.
// RULES is exported for test assertions and documentation generation.
module.exports.NODE_GLOBALS = NODE_GLOBALS;
module.exports.RULES = RULES;

//////////////////////////// Flat-Config Export END ////////////////////////////
