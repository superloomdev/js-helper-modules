'use strict';

const js = require('@eslint/js');

module.exports = [
  // Global ignores
  {
    ignores: [
      'node_modules/**',
      '_test/node_modules/**'
    ]
  },

  // Recommended rules
  js.configs.recommended,

  // Project rules
  {
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'commonjs',
      globals: {
        require: 'readonly',
        module: 'readonly',
        exports: 'readonly',
        __dirname: 'readonly',
        process: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly'
      }
    },
    rules: {
      // Code style
      'no-unused-vars': ['error', { args: 'none' }],
      'no-var': 'error',
      'prefer-const': 'error',
      'no-redeclare': 'error',
      'no-undef': 'error',

      // Formatting
      'semi': ['error', 'always'],
      'quotes': ['error', 'single'],
      'indent': ['error', 2, { SwitchCase: 1 }],
      'comma-dangle': ['error', 'never'],
      'no-trailing-spaces': 'error',
      'eol-last': 'error',
      'no-multiple-empty-lines': ['error', { max: 2, maxEOF: 1, maxBOF: 0 }],

      // Best practices
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-with': 'error',
      'no-alert': 'error',
      'no-throw-literal': 'error',
      'no-return-await': 'error',
      'prefer-promise-reject-errors': 'error',
      'no-async-promise-executor': 'error',
      'no-constant-binary-expression': 'error',
      'no-duplicate-imports': 'error',
      'no-self-compare': 'error'
    }
  }
];
