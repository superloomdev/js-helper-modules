'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const config = require('helper-eslint-config');


test('exports exactly the keys base, browser, app', () => {
  assert.deepEqual(Object.keys(config).sort(), ['app', 'base', 'browser']);
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


test('base[2].languageOptions.sourceType is exactly commonjs', () => {
  assert.equal(config.base[2].languageOptions.sourceType, 'commonjs');
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


test('browser has length exactly 4 and its last element globals.document is readonly', () => {
  assert.equal(Array.isArray(config.browser), true);
  assert.equal(config.browser.length, 4);
  assert.equal(config.browser[3].languageOptions.globals.document, 'readonly');
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
