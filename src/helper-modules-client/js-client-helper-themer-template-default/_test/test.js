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

  it('should export contract_version 9', () => {
    assert.equal(profile.contract_version, 9);
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
    'anatomy.field_action': 'square',
    'anatomy.button_label': 'top',
    'anatomy.field_counter': 'label',
    'anatomy.switch_state_text': 'shown',
    'anatomy.progress_indeterminate': 'sweep',
    'anatomy.tab_indicator': 'full',
    'anatomy.dialog_close': 'shown',
    'anatomy.list_selected_mark': 'shown',
    'anatomy.field_counter_format': 'tight',
    'anatomy.loading_motion': 'spin',
    'anatomy.tag_close': 'circle',
    'anatomy.tag_selected_mark': 'hidden',
    'anatomy.slider_focus': 'inset',
    'anatomy.slider_disabled_paint': 'independent',
    'anatomy.toggle_widget': 'drawn',
    'anatomy.date_picker_widget': 'drawn',
    'anatomy.time_picker_widget': 'drawn',
    'anatomy.surface_material': 'solid',
    'anatomy.tab_overflow': 'buttons',
    'anatomy.content_switcher_separator': 'short',
    'anatomy.content_switcher_selected_mark': 'hidden',
    'anatomy.overflow_menu_connector': 'shown',
    'anatomy.dialog_scroll_fade': 'shown'
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

  it('should carry 86 icon tokens, every one a valid icon literal, in both schemes', () => {
    assert.equal(iconKeys.length, 86);
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

  it('should draw the primary reference\'s own switch check, not an icon-set glyph', () => {
    for (const schemeName of ['light', 'dark']) {
      assert.deepEqual(profile.schemes[schemeName].tokens['icon.switch_checked_indicator'], { icon: true, viewBox: '0 0 6 5', paths: [{ d: 'M2.2 2.7L5 0 6 1 2.2 5 0 2.7 1 1.5z' }] });
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
      assert.deepEqual(profile.schemes[schemeName].provenance.icons, {
        package: '@carbon/icons',
        version: iconPkg.version,
        map_source: iconMap.source,
        map_sha256: iconMap.source_sha256,
        drawings: {
          switch_checked_indicator: '@carbon/react 1.115.0 Toggle/Toggle.js toggle__check'
        }
      });
    }
    assert.equal(iconPkg.version, '11.89.0');
    assert.deepEqual(Object.keys(iconMap.icons).map(function (name) { return 'icon.' + name; }), iconKeys);
  });

});


describe('default template - unit gate', () => {

  it('should have no string matching (rem|em|px|vw|vh|%|ms)$ in any scheme', () => {
    const unitRegex = /[0-9.](rem|em|px|vw|vh|%|ms)$/;

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
      it('should emit a value for all ' + contractKeys.length + ' tokens of ' + schemeName + ' on ' + platform, () => {
        const built = Themer.buildTheme(profile.schemes[schemeName], [], platform);
        const names = Object.keys(built.tokens);
        assert.equal(names.length, contractKeys.length);
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

    it('should answer the two v8 control cells with their exact values in ' + schemeName + ', raw and built', () => {
      const scheme = profile.schemes[schemeName];
      assert.equal(scheme.tokens['control.number_input_min_width'], 150, schemeName + ' raw');
      assert.equal(scheme.tokens['control.toggle_skeleton_circle_size'], 18, schemeName + ' raw');
      const built = Themer.buildTheme(scheme, [], 'native').tokens;
      assert.equal(built['control.number_input_min_width'], 150, schemeName + ' built');
      assert.equal(built['control.toggle_skeleton_circle_size'], 18, schemeName + ' built');
    });

    it('should answer the two v8 metrics cells with their exact values in ' + schemeName + ', raw and built', () => {
      const scheme = profile.schemes[schemeName];
      assert.equal(scheme.tokens['control.text_area_skeleton_height'], 100, schemeName + ' raw');
      assert.equal(scheme.tokens['color.search_placeholder_disabled'], '{color.field_container_disabled}', schemeName + ' raw alias');
      const built = Themer.buildTheme(scheme, [], 'native').tokens;
      assert.equal(built['control.text_area_skeleton_height'], 100, schemeName + ' built');
      assert.equal(built['color.search_placeholder_disabled'], built['color.field_container_disabled'], schemeName + ' built');
    });

    it('should answer the five v8 review cells with their exact values in ' + schemeName + ', raw and built', () => {
      const scheme = profile.schemes[schemeName];
      assert.equal(scheme.tokens['control.radio_skeleton_label_height'], 18, schemeName + ' raw');
      assert.equal(scheme.tokens['color.search_outline_disabled'], 'rgba(0, 0, 0, 0)', schemeName + ' raw');
      assert.equal(scheme.tokens['color.number_input_action_container_active'], '{color.field_action_container_hover}', schemeName + ' raw alias');
      assert.equal(scheme.tokens['color.tag_close_layer_active'], 'rgba(0, 0, 0, 0)', schemeName + ' raw');
      assert.equal(scheme.tokens['color.tag_selectable_layer_unselected_active'], '{color.tag_selectable_layer_active}', schemeName + ' raw alias');
      assert.equal(scheme.tokens['control.tag_close_focus_offset'], 0, schemeName + ' raw close focus offset');
      const built = Themer.buildTheme(scheme, [], 'native').tokens;
      assert.equal(built['control.radio_skeleton_label_height'], 18, schemeName + ' built');
      assert.equal(built['color.search_outline_disabled'], 'rgba(0, 0, 0, 0)', schemeName + ' built');
      assert.equal(built['color.number_input_action_container_active'], built['color.field_action_container_hover'],
        schemeName + ' built active stepper keeps the hover fill');
      // The two new tag layers resolve transparent on the primary
      assert.equal(built['color.tag_close_layer_active'], 'rgba(0, 0, 0, 0)', schemeName + ' built');
      assert.equal(built['color.tag_selectable_layer_unselected_active'], 'rgba(0, 0, 0, 0)', schemeName + ' built');
      assert.equal(built['control.tag_close_focus_offset'], 0, schemeName + ' built close focus offset');
    });

    it('should answer the twelve v8 slider metrics cells in ' + schemeName + ', raw and built', () => {
      const scheme = profile.schemes[schemeName];
      assert.equal(scheme.tokens['control.slider_height'], 32, schemeName + ' raw');
      assert.equal(scheme.tokens['control.slider_track_inset'], 0, schemeName + ' raw');
      assert.equal(scheme.tokens['control.slider_handle_inset'], 0, schemeName + ' raw');
      assert.equal(scheme.tokens['control.slider_handle_size_active'], 20.0004, schemeName + ' raw');
      assert.equal(scheme.tokens['control.slider_focus_size'], 20, schemeName + ' raw');
      assert.equal(scheme.tokens['control.slider_focus_offset'], 0, schemeName + ' raw');
      assert.equal(scheme.tokens['control.slider_focus_width'], 2, schemeName + ' raw');
      assert.equal(scheme.tokens['control.slider_focus_gap_width'], 1, schemeName + ' raw');
      assert.equal(scheme.tokens['control.slider_input_outline_width_disabled'], '{control.field_outline_width}', schemeName + ' raw alias');
      assert.equal(scheme.tokens['anatomy.slider_focus'], 'inset', schemeName + ' raw');
      assert.equal(scheme.tokens['anatomy.slider_disabled_paint'], 'independent', schemeName + ' raw');
      assert.equal(scheme.tokens['color.slider_focus_ring'], '{color.slider_handle_focus}', schemeName + ' raw alias');
      assert.equal(scheme.tokens['shadow.slider_handle_disabled'], '{shadow.level_00}', schemeName + ' raw alias');
      const built = Themer.buildTheme(scheme, [], 'native').tokens;
      assert.equal(built['control.slider_height'], 32, schemeName + ' built');
      assert.equal(built['control.slider_track_inset'], 0, schemeName + ' built');
      assert.equal(built['control.slider_handle_inset'], 0, schemeName + ' built');
      assert.equal(built['control.slider_handle_size_active'], 20.0004, schemeName + ' built');
      assert.equal(built['control.slider_focus_size'], 20, schemeName + ' built');
      assert.equal(built['control.slider_focus_offset'], 0, schemeName + ' built');
      assert.equal(built['control.slider_focus_width'], 2, schemeName + ' built');
      assert.equal(built['control.slider_focus_gap_width'], 1, schemeName + ' built');
      assert.equal(built['control.slider_input_outline_width_disabled'], built['control.field_outline_width'], schemeName + ' built');
      assert.equal(built['anatomy.slider_focus'], 'inset', schemeName + ' built');
      assert.equal(built['anatomy.slider_disabled_paint'], 'independent', schemeName + ' built');
      assert.equal(built['color.slider_focus_ring'], built['color.slider_handle_focus'], schemeName + ' built');
      assert.deepEqual(built['shadow.slider_handle_disabled'], built['shadow.level_00'], schemeName + ' built');
    });

  }

});


describe('default template - v9 adaptive cells', () => {

  for (const schemeName of ['light', 'dark']) {

    it('should answer the three adaptive cells in ' + schemeName, () => {
      const tokens = profile.schemes[schemeName].tokens;
      // WCAG 2.2 AA 2.5.8's smallest target on the web base (D26 `expanded`)
      assert.equal(tokens['control.target_min'], 24);
      assert.equal(tokens['control.text_scale_max'], 2);
      assert.equal(tokens['type.selection_label'], '{type.body_compact_01}');
      const built = Themer.buildTheme(profile.schemes[schemeName], [], 'native').tokens;
      assert.equal(built['control.target_min'], 24);
      assert.deepEqual(built['type.selection_label'], built['type.body_compact_01']);
    });

    it('should answer the stacked skip link and the v9 follow-up cells in ' + schemeName, () => {
      const tokens = profile.schemes[schemeName].tokens;
      assert.equal(tokens['stacking.skip_link'], 9999);
      assert.equal(tokens['control.popover_max_width'], 368);
      assert.equal(tokens['control.fab_extended_padding_end'], '{control.fab_extended_padding}');
      assert.equal(tokens['color.list_item_container_selected_active'], '{color.list_item_container_active}');
      assert.equal(tokens['control.combo_box_clear_size'], 24);
      assert.equal(tokens['control.combo_box_input_padding_end_invalid'], 105);
    });

    it('should answer the v9 family cells in ' + schemeName, () => {
      const tokens = profile.schemes[schemeName].tokens;
      assert.equal(tokens['control.tab_overflow_button_width'], 40);
      assert.equal(tokens['control.menu_max_width'], 288);
      assert.equal(tokens['control.dialog_width_ratio'], 0.6);
      assert.equal(tokens['control.notification_inline_width'], 736);
      assert.equal(tokens['control.accordion_divider_width'], '{border.width_01}');
      assert.equal(tokens['control.breadcrumb_skeleton_height'], '{spacing.spacing_05}');
      assert.equal(tokens['type.breadcrumb'], '{type.body_compact_01}');
      assert.equal(tokens['control.skip_link_height'], 48);
      assert.deepEqual(tokens['type.skip_link'], { type_set: true, font_size: 16, line_height_px: 16, letter_spacing: 0, weight: 400, font_family: 'sans' });
      // `_list.scss:58-73` parks the ordinal counter at -24px, not spacing_08
      assert.equal(tokens['control.text_list_ordinal_offset'], 24);
      assert.equal(Themer.buildTheme(profile.schemes[schemeName], [], 'native').tokens['control.text_list_ordinal_offset'], 24);
    });

  }

});

describe('default template - v9 variants', () => {

  it('should declare the adaptive options and the two form variants', () => {
    assert.deepEqual(profile.adaptive.options, ['auto', 'fixed', 'form.compact', 'form.medium']);
    for (const schemeName of ['light', 'dark']) {
      assert.deepEqual(Object.keys(profile.schemes[schemeName].variants), ['form.compact', 'form.medium']);
    }
  });

  it('should carry the Carbon Mobile touch pins in each form variant', () => {
    const PINS = {
      'control.target_min': 48,
      'control.field_height': 48,
      'control.checkbox_size': 20,
      'control.radio_size': 20,
      'control.tag_height': 32,
      'control.option_height': 48,
      'control.checkbox_group_gap': 28,
      'control.radio_group_gap_vertical': 28,
      'type.selection_label': '{type.body01}'
    };
    for (const schemeName of ['light', 'dark']) {
      for (const variantName of ['form.compact', 'form.medium']) {
        const tokens = profile.schemes[schemeName].variants[variantName].tokens;
        for (const [name, value] of Object.entries(PINS)) {
          assert.deepEqual(tokens[name], value, schemeName + ' ' + variantName + ' ' + name);
        }
      }
    }
  });

  it('should carry the census pins in each form variant', () => {
    for (const schemeName of ['light', 'dark']) {
      const compact = profile.schemes[schemeName].variants['form.compact'].tokens;
      assert.equal(compact['control.dialog_width_ratio'], 1);
      assert.equal(compact['control.dialog_height_ratio_lg'], 1);
      assert.equal(compact['control.notification_inline_width'], 288);
      assert.equal(compact['control.tab_vertical_list_ratio'], 0.5);
      assert.equal(compact['control.accordion_content_end_ratio'], 0);
      const medium = profile.schemes[schemeName].variants['form.medium'].tokens;
      assert.equal(medium['control.dialog_width_ratio'], 0.84);
      assert.equal(medium['control.dialog_height_ratio'], 0.9);
      assert.equal(medium['control.notification_inline_width'], 608);
      assert.equal(medium['control.tab_vertical_list_ratio'], undefined);
      assert.equal(medium['control.accordion_content_end_ratio'], undefined);
    }
  });

  it('should apply a variant after the base and before caller layers', () => {
    const scheme = profile.schemes.light;
    const base = Themer.buildTheme(scheme, [], 'native');
    const compact = Themer.buildTheme(scheme, [], 'native', { variant: { form: 'compact' } });
    assert.equal(compact.tokens['control.field_height'], 48);
    assert.equal(compact.tokens['control.notification_inline_width'], 288);
    const branded = Themer.buildTheme(scheme,
      [{ name: 'brand', tokens: { 'control.field_height': 44 } }], 'native',
      { variant: { form: 'compact' } });
    assert.equal(branded.tokens['control.field_height'], 44);
    assert.equal(base.tokens['control.field_height'], 40);
  });

  it('should apply nothing under adaptive fixed', () => {
    const scheme = profile.schemes.light;
    const fixed = Themer.buildTheme(scheme, [], 'native', { variant: { form: 'compact' }, adaptive: 'fixed' });
    assert.equal(fixed.tokens['control.field_height'], 40);
    assert.equal(fixed.tokens['control.notification_inline_width'], 736);
  });

  it('should record the variant provenance', () => {
    const provenance = profile.schemes.light.provenance.variants;
    assert.match(provenance['form.compact'], /carbon/i);
    assert.match(provenance.not_applied, /radio_dot_size/);
  });

});

describe('default template - v9 sample brands', () => {

  it('should export the rounded and acme brands', () => {
    assert.deepEqual(Object.keys(profile.brands), ['rounded', 'acme']);
    assert.equal(profile.brands.rounded.name, 'rounded');
    assert.equal(profile.brands.acme.name, 'acme');
  });

  it('should hold valid layers whose tokens are all in the contract', () => {
    for (const brand of Object.values(profile.brands)) {
      for (const polarity of ['light', 'dark']) {
        for (const name of Object.keys(brand[polarity].tokens)) {
          assert.ok(contract.tokens[name], 'brand token not in contract: ' + name);
        }
      }
    }
  });

  it('should build every scheme under its brand with zero violations', () => {
    for (const [schemeName, scheme] of Object.entries(profile.schemes)) {
      for (const brand of Object.values(profile.brands)) {
        const theme = Themer.buildTheme(scheme, [brand[scheme.polarity]], 'native', { contrast: 'report' });
        assert.equal(theme.violations.length, 0, schemeName + ' ' + brand.name + ': ' + JSON.stringify(theme.violations.slice(0, 3)));
      }
    }
  });

  it('should let the rounded brand round the corners and switch the field', () => {
    const theme = Themer.buildTheme(profile.schemes.light, [profile.brands.rounded.light], 'native');
    assert.equal(theme.tokens['feedback.field'], 'outline');
    assert.equal(theme.tokens['shape.radius_00'], 8);
  });

});

describe('default template - the variant option round-trips', () => {

  const FORMS = [undefined, 'compact', 'medium', 'expanded'];
  const PLATFORMS = [undefined, 'web', 'ios', 'android', 'macos', 'windows'];

  for (const [schemeName, scheme] of Object.entries(profile.schemes)) {
    for (const form of FORMS) {
      for (const platform of PLATFORMS) {
        it('should build ' + schemeName + ' under ' + (form || '-') + '/' + (platform || '-') + ' with zero violations', () => {
          const variant = {};
          if (form !== undefined) {
            variant.form = form;
          }
          if (platform !== undefined) {
            variant.platform = platform;
          }
          const theme = Themer.buildTheme(scheme, [], 'native', {
            variant: Object.keys(variant).length ? variant : undefined,
            contrast: 'report'
          });
          assert.equal(theme.violations.length, 0, schemeName + ': ' + JSON.stringify(theme.violations.slice(0, 4)));
        });
      }
    }
  }

});
