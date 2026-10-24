// Info: Test suite for js-client-helper-themer-template-carbon.
//
// Verifies the Carbon reference template: profile identity, scheme count,
// contract validity, parity oracle values, unit gate, regeneration,
// engine build, brand layer, and from_default correctness.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';
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

  it('should export contract_version 9', () => {
    assert.equal(profile.contract_version, 9);
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
      const unitRegex = /[0-9.](rem|em|px|vw|vh|%|ms)$/;
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

  it('should carry 86 valid icon literals, identical across the four schemes', () => {
    assert.equal(iconKeys.length, 86);
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

  it('should draw Carbon\'s own toggle check (@carbon/react Toggle), not an icon-set glyph', () => {
    for (const schemeName of ['white', 'g10', 'g90', 'g100']) {
      assert.deepEqual(profile.schemes[schemeName].tokens['icon.switch_checked_indicator'], { icon: true, viewBox: '0 0 6 5', paths: [{ d: 'M2.2 2.7L5 0 6 1 2.2 5 0 2.7 1 1.5z' }] });
    }
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
      lineHeight: 14 * 1.42857,
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



describe('carbon template - v8 rework amendment', () => {

  // The pinned type package is read straight from the module's own
  // node_modules, the same source the generator reads
  const carbonType = createRequire(resolve(moduleRoot, 'package.json'))('@carbon/type');

  const pxOf = function (rem) {
    const px = parseFloat(rem) * 16;
    const rounded = Math.round(px * 100) / 100;
    return rounded % 1 === 0 ? Math.round(rounded) : rounded;
  };

  it('should preserve the exact fontSize x lineHeight product in every scheme', () => {
    for (const carbonName of ['heading01', 'label01', 'bodyCompact01']) {
      const def = carbonType[carbonName];
      const expected = pxOf(def.fontSize) * def.lineHeight;
      for (const schemeName of Object.keys(profile.schemes)) {
        const sName = /[A-Z]/.test(carbonName)
          ? carbonName.replace(/([A-Z])/g, '_$1').replace(/(\d+)/g, '_$1').toLowerCase().replace(/^_/, '')
          : carbonName.toLowerCase();
        const set = profile.schemes[schemeName].tokens['type.' + sName];
        assert.ok(set, schemeName + ' missing type.' + sName);
        assert.equal(set.line_height_px, expected,
          schemeName + ' type.' + sName + '.line_height_px must be the exact product, not the round');
      }
    }
  });

  it('should keep heading01 under a 20px line box', () => {
    const expected = pxOf(carbonType.heading01.fontSize) * carbonType.heading01.lineHeight;
    assert.ok(expected < 20, 'fixture assumption: the product is below 20');
    for (const schemeName of Object.keys(profile.schemes)) {
      const built = Themer.buildTheme(profile.schemes[schemeName], [], 'native').tokens;
      assert.equal(built['type.heading01'].lineHeight, expected,
        schemeName + ' built native heading01 loses the product');
    }
  });

  it('should answer the two new control cells itself in every scheme', () => {
    for (const schemeName of Object.keys(profile.schemes)) {
      const scheme = profile.schemes[schemeName];
      assert.equal(scheme.tokens['control.number_input_min_width'], 150, schemeName);
      assert.equal(scheme.tokens['control.toggle_skeleton_circle_size'], 18, schemeName);
      for (const name of ['control.number_input_min_width', 'control.toggle_skeleton_circle_size']) {
        assert.equal(scheme.from_default.includes(name), false, name + ' completed from the default');
      }
    }
  });

  it('should answer the two v8 metrics cells itself in every scheme, raw and built', () => {
    for (const schemeName of Object.keys(profile.schemes)) {
      const scheme = profile.schemes[schemeName];
      assert.equal(scheme.tokens['control.text_area_skeleton_height'], 100, schemeName + ' raw');
      assert.equal(scheme.tokens['color.search_placeholder_disabled'], '{color.field_container_disabled}', schemeName + ' raw alias');
      const built = Themer.buildTheme(scheme, [], 'native').tokens;
      assert.equal(built['control.text_area_skeleton_height'], 100, schemeName + ' built');
      assert.equal(built['color.search_placeholder_disabled'], built['color.field_container_disabled'],
        schemeName + ' built placeholder is the disabled field fill');
      for (const name of ['control.text_area_skeleton_height', 'color.search_placeholder_disabled']) {
        assert.equal(scheme.from_default.includes(name), false, name + ' completed from the default');
      }
    }
  });

  it('should answer the five v8 review cells itself in every scheme, raw and built', () => {
    for (const schemeName of Object.keys(profile.schemes)) {
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
      for (const name of ['control.radio_skeleton_label_height', 'color.search_outline_disabled',
          'color.number_input_action_container_active', 'color.tag_close_layer_active',
          'color.tag_selectable_layer_unselected_active', 'control.tag_close_focus_offset']) {
        assert.equal(scheme.from_default.includes(name), false, name + ' completed from the default');
      }
    }
  });

  it('should answer the twelve v8 slider metrics cells itself in every scheme, raw and built', () => {
    const added = ['control.slider_height', 'control.slider_track_inset', 'control.slider_handle_inset',
      'control.slider_focus_size', 'control.slider_focus_offset', 'control.slider_input_outline_width_disabled',
      'control.slider_focus_width', 'control.slider_focus_gap_width',
      'color.slider_focus_ring', 'shadow.slider_handle_disabled', 'anatomy.slider_focus',
      'anatomy.slider_disabled_paint'];
    for (const schemeName of Object.keys(profile.schemes)) {
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
      for (const name of added) {
        assert.equal(scheme.from_default.includes(name), false, name + ' completed from the default');
      }
    }
  });

});

describe('carbon template - v9 adaptive cells', () => {

  for (const schemeName of ['white', 'g10', 'g90', 'g100']) {

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

    it('should answer the v9 cells Carbon owns in ' + schemeName, () => {
      const tokens = profile.schemes[schemeName].tokens;
      assert.equal(tokens['control.tab_overflow_button_width'], 40);
      assert.equal(tokens['control.menu_max_width'], 288);
      assert.equal(tokens['control.dialog_width_ratio'], 0.6);
      assert.equal(tokens['control.notification_inline_width'], 736);
      assert.equal(tokens['control.breadcrumb_gap'], '{spacing.spacing_03}');
      assert.equal(tokens['stacking.skip_link'], 9999);
      assert.equal(tokens['control.popover_max_width'], 368);
      assert.equal(tokens['control.combo_box_clear_size'], 24);
      assert.equal(tokens['control.combo_box_input_padding_end_invalid'], 105);
      assert.equal(tokens['control.fab_extended_padding_end'], '{control.fab_extended_padding}');
      assert.equal(tokens['color.list_item_container_selected_active'], '{color.list_item_container_active}');
      // `_list.scss:58-73` parks the ordinal counter at -24px, not spacing_08
      assert.equal(tokens['control.text_list_ordinal_offset'], 24);
      assert.equal(Themer.buildTheme(profile.schemes[schemeName], [], 'native').tokens['control.text_list_ordinal_offset'], 24);
    });

    it('should paint the low-contrast content switcher from its own component fills in ' + schemeName, () => {
      const tokens = profile.schemes[schemeName].tokens;
      for (const name of ['color.content_switcher_low_contrast_container', 'color.content_switcher_low_contrast_container_hover', 'color.content_switcher_low_contrast_container_selected']) {
        assert.ok(tokens[name] !== undefined, name + ' missing');
        assert.equal(typeof tokens[name] === 'string' && tokens[name].charAt(0) !== '{', true, name + ' aliases instead of the component fill');
      }
    });

  }

});

describe('carbon template - v9 variants', () => {

  const SCHEMES = ['white', 'g10', 'g90', 'g100'];
  const TOUCH_PINS = {
    'control.target_min': 48,
    'control.field_height': 48,
    'control.checkbox_size': 20,
    'control.radio_size': 20,
    'control.tag_height': 32,
    'control.option_height': 48,
    'control.menu_item_height': 48,
    'control.checkbox_group_gap': 28,
    'control.radio_group_gap_vertical': 28,
    'type.selection_label': '{type.body01}'
  };

  it('should declare the adaptive options and all four variants', () => {
    assert.deepEqual(profile.adaptive.options, ['auto', 'fixed', 'platform.ios', 'platform.android', 'form.compact', 'form.medium']);
    for (const schemeName of SCHEMES) {
      assert.deepEqual(Object.keys(profile.schemes[schemeName].variants), ['platform.ios', 'platform.android', 'form.compact', 'form.medium']);
    }
  });

  it('should carry the Carbon Mobile touch set in the form variants', () => {
    for (const schemeName of SCHEMES) {
      for (const variantName of ['form.compact', 'form.medium']) {
        const tokens = profile.schemes[schemeName].variants[variantName].tokens;
        for (const [name, value] of Object.entries(TOUCH_PINS)) {
          assert.deepEqual(tokens[name], value, schemeName + ' ' + variantName + ' ' + name);
        }
      }
    }
  });

  it('should pin only the system widgets on the platform variants', () => {
    for (const schemeName of SCHEMES) {
      assert.deepEqual(profile.schemes[schemeName].variants['platform.ios'].tokens, {
        'anatomy.toggle_widget': 'system',
        'anatomy.date_picker_widget': 'system',
        'anatomy.time_picker_widget': 'system'
      });
      assert.deepEqual(profile.schemes[schemeName].variants['platform.android'].tokens, {
        'anatomy.toggle_widget': 'system'
      });
    }
  });

  it('should carry the census form pins', () => {
    for (const schemeName of SCHEMES) {
      const compact = profile.schemes[schemeName].variants['form.compact'].tokens;
      assert.equal(compact['control.dialog_width_ratio'], 1);
      assert.equal(compact['control.notification_inline_width'], 288);
      assert.equal(compact['control.tab_vertical_list_ratio'], 0.5);
      assert.equal(compact['control.accordion_content_end_ratio'], 0);
      const medium = profile.schemes[schemeName].variants['form.medium'].tokens;
      assert.equal(medium['control.dialog_width_ratio'], 0.84);
      assert.equal(medium['control.dialog_height_ratio'], 0.9);
      assert.equal(medium['control.notification_inline_width'], 608);
    }
  });

  it('should apply the platform variant after the form variant and layers after both', () => {
    const scheme = profile.schemes.white;
    const built = Themer.buildTheme(scheme, [], 'native', { variant: { form: 'compact', platform: 'ios' } });
    assert.equal(built.tokens['control.field_height'], 48);
    assert.equal(built.tokens['control.notification_inline_width'], 288);
    assert.equal(built.tokens['anatomy.toggle_widget'], 'system');
    const branded = Themer.buildTheme(scheme,
      [{ name: 'brand', tokens: { 'anatomy.toggle_widget': 'drawn' } }], 'native',
      { variant: { form: 'compact', platform: 'ios' } });
    assert.equal(branded.tokens['anatomy.toggle_widget'], 'drawn');
    const fixed = Themer.buildTheme(scheme, [], 'native',
      { variant: { form: 'compact', platform: 'ios' }, adaptive: 'fixed' });
    assert.equal(fixed.tokens['control.field_height'], 40);
    assert.equal(fixed.tokens['anatomy.toggle_widget'], 'drawn');
    // The touch set is a form axis, not a platform one: an expanded iPad
    // keeps web sizes while its widgets still go to the OS
    const expandedIos = Themer.buildTheme(scheme, [], 'native',
      { variant: { form: 'expanded', platform: 'ios' } });
    assert.equal(expandedIos.tokens['control.checkbox_size'], 16);
    assert.equal(expandedIos.tokens['anatomy.toggle_widget'], 'system');
    assert.equal(expandedIos.tokens['control.field_height'], 40);
  });

  it('should record the variant provenance', () => {
    const provenance = profile.schemes.white.provenance.variants;
    assert.match(provenance['platform.ios'], /react-native/i);
    assert.match(provenance.not_applied, /radio_dot_size/);
  });

});

describe('carbon template - v9 sample brands', () => {

  it('should export the superloom and rounded brands', () => {
    assert.deepEqual(Object.keys(profile.brands), ['superloom', 'rounded']);
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

  it('should carry the D32 dark primary: the light steps, not purple-50', () => {
    assert.equal(profile.brands.superloom.light.tokens['color.interactive'], '#8a3ffc');
    assert.equal(profile.brands.superloom.dark.tokens['color.interactive'], '#a56eff');
    assert.equal(profile.brands.superloom.dark.tokens['color.button_primary'], '#8a3ffc');
    assert.equal(profile.brands.superloom.dark.tokens['color.button_primary_hover'], '#6929c4');
    assert.equal(profile.brands.superloom.dark.tokens['color.button_primary_active'], '#491d8b');
  });

  it('should build every scheme under its brand with zero violations', () => {
    for (const [schemeName, scheme] of Object.entries(profile.schemes)) {
      for (const brand of Object.values(profile.brands)) {
        const theme = Themer.buildTheme(scheme, [brand[scheme.polarity]], 'native', { contrast: 'report' });
        assert.equal(theme.violations.length, 0, schemeName + ' ' + brand.name + ': ' + JSON.stringify(theme.violations.slice(0, 3)));
      }
    }
  });

});

describe('carbon template - the variant option round-trips', () => {

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
