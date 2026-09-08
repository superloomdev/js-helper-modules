// Info: Test suite for js-client-helper-themer-template-base.
//
// Verifies the base template against the D19 rules: every contract key
// present, contract validity, engine build, shadow emission, state/tint
// ranges, spring literals, duration sequence, focus enum, unit gate,
// and regeneration.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import loader from './loader.js';
import themerLoader from 'helper-themer';
import profile from 'helper-themer-template-base';

const { Lib } = loader();
const Themer = themerLoader(Lib, {});
const contract = Themer.getContract();
const contractKeys = Object.keys(contract.tokens);

const here = dirname(fileURLToPath(import.meta.url));
const moduleRoot = resolve(here, '..');

// --- Contrast pairs (text on background) ---------------------------------
const CONTRAST_PAIRS = [
  ['color.text_primary', 'color.background', 4.5],
  ['color.text_secondary', 'color.background', 4.5],
  ['color.text_helper', 'color.background', 4.5],
  ['color.text_error', 'color.background', 4.5],
  ['color.text_primary', 'color.layer_01', 4.5],
  ['color.text_secondary', 'color.layer_01', 4.5],
  ['color.border_strong_01', 'color.background', 3.0],
  ['color.border_interactive', 'color.background', 3.0],
  ['color.icon_primary', 'color.background', 3.0]
];

// --- D19 spring literals -------------------------------------------------
const BASE_SPRINGS = {
  'motion.spring_spatial_default': { spring: true, stiffness: 700, damping: 47.62, mass: 1 },
  'motion.spring_spatial_fast': { spring: true, stiffness: 1400, damping: 67.35, mass: 1 },
  'motion.spring_spatial_slow': { spring: true, stiffness: 300, damping: 31.18, mass: 1 },
  'motion.spring_effects_default': { spring: true, stiffness: 1600, damping: 80, mass: 1 },
  'motion.spring_effects_fast': { spring: true, stiffness: 3800, damping: 123.29, mass: 1 },
  'motion.spring_effects_slow': { spring: true, stiffness: 800, damping: 56.57, mass: 1 }
};

// --- D19 duration slots --------------------------------------------------
const DURATION_SLOTS = [
  'motion.duration_fast_01', 'motion.duration_fast_02',
  'motion.duration_fast_03', 'motion.duration_fast_04',
  'motion.duration_moderate_01', 'motion.duration_moderate_02',
  'motion.duration_moderate_03', 'motion.duration_moderate_04',
  'motion.duration_slow_01', 'motion.duration_slow_02',
  'motion.duration_slow_03', 'motion.duration_slow_04',
  'motion.duration_extra_slow_01', 'motion.duration_extra_slow_02',
  'motion.duration_extra_slow_03', 'motion.duration_extra_slow_04'
];


describe('base template - profile identity', () => {

  it('should export id superloom-base', () => {
    assert.equal(profile.id, 'superloom-base');
  });

  it('should export contract_version 2', () => {
    assert.equal(profile.contract_version, 2);
  });

  it('should have light and dark schemes', () => {
    assert.ok(profile.schemes.light);
    assert.ok(profile.schemes.dark);
  });

  it('should have light polarity for light scheme', () => {
    assert.equal(profile.schemes.light.polarity, 'light');
  });

  it('should have dark polarity for dark scheme', () => {
    assert.equal(profile.schemes.dark.polarity, 'dark');
  });

});


describe('base template - key count', () => {

  it('should have every contract key in light scheme', () => {
    const keys = Object.keys(profile.schemes.light.tokens);
    assert.equal(keys.length, contractKeys.length);
    for (const name of contractKeys) {
      assert.ok(name in profile.schemes.light.tokens, 'light missing ' + name);
    }
  });

  it('should have every contract key in dark scheme', () => {
    const keys = Object.keys(profile.schemes.dark.tokens);
    assert.equal(keys.length, contractKeys.length);
    for (const name of contractKeys) {
      assert.ok(name in profile.schemes.dark.tokens, 'dark missing ' + name);
    }
  });

});


describe('base template - contract validity', () => {

  it('should validate light scheme with no warnings', () => {
    const result = Themer.validateContract(
      profile.schemes.light,
      { required: contractKeys }
    );
    assert.equal(result.success, true);
    assert.equal(result.warnings.length, 0);
  });

  it('should validate dark scheme with no warnings', () => {
    const result = Themer.validateContract(
      profile.schemes.dark,
      { required: contractKeys }
    );
    assert.equal(result.success, true);
    assert.equal(result.warnings.length, 0);
  });

});


describe('base template - engine build', () => {

  it('should build light scheme on native with no violations', () => {
    const template = Object.assign({}, profile.schemes.light, { contrast_rules: CONTRAST_PAIRS });
    const result = Themer.buildTheme(
      template,
      [],
      'native',
      { contrast: 'report' }
    );
    assert.ok(result.tokens);
    assert.equal(result.violations.length, 0,
      'contrast violations: ' + JSON.stringify(result.violations));
  });

  it('should build dark scheme on native with no violations', () => {
    const template = Object.assign({}, profile.schemes.dark, { contrast_rules: CONTRAST_PAIRS });
    const result = Themer.buildTheme(
      template,
      [],
      'native',
      { contrast: 'report' }
    );
    assert.ok(result.tokens);
    assert.equal(result.violations.length, 0,
      'contrast violations: ' + JSON.stringify(result.violations));
  });

});


describe('base template - shadow emission', () => {

  it('should emit every shadow as a boxShadow string on native', () => {
    const built = Themer.buildTheme(profile.schemes.light, [], 'native');
    const shadowKeys = ['shadow.level_01', 'shadow.level_02', 'shadow.level_03', 'shadow.level_04', 'shadow.level_05'];
    for (const key of shadowKeys) {
      const value = built.tokens[key];
      assert.equal(typeof value, 'object', key + ' should be an object');
      assert.equal(typeof value.boxShadow, 'string', key + ' should have boxShadow string');
      assert.ok(value.boxShadow, key + ' boxShadow should not be empty');
    }
  });

});


describe('base template - state and tint ranges', () => {

  it('should have every state.* as a number in 0..1', () => {
    const built = Themer.buildTheme(profile.schemes.light, [], 'native');
    const stateKeys = Object.keys(built.tokens).filter(function (k) {
      return k.startsWith('state.');
    });
    for (const key of stateKeys) {
      const value = built.tokens[key];
      assert.equal(typeof value, 'number', key + ' should be a number');
      assert.ok(value >= 0 && value <= 1, key + ' should be in 0..1, got ' + value);
    }
  });

  it('should have every tint.* as a number in 0..1', () => {
    const built = Themer.buildTheme(profile.schemes.light, [], 'native');
    const tintKeys = Object.keys(built.tokens).filter(function (k) {
      return k.startsWith('tint.');
    });
    for (const key of tintKeys) {
      const value = built.tokens[key];
      assert.equal(typeof value, 'number', key + ' should be a number');
      assert.ok(value >= 0 && value <= 1, key + ' should be in 0..1, got ' + value);
    }
  });

});


describe('base template - spring literals (D19)', () => {

  it('should deepEqual the six base spring objects', () => {
    const built = Themer.buildTheme(profile.schemes.light, [], 'native');
    for (const name of Object.keys(BASE_SPRINGS)) {
      assert.deepEqual(built.tokens[name], BASE_SPRINGS[name], name + ' does not match D19');
    }
  });

});


describe('base template - durations (D19)', () => {

  it('should have duration_fast_01 = 70', () => {
    const built = Themer.buildTheme(profile.schemes.light, [], 'native');
    assert.equal(built.tokens['motion.duration_fast_01'], 70);
  });

  it('should have duration_extra_slow_04 = 700', () => {
    const built = Themer.buildTheme(profile.schemes.light, [], 'native');
    assert.equal(built.tokens['motion.duration_extra_slow_04'], 700);
  });

  it('should have sixteen strictly increasing durations', () => {
    const built = Themer.buildTheme(profile.schemes.light, [], 'native');
    const values = DURATION_SLOTS.map(function (s) { return built.tokens[s]; });
    for (let i = 1; i < values.length; i++) {
      assert.ok(values[i] > values[i - 1],
        'duration at slot ' + i + ' (' + values[i] + ') should exceed slot ' + (i - 1) + ' (' + values[i - 1] + ')');
    }
  });

});


describe('base template - feedback focus', () => {

  it('should have feedback.focus = outline', () => {
    const built = Themer.buildTheme(profile.schemes.light, [], 'native');
    assert.equal(built.tokens['feedback.focus'], 'outline');
  });

});


describe('base template - unit gate', () => {

  it('should have no string matching (rem|em|px|vw|vh|%|ms)$ in any scheme', () => {
    const unitRegex = /(rem|em|px|vw|vh|%|ms)$/;

    function walkTokens (tokens, label) {
      const keys = Object.keys(tokens);
      for (let i = 0; i < keys.length; i++) {
        const value = tokens[keys[i]];
        if (Lib.Utils.isString(value) && unitRegex.test(value)) {
          assert.fail(label + ' token ' + keys[i] + ' has unit suffix: ' + value);
        }
        if (Lib.Utils.isObject(value) && value !== null) {
          const subKeys = Object.keys(value);
          for (let j = 0; j < subKeys.length; j++) {
            const sub = value[subKeys[j]];
            if (Lib.Utils.isString(sub) && unitRegex.test(sub)) {
              assert.fail(label + ' token ' + keys[i] + '.' + subKeys[j] + ' has unit suffix: ' + sub);
            }
          }
        }
      }
    }

    walkTokens(profile.schemes.light.tokens, 'light');
    walkTokens(profile.schemes.dark.tokens, 'dark');
  });

});


describe('base template - regeneration test', () => {

  it('should produce byte-identical files when run into a temp directory', () => {

    const tmpDir = resolve(here, 'fixtures', 'tmp-regen');
    rmSync(tmpDir, { recursive: true, force: true });
    mkdirSync(tmpDir, { recursive: true });

    // Run the generator into the temp directory
    execSync('node ' + resolve(moduleRoot, 'scripts', 'generate.js') + ' ' + tmpDir, {
      cwd: moduleRoot,
      stdio: 'pipe'
    });

    // Compare generated files against committed ones
    const generatedLight = readFileSync(resolve(tmpDir, 'light.js'), 'utf8');
    const generatedDark = readFileSync(resolve(tmpDir, 'dark.js'), 'utf8');
    const committedLight = readFileSync(resolve(moduleRoot, 'data', 'light.js'), 'utf8');
    const committedDark = readFileSync(resolve(moduleRoot, 'data', 'dark.js'), 'utf8');

    assert.equal(generatedLight, committedLight, 'light.js differs from regenerated output');
    assert.equal(generatedDark, committedDark, 'dark.js differs from regenerated output');

    rmSync(tmpDir, { recursive: true, force: true });

  });

});
