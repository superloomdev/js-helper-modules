// Info: Test suite for js-client-helper-themer-template-carbon.
//
// Verifies the Carbon reference template: profile identity, scheme count,
// contract validity, parity oracle values, unit gate, regeneration,
// engine build, brand layer, and from_default correctness.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import loader from './loader.js';
import themerLoader from 'helper-themer';
import defaultProfile from 'helper-themer-template-default';
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

  it('should export contract_version 5', () => {
    assert.equal(profile.contract_version, 5);
  });

  it('should export reference with Carbon package versions', () => {
    assert.equal(profile.reference.themes, '@carbon/themes@11.80.0');
    assert.equal(profile.reference.type, '@carbon/type@11.66.0');
    assert.equal(profile.reference.motion, '@carbon/motion@11.51.0');
    assert.equal(profile.reference.layout, '@carbon/layout@11.58.0');
    assert.equal(profile.reference.icons, '@carbon/icons@11.89.0');
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


describe('carbon template - from_default correctness', () => {

  for (const schemeName of ['white', 'g10', 'g90', 'g100']) {

    it('should have non-empty from_default in ' + schemeName, () => {
      assert.ok(profile.schemes[schemeName].from_default.length,
        schemeName + ' from_default is empty');
    });

    it('should have every from_default key deepEqual the default value in ' + schemeName, () => {
      const fromDefault = profile.schemes[schemeName].from_default;
      const defaultScheme = defaultProfile.schemes.light;
      for (const key of fromDefault) {
        assert.deepEqual(profile.schemes[schemeName].tokens[key],
          defaultScheme.tokens[key],
          schemeName + ' from_default key ' + key + ' does not match the default template');
      }
    });

    it('should have sorted from_default in ' + schemeName, () => {
      const fromDefault = profile.schemes[schemeName].from_default;
      const sorted = [...fromDefault].sort();
      assert.deepEqual(fromDefault, sorted,
        schemeName + ' from_default is not sorted');
    });

    it('should not list stacking, anatomy or icon tokens in from_default in ' + schemeName, () => {
      const fromDefault = profile.schemes[schemeName].from_default;
      for (const key of fromDefault) {
        assert.ok(!key.startsWith('stacking.') && !key.startsWith('anatomy.') && !key.startsWith('icon.'),
          schemeName + ' inherits ' + key + ' from the default template, expected explicit Carbon value');
      }
    });

  }

});


describe('carbon template - anatomy enums (v4)', () => {

  const ANATOMY = {
    'anatomy.label': 'above',
    'anatomy.switch_handle': 'fixed',
    'anatomy.status_marker': 'bar_icon',
    'anatomy.dialog_actions': 'stretched',
    'anatomy.caret': 'shown',
    'anatomy.slider_handle': 'round'
  };

  for (const schemeName of ['white', 'g10', 'g90', 'g100']) {

    it('should hold Carbon\'s shape choice for every anatomy enum in ' + schemeName, () => {
      const tokens = profile.schemes[schemeName].tokens;
      const actual = {};
      for (const name of Object.keys(ANATOMY)) {
        actual[name] = tokens[name];
      }
      assert.deepEqual(actual, ANATOMY);
    });

  }

});


describe('carbon template - icon literals (v4)', () => {

  const iconKeys = contractKeys.filter(function (name) {
    return contract.tokens[name].group === 'icon';
  });
  const iconMap = JSON.parse(readFileSync(resolve(moduleRoot, 'scripts', 'icon-map.json'), 'utf8'));
  const iconPkg = JSON.parse(readFileSync(resolve(moduleRoot, 'node_modules', '@carbon', 'icons', 'package.json'), 'utf8'));

  it('should carry 78 valid icon literals, identical across the four schemes', () => {
    assert.equal(iconKeys.length, 78);
    const subset = {};
    for (const name of iconKeys) {
      const literal = profile.schemes.white.tokens[name];
      assert.equal(literal.icon, true, name + ' lacks the icon marker');
      subset[name] = literal;
      for (const schemeName of ['g10', 'g90', 'g100']) {
        assert.deepEqual(profile.schemes[schemeName].tokens[name], literal, schemeName + ' ' + name);
      }
    }
    assert.deepEqual(Themer.validateContract({ tokens: subset }, { required: iconKeys }).errors, []);
  });

  it('should keep the set\'s own 16, 20 and 24 pixel glyphs under sizes with their own viewBox', () => {
    const close = profile.schemes.white.tokens['icon.close'];
    assert.deepEqual(Object.keys(close.sizes), ['16', '20', '24']);
    const arrow = profile.schemes.white.tokens['icon.arrow_right'];
    assert.equal(arrow.sizes['16'].viewBox, '0 0 16 16');
    const circle = profile.schemes.white.tokens['icon.circle_filled'];
    assert.equal(circle.viewBox, '0 0 16 16');
    assert.equal(circle.sizes, undefined);
  });

  it('should convert every element to a path and bake every transform', () => {
    const iconValues = iconKeys.map(function (name) { return profile.schemes.white.tokens[name]; });
    const serialized = JSON.stringify(iconValues);
    assert.equal(serialized.indexOf('"transform"'), -1);
    assert.equal(serialized.indexOf('switch'), -1);
    assert.equal(serialized.indexOf('inner-path'), -1);
    assert.equal(profile.schemes.white.tokens['icon.error_outline'].paths[0].d, 'M8.9996 10.5553L10.5553 8.9996L22.9997 21.444L21.444 22.9997Z');
  });

  it('should record icon provenance that matches the pinned package and the mapping snapshot', () => {
    assert.equal(iconPkg.version, '11.89.0');
    for (const schemeName of ['white', 'g10', 'g90', 'g100']) {
      assert.deepEqual(profile.schemes[schemeName].provenance, {
        icons: {
          package: '@carbon/icons',
          version: iconPkg.version,
          map_source: iconMap.source,
          map_sha256: iconMap.source_sha256
        }
      });
    }
    assert.deepEqual(Object.keys(iconMap.icons).map(function (name) { return 'icon.' + name; }), iconKeys);
  });

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

describe('carbon template - feedback field', () => {

  it('should have feedback.field = underline', () => {
    const built = Themer.buildTheme(profile.schemes.white, [], 'native');
    assert.equal(built.tokens['feedback.field'], 'underline');
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


describe('carbon template - every scheme resolves every token', () => {

  for (const schemeName of Object.keys(profile.schemes)) {
    for (const platform of ['native', 'web']) {
      it('should emit a value for all 490 tokens of ' + schemeName + ' on ' + platform, () => {
        const built = Themer.buildTheme(profile.schemes[schemeName], [], platform);
        const names = Object.keys(built.tokens);
        assert.equal(names.length, 490);
        const empty = names.filter((name) => built.tokens[name] === undefined || built.tokens[name] === null);
        assert.deepEqual(empty, [], schemeName + ' on ' + platform + ' resolves these tokens to nothing');
      });
    }
  }

});


describe('carbon template - v5 control roles and role colors', () => {

  const white = profile.schemes.white.tokens;

  it('should state the geometry its component styles name, from its own layout scale', () => {
    assert.deepEqual({
      button_height: white['control.button_height'],
      button_radius: white['control.button_radius'],
      button_padding_start: white['control.button_padding_start'],
      button_padding_end: white['control.button_padding_end'],
      button_icon_size: white['control.button_icon_size'],
      field_height: white['control.field_height'],
      field_radius: white['control.field_radius'],
      field_icon_size: white['control.field_icon_size'],
      checkbox_size: white['control.checkbox_size'],
      checkbox_border: white['control.checkbox_border'],
      option_height: white['control.option_height']
    }, {
      button_height: 48, button_radius: 0, button_padding_start: 16, button_padding_end: 64, button_icon_size: 16,
      field_height: 40, field_radius: 0, field_icon_size: 16, checkbox_size: 16, checkbox_border: 1, option_height: 40
    });
    for (const key of Object.keys(white).filter((name) => name.indexOf('control.') === 0)) {
      assert.equal(profile.schemes.white.from_default.includes(key), false, 'completed ' + key);
    }
  });

  it('should draw the button label in body compact 01 and the raised field label in label 01', () => {
    assert.deepEqual(white['type.button_label'], white['type.body_compact_01']);
    assert.deepEqual(white['type.field_label_raised'], white['type.label01']);
  });

  it('should fill tonal buttons from the accent layer, elevated from the first layer, and check controls in the primary icon color', () => {
    assert.equal(white['color.button_tonal'], white['color.layer_accent_01']);
    assert.equal(white['color.button_tonal_hover'], white['color.layer_accent_hover_01']);
    assert.equal(white['color.button_tonal_active'], white['color.layer_accent_active_01']);
    assert.equal(white['color.text_on_button_tonal'], white['color.text_primary']);
    assert.equal(white['color.button_elevated'], white['color.layer_01']);
    assert.equal(white['color.button_elevated_hover'], white['color.layer_hover_01']);
    assert.equal(white['color.button_elevated_active'], white['color.layer_active_01']);
    assert.equal(white['color.control_checked'], white['color.icon_primary']);
  });

});
