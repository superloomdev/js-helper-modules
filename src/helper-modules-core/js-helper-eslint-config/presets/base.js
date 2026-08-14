// Info: The Node 24 CommonJS baseline. Every Superloom module lints against this.
// Globals are the Node 24 global surface only - no browser globals - so a stray
// `document` or `window` reference in a server module is caught as no-undef.
'use strict';

const js = require('@eslint/js');


// Node 24 global surface. Anything not listed here is an error when referenced.
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


// The rule set. Split into named blocks so docs/api.md can describe each block.
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


module.exports = [
  {
    ignores: [
      '_test/**',
      'node_modules/**',
      '.git/**',
      'coverage/**'
    ]
  },

  js.configs.recommended,

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

module.exports.NODE_GLOBALS = NODE_GLOBALS;
module.exports.RULES = RULES;
