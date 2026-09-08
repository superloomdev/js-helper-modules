// Info: Test suite for js-client-helper-themer-template-carbon.
//
// Verifies the Carbon reference template: profile identity, scheme count,
// contract validity, parity oracle values, unit gate, regeneration,
// engine build, brand layer, and from_base correctness.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import loader from './loader.js';
import themerLoader from 'helper-themer';
import baseProfile from 'helper-themer-template-base';
import profile from 'helper-themer-template-carbon';
import oracle from './fixtures/parity-oracle.json' with { type: 'json' };

const { Lib } = loader();
const Themer = themerLoader(Lib, {});
const contract = Themer.getContract();
const contractKeys = Object.keys(contract.tokens);

const here = dirname(fileURLToPath(import.meta.url));
const moduleRoot = resolve(here, '..');


describe('carbon template - profile identity', () => {

  it('should export id carbon-v11', () => {
    assert.equal(profile.id, 'carbon-v11');
  });

  it('should export contract_version 2', () => {
    assert.equal(profile.contract_version, 2);
  });

  it('should export reference with Carbon package versions', () => {
    assert.equal(profile.reference.themes, '@carbon/themes@11.80.0');
    assert.equal(profile.reference.type, '@carbon/type@11.66.0');
    assert.equal(profile.reference.motion, '@carbon/motion@11.51.0');
    assert.equal(profile.reference.layout, '@carbon/layout@11.58.0');
  });

  it('should have four schemes', () => {
    assert.ok(profile.schemes.white);
    assert.ok(profile.schemes.g10);
    assert.ok(profile.schemes.g90);
    assert.ok(profile.schemes.g100);
  });

});


describe('carbon template - scheme polarity', () => {

  it('should have light polarity for white', () => {
    assert.equal(profile.schemes.white.polarity, 'light');
  });

  it('should have light polarity for g10', () => {
    assert.equal(profile.schemes.g10.polarity, 'light');
  });

  it('should have dark polarity for g90', () => {
    assert.equal(profile.schemes.g90.polarity, 'dark');
  });

  it('should have dark polarity for g100', () => {
    assert.equal(profile.schemes.g100.polarity, 'dark');
  });

});


describe('carbon template - key count', () => {

  for (const schemeName of ['white', 'g10', 'g90', 'g100']) {

    it('should have ' + contractKeys.length + ' tokens in ' + schemeName, () => {
      const keys = Object.keys(profile.schemes[schemeName].tokens);
      assert.equal(keys.length, contractKeys.length);
      for (const name of contractKeys) {
        assert.ok(name in profile.schemes[schemeName].tokens,
          schemeName + ' missing ' + name);
      }
    });

  }

});


describe('carbon template - contract validity', () => {

  for (const schemeName of ['white', 'g10', 'g90', 'g100']) {

    it('should validate ' + schemeName + ' with no warnings', () => {
      const result = Themer.validateContract(
        profile.schemes[schemeName],
        { required: contractKeys }
      );
      assert.equal(result.success, true,
        schemeName + ' validation failed: ' + JSON.stringify(result.errors));
      assert.equal(result.warnings.length, 0,
        schemeName + ' has warnings: ' + JSON.stringify(result.warnings));
    });

  }

});


describe('carbon template - parity oracle', () => {

  it('should match oracle background for white', () => {
    assert.equal(profile.schemes.white.tokens['color.background'],
      oracle.themes.white.background.background);
  });

  it('should match oracle layer_01 for white', () => {
    assert.equal(profile.schemes.white.tokens['color.layer_01'],
      oracle.themes.white.layers.layer01);
  });

  it('should match oracle text_primary for white', () => {
    assert.equal(profile.schemes.white.tokens['color.text_primary'],
      oracle.themes.white.text.textPrimary);
  });

  it('should match oracle interactive for white', () => {
    assert.equal(profile.schemes.white.tokens['color.interactive'],
      oracle.themes.white.interactive.interactive);
  });

  it('should match oracle support_error for white', () => {
    assert.equal(profile.schemes.white.tokens['color.support_error'],
      oracle.themes.white.support.supportError);
  });

  it('should match oracle background for g100', () => {
    assert.equal(profile.schemes.g100.tokens['color.background'],
      oracle.themes.g100.background.background);
  });

  it('should match oracle body01 type set for white', () => {
    const built = Themer.buildTheme(profile.schemes.white, [], 'native');
    const body01 = built.tokens['type.body01'];
    assert.equal(body01.fontSize, 14);
    assert.equal(body01.fontWeight, '400');
    assert.equal(body01.letterSpacing, 0.16);
  });

});


describe('carbon template - unit gate', () => {

  for (const schemeName of ['white', 'g10', 'g90', 'g100']) {

    it('should have no unit suffixes in ' + schemeName, () => {
      const unitRegex = /(rem|em|px|vw|vh|%|ms)$/;
      const tokens = profile.schemes[schemeName].tokens;
      const keys = Object.keys(tokens);
      for (let i = 0; i < keys.length; i++) {
        const value = tokens[keys[i]];
        if (Lib.Utils.isString(value) && unitRegex.test(value)) {
          assert.fail(schemeName + ' token ' + keys[i] + ' has unit suffix: ' + value);
        }
        if (Lib.Utils.isObject(value) && value !== null) {
          const subKeys = Object.keys(value);
          for (let j = 0; j < subKeys.length; j++) {
            const sub = value[subKeys[j]];
            if (Lib.Utils.isString(sub) && unitRegex.test(sub)) {
              assert.fail(schemeName + ' token ' + keys[i] + '.' + subKeys[j] + ' has unit suffix: ' + sub);
            }
          }
        }
      }
    });

  }

});


describe('carbon template - from_base correctness', () => {

  for (const schemeName of ['white', 'g10', 'g90', 'g100']) {

    it('should have non-empty from_base in ' + schemeName, () => {
      assert.ok(profile.schemes[schemeName].from_base.length,
        schemeName + ' from_base is empty');
    });

    it('should have every from_base key deepEqual the base value in ' + schemeName, () => {
      const fromBase = profile.schemes[schemeName].from_base;
      const baseScheme = baseProfile.schemes.light;
      for (const key of fromBase) {
        assert.deepEqual(profile.schemes[schemeName].tokens[key],
          baseScheme.tokens[key],
          schemeName + ' from_base key ' + key + ' does not match base');
      }
    });

    it('should have sorted from_base in ' + schemeName, () => {
      const fromBase = profile.schemes[schemeName].from_base;
      const sorted = [...fromBase].sort();
      assert.deepEqual(fromBase, sorted,
        schemeName + ' from_base is not sorted');
    });

  }

});


describe('carbon template - engine build', () => {

  it('should build white on native and emit body01 type set', () => {
    const built = Themer.buildTheme(profile.schemes.white, [], 'native');
    const body01 = built.tokens['type.body01'];
    assert.deepEqual(body01, {
      fontSize: 14,
      lineHeight: 20,
      letterSpacing: 0.16,
      fontWeight: '400',
      fontFamily: 'sans'
    });
  });

  it('should build white with a brand layer overriding radius_04', () => {
    const built = Themer.buildTheme(
      profile.schemes.white,
      [{ name: 'brand', tokens: { 'shape.radius_04': 8 } }],
      'native'
    );
    assert.equal(built.tokens['shape.radius_04'], 8);
    assert.equal(built.tokens['color.interactive'],
      profile.schemes.white.tokens['color.interactive']);
  });

});


describe('carbon template - regeneration test', () => {

  it('should produce byte-identical files when run into a temp directory', () => {

    const tmpDir = resolve(here, 'fixtures', 'tmp-regen');
    rmSync(tmpDir, { recursive: true, force: true });
    mkdirSync(tmpDir, { recursive: true });

    execSync('node ' + resolve(moduleRoot, 'scripts', 'generate.js') + ' ' + tmpDir, {
      cwd: moduleRoot,
      stdio: 'pipe'
    });

    for (const scheme of ['white', 'g10', 'g90', 'g100']) {
      const generated = readFileSync(resolve(tmpDir, scheme + '.js'), 'utf8');
      const committed = readFileSync(resolve(moduleRoot, 'data', scheme + '.js'), 'utf8');
      assert.equal(generated, committed, scheme + '.js differs from regenerated output');
    }

    rmSync(tmpDir, { recursive: true, force: true });

  });

});
