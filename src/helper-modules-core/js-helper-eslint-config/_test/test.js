// Info: Unit tests for js-helper-eslint-config. Verifies the exported shape
// of the config package: preset keys, array lengths, ignore patterns, rule
// values, globals, and the presence of all safety rules.
//
// These are structural assertions, not behavioral tests. They guard against
// accidental drift - if someone changes a rule value or removes a global,
// the corresponding test fails. The test suite does not run ESLint itself;
// that is the job of `npm run lint` in the package root.
//
// Test runtime: Node.js `node --test`, no external services, no Docker.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import * as config from 'helper-eslint-config';


////////////////////////////// Shape Tests START ///////////////////////////////

test('exports exactly the keys base, browser, esm, app', () => {
  assert.deepEqual(Object.keys(config).sort(), ['app', 'base', 'browser', 'esm']);
});


test('base is an array whose length is exactly 3', () => {
  assert.equal(Array.isArray(config.base), true);
  assert.equal(config.base.length, 3);
});


test('base[0].ignores contains exactly the four ignore patterns', () => {
  assert.deepEqual(config.base[0].ignores, [
    '_test/**',
    'node_modules/**',
    '.git/**',
    'coverage/**'
  ]);
});


test('base[2].languageOptions.sourceType is exactly module', () => {
  assert.equal(config.base[2].languageOptions.sourceType, 'module');
});


test('base[2].rules no-unused-vars deep-equals the canonical setting', () => {
  assert.deepEqual(config.base[2].rules['no-unused-vars'], ['error', { args: 'after-used' }]);
});


test('base[2].rules no-multiple-empty-lines deep-equals the canonical setting', () => {
  assert.deepEqual(config.base[2].rules['no-multiple-empty-lines'], ['error', { max: 3, maxEOF: 1, maxBOF: 0 }]);
});


test('base[2].rules indent deep-equals error 2 (guards D6)', () => {
  assert.deepEqual(config.base[2].rules.indent, ['error', 2]);
});


test('base[2].languageOptions.globals.document is exactly undefined', () => {
  assert.equal(config.base[2].languageOptions.globals.document, undefined);
});


test('esm is an array whose length is exactly 3', () => {
  assert.equal(Array.isArray(config.esm), true);
  assert.equal(config.esm.length, 3);
});


test('esm[2].languageOptions.sourceType is exactly module', () => {
  assert.equal(config.esm[2].languageOptions.sourceType, 'module');
});


test('esm[2].languageOptions.globals.document is exactly undefined', () => {
  assert.equal(config.esm[2].languageOptions.globals.document, undefined);
});


test('esm[2].rules deep-equals base[2].rules', () => {
  assert.deepEqual(config.esm[2].rules, config.base[2].rules);
});


test('browser has length exactly 4 and its last element globals.document is readonly', () => {
  assert.equal(Array.isArray(config.browser), true);
  assert.equal(config.browser.length, 4);
  assert.equal(config.browser[3].languageOptions.globals.document, 'readonly');
});


test('browser globals include PopStateEvent as readonly', () => {
  assert.equal(config.browser[3].languageOptions.globals.PopStateEvent, 'readonly');
});


test('app has length exactly 5 and its last element enables JSX parsing', () => {
  assert.equal(Array.isArray(config.app), true);
  assert.equal(config.app.length, 5);
  assert.equal(config.app[4].languageOptions.parserOptions.ecmaFeatures.jsx, true);
});


test('app[4].languageOptions.sourceType is exactly module', () => {
  assert.equal(config.app[4].languageOptions.sourceType, 'module');
});


test('app[4].rules no-unused-vars includes varsIgnorePattern for React', () => {
  assert.deepEqual(config.app[4].rules['no-unused-vars'], ['error', { args: 'after-used', varsIgnorePattern: '^React$' }]);
});


test('all 11 safety rules are present in base[2].rules and set to error', () => {
  const safetyRules = [
    'no-eval',
    'no-implied-eval',
    'no-new-func',
    'no-with',
    'no-alert',
    'no-throw-literal',
    'prefer-promise-reject-errors',
    'no-async-promise-executor',
    'no-constant-binary-expression',
    'no-duplicate-imports',
    'no-self-compare'
  ];

  for (const rule of safetyRules) {
    assert.equal(config.base[2].rules[rule], 'error', `rule ${rule} should be 'error'`);
  }
});

/////////////////////////////// Shape Tests END ////////////////////////////////
