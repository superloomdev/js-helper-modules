// Info: Test suite for js-client-helper-themer-template-default.
//
// Verifies the default template against the D19 rules: every contract key
// present, contract validity, engine build, shadow emission, state/tint
// ranges, spring literals, duration sequence, focus enum, anatomy enums,
// icon literals with provenance, unit gate, and regeneration.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import loader from './loader.js';
import themerLoader from 'helper-themer';
import profile from 'helper-themer-template-default';

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


describe('default template - profile identity', () => {

  it('should export id superloom-default', () => {
    assert.equal(profile.id, 'superloom-default');
  });

  it('should export contract_version 5', () => {
    assert.equal(profile.contract_version, 5);
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


describe('default template - key count', () => {

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


describe('default template - contract validity', () => {

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


describe('default template - role audit', () => {

  // The engine's role rules: every content role reads on its surface, roles
  // that mean different things differ, every shadow level is translucent.
  // Caught here, at the template, before any component draws the value.
  for (const schemeName of ['light', 'dark']) {

    it('should pass the engine role audit for ' + schemeName + ' on native', () => {
      const built = Themer.buildTheme(profile.schemes[schemeName], [], 'native');
      const result = Themer.auditRoles(built);
      assert.deepEqual(result.findings, [], 'role audit findings for ' + schemeName);
      assert.equal(result.success, true);
    });

  }

});


describe('default template - engine build', () => {

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


describe('default template - shadow emission', () => {

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


describe('default template - state and tint ranges', () => {

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


describe('default template - spring literals (D19)', () => {

  it('should deepEqual the six base spring objects', () => {
    const built = Themer.buildTheme(profile.schemes.light, [], 'native');
    for (const name of Object.keys(BASE_SPRINGS)) {
      assert.deepEqual(built.tokens[name], BASE_SPRINGS[name], name + ' does not match D19');
    }
  });

});


describe('default template - durations (D19)', () => {

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


describe('default template - feedback focus', () => {

  it('should have feedback.field = underline', () => {
    const built = Themer.buildTheme(profile.schemes.light, [], 'native');
    assert.equal(built.tokens['feedback.field'], 'underline');
  });

});


describe('default template - anatomy enums (v4)', () => {

  const ANATOMY = {
    'anatomy.label': 'above',
    'anatomy.switch_handle': 'fixed',
    'anatomy.status_marker': 'bar_icon',
    'anatomy.dialog_actions': 'stretched',
    'anatomy.slider_handle': 'round',
    'anatomy.button_label': 'top'
  };

  for (const schemeName of ['light', 'dark']) {

    it('should hold the plainest value of every anatomy enum in ' + schemeName, () => {
      const tokens = profile.schemes[schemeName].tokens;
      const actual = {};
      for (const name of Object.keys(ANATOMY)) {
        actual[name] = tokens[name];
      }
      assert.deepEqual(actual, ANATOMY);
    });

  }

});


describe('default template - icon literals (v4)', () => {

  const iconKeys = contractKeys.filter(function (name) {
    return contract.tokens[name].group === 'icon';
  });
  const iconMap = JSON.parse(readFileSync(resolve(moduleRoot, 'scripts', 'icon-map.json'), 'utf8'));
  const iconPkg = JSON.parse(readFileSync(resolve(moduleRoot, 'node_modules', '@carbon', 'icons', 'package.json'), 'utf8'));

  it('should carry 82 icon tokens, every one a valid icon literal, in both schemes', () => {
    assert.equal(iconKeys.length, 82);
    for (const schemeName of ['light', 'dark']) {
      const tokens = profile.schemes[schemeName].tokens;
      const subset = {};
      for (const name of iconKeys) {
        assert.equal(tokens[name].icon, true, schemeName + ' ' + name + ' lacks the icon marker');
        subset[name] = tokens[name];
      }
      const result = Themer.validateContract({ tokens: subset }, { required: iconKeys });
      assert.deepEqual(result.errors, []);
    }
  });

  it('should hold identical icon values in light and dark', () => {
    for (const name of iconKeys) {
      assert.deepEqual(profile.schemes.dark.tokens[name], profile.schemes.light.tokens[name], name);
    }
  });

  it('should keep the set\'s own 16, 20 and 24 pixel glyphs under sizes with their own viewBox', () => {
    const close = profile.schemes.light.tokens['icon.close'];
    assert.deepEqual(Object.keys(close.sizes), ['16', '20', '24']);
    assert.equal(close.viewBox, '0 0 32 32');
    const arrow = profile.schemes.light.tokens['icon.arrow_right'];
    assert.deepEqual(Object.keys(arrow.sizes), ['16', '20', '24']);
    assert.equal(arrow.sizes['16'].viewBox, '0 0 16 16');
    assert.equal(arrow.sizes['24'].viewBox, '0 0 24 24');
  });

  it('should carry a 16-only glyph as the default with no sizes', () => {
    const literal = profile.schemes.light.tokens['icon.circle_filled'];
    assert.equal(literal.viewBox, '0 0 16 16');
    assert.equal(literal.sizes, undefined);
    assert.equal(literal.paths.length, 1);
  });

  it('should convert every element to a path and bake every transform', () => {
    const iconValues = iconKeys.map(function (name) { return profile.schemes.light.tokens[name]; });
    const serialized = JSON.stringify(iconValues);
    assert.equal(serialized.indexOf('"transform"'), -1);
    assert.equal(serialized.indexOf('switch'), -1);
    assert.equal(serialized.indexOf('inner-path'), -1);
    const outline = profile.schemes.light.tokens['icon.error_outline'];
    assert.equal(outline.paths.length, 2);
    assert.equal(outline.paths[0].d, 'M8.9996 10.5553L10.5553 8.9996L22.9997 21.444L21.444 22.9997Z');
  });

  it('should record icon provenance that matches the pinned package and the mapping snapshot', () => {
    for (const schemeName of ['light', 'dark']) {
      assert.deepEqual(profile.schemes[schemeName].provenance, {
        icons: {
          package: '@carbon/icons',
          version: iconPkg.version,
          map_source: iconMap.source,
          map_sha256: iconMap.source_sha256
        }
      });
    }
    assert.equal(iconPkg.version, '11.89.0');
    assert.deepEqual(Object.keys(iconMap.icons).map(function (name) { return 'icon.' + name; }), iconKeys);
  });

});


describe('default template - unit gate', () => {

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


describe('default template - regeneration test', () => {

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


describe('default template - every scheme resolves every token', () => {

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


describe('default template - v5 control roles and corrected inverse steps', () => {

  const light = Themer.buildTheme(profile.schemes.light, [], 'native').tokens;
  const dark = Themer.buildTheme(profile.schemes.dark, [], 'native').tokens;

  it('should state the primary reference geometry for every control role', () => {
    assert.deepEqual({
      button_height: light['control.button_height'],
      button_radius: light['control.button_radius'],
      button_padding_start: light['control.button_padding_start'],
      button_padding_end: light['control.button_padding_end'],
      button_icon_size: light['control.button_icon_size'],
      field_height: light['control.field_height'],
      field_radius: light['control.field_radius'],
      field_icon_size: light['control.field_icon_size'],
      checkbox_size: light['control.checkbox_size'],
      checkbox_border: light['control.checkbox_border'],
      option_height: light['control.option_height']
    }, {
      button_height: 48, button_radius: 0, button_padding_start: 16, button_padding_end: 64, button_icon_size: 16,
      field_height: 40, field_radius: 0, field_icon_size: 16, checkbox_size: 16, checkbox_border: 1, option_height: 40
    });
  });

  it('should draw the button label like compact body text and the raised field label like a label', () => {
    assert.deepEqual(light['type.button_label'], light['type.body_compact_01']);
    assert.deepEqual(light['type.field_label_raised'], light['type.label01']);
  });

  it('should put inverse icons on the page end of the ramp and the inverse background on the far end', () => {
    for (const tokens of [light, dark]) {
      assert.equal(tokens['color.icon_inverse'], tokens['color.text_inverse']);
      assert.equal(tokens['color.icon_on_color'], tokens['color.text_on_color']);
      assert.notEqual(tokens['color.icon_inverse'], tokens['color.icon_primary']);
      assert.equal(tokens['color.background_inverse'], tokens['color.text_primary']);
      assert.notEqual(tokens['color.background_inverse'], tokens['color.background']);
    }
  });

  it('should fill tonal and elevated buttons from the layer steps and check controls in the primary icon color', () => {
    assert.equal(light['color.button_tonal'], light['color.layer_01']);
    assert.equal(light['color.button_tonal_hover'], light['color.layer_02']);
    assert.equal(light['color.button_elevated'], light['color.layer_01']);
    assert.equal(light['color.text_on_button_tonal'], light['color.text_primary']);
    assert.equal(light['color.control_checked'], light['color.icon_primary']);
  });

});


describe('default template - role grid (v5 amendment)', () => {

  const contract = Themer.getContract();
  const cells = Object.keys(contract.grid).flatMap(function (group) {
    return contract.grid[group].map(function (cell) {
      return group + '.' + cell;
    });
  });

  for (const schemeName of ['light', 'dark']) {

    it('should answer every grid cell in ' + schemeName + ' by an alias, a rule or its own literal', () => {
      const tokens = profile.schemes[schemeName].tokens;
      for (const name of cells) {
        assert.notEqual(tokens[name], undefined, name);
      }
    });

    it('should draw the primary reference anatomy in ' + schemeName + ': a ring inside the edge, no field hover on a text input', () => {
      const built = Themer.buildTheme(profile.schemes[schemeName], [], 'native').tokens;
      assert.equal(built['control.button_focus_offset'], -2);
      assert.equal(built['control.field_focus_offset'], -2);
      assert.equal(built['color.text_input_container_hover'], built['color.field_container']);
      assert.equal(built['feedback.focus_trigger'], 'any');
      assert.equal(built['color.select_outline_disabled'], 'rgba(0, 0, 0, 0)');
    });

  }

});

