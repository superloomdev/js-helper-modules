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

// The reference's own values that the engine's role audit reports, each with
// its source; every entry must keep reproducing, so the list can only shrink
const AUDIT_EXCEPTIONS = Object.freeze([
  {
    scheme: 'g10',
    rule: 'contrast',
    tokens: ['color.button_ghost_label_active', 'color.button_ghost_container_active'],
    reason: 'Carbon inks a pressed ghost button in $link-primary-hover over $background-active (button/_button.scss); in g10 that pair reads 4.33:1'
  }
]);
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
    'anatomy.slider_handle': 'round',
    'anatomy.button_label': 'top'
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

  it('should carry 82 valid icon literals, identical across the four schemes', () => {
    assert.equal(iconKeys.length, 82);
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


describe('carbon template - role audit', () => {

  // The engine's role rules: every content role reads on its surface, roles
  // that mean different things differ, every shadow level is translucent.
  // Caught here, at the template, before any component draws the value.
  for (const schemeName of ['white', 'g10', 'g90', 'g100']) {

    it('should pass the engine role audit for ' + schemeName + ' on native, apart from its listed reference exceptions', () => {
      const built = Themer.buildTheme(profile.schemes[schemeName], [], 'native');
      const result = Themer.auditRoles(built);
      const listed = AUDIT_EXCEPTIONS.filter(function (entry) {
        return entry.scheme === schemeName;
      });
      const isListed = function (finding) {
        return listed.some(function (entry) {
          return entry.rule === finding.rule && entry.tokens.join() === finding.tokens.join();
        });
      };
      assert.deepEqual(result.findings.filter(function (finding) {
        return !isListed(finding);
      }), [], 'role audit findings for ' + schemeName);
      // A listed exception that no longer reproduces is stale
      for (const entry of listed) {
        assert.ok(result.findings.some(function (finding) {
          return entry.rule === finding.rule && entry.tokens.join() === finding.tokens.join();
        }), 'stale audit exception ' + entry.tokens.join(' on ') + ' in ' + schemeName + '; remove it');
      }
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
      it('should emit a value for all 763 tokens of ' + schemeName + ' on ' + platform, () => {
        const built = Themer.buildTheme(profile.schemes[schemeName], [], platform);
        const names = Object.keys(built.tokens);
        assert.equal(names.length, 763);
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
    // Pressed tonal and elevated fills stop at the selected and hover layers, where the label still reads (role audit, g90)
    assert.equal(white['color.button_tonal'], white['color.layer_accent_01']);
    assert.equal(white['color.button_tonal_hover'], white['color.layer_accent_hover_01']);
    assert.equal(white['color.button_tonal_active'], white['color.layer_selected_01']);
    assert.equal(white['color.text_on_button_tonal'], white['color.text_primary']);
    assert.equal(white['color.button_elevated'], white['color.layer_01']);
    assert.equal(white['color.button_elevated_hover'], white['color.layer_hover_01']);
    assert.equal(white['color.button_elevated_active'], white['color.layer_hover_01']);
    assert.equal(white['color.control_checked'], white['color.icon_primary']);
  });

});


describe('carbon template - role grid (v5 amendment)', () => {

  const contract = Themer.getContract();
  const cells = Object.keys(contract.grid).flatMap(function (group) {
    return contract.grid[group].map(function (cell) {
      return group + '.' + cell;
    });
  });

  for (const schemeName of ['white', 'g10', 'g90', 'g100']) {

    it('should answer every grid cell itself in ' + schemeName + ', none completed from the default', () => {
      const scheme = profile.schemes[schemeName];
      for (const name of cells) {
        assert.notEqual(scheme.tokens[name], undefined, name);
        assert.equal(scheme.from_default.includes(name), false, name + ' completed from the default');
      }
    });

    it('should draw Carbon\'s focus ring, field hover and disabled select in ' + schemeName, () => {
      const built = Themer.buildTheme(profile.schemes[schemeName], [], 'native').tokens;
      assert.equal(built['control.button_focus_offset'], -2);
      assert.equal(built['control.button_focus_gap_width'], 1);
      assert.equal(built['color.button_focus_gap'], built['color.background']);
      assert.equal(built['control.field_focus_offset'], -2);
      assert.equal(built['control.selection_focus_offset'], 1);
      assert.equal(built['color.field_container_hover'], built['color.field_hover_01']);
      assert.equal(built['color.text_input_container_hover'], built['color.field_01']);
      assert.equal(built['color.select_outline_disabled'], 'rgba(0, 0, 0, 0)');
      assert.equal(built['color.button_tertiary_container_focus'], built['color.button_tertiary']);
      assert.equal(built['color.button_ghost_label_hover'], built['color.link_primary_hover']);
      assert.equal(built['color.button_tertiary_border_disabled'], built['color.button_disabled']);
      assert.equal(built['feedback.focus_trigger'], 'any');
    });

  }

});

