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
    assert.equal(profile.contract_version, 10);
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

// --- contract v10: the milestone-6 census cells ------------------------------
const V10_RAW = {
    'color.tile_container': '{color.layer_01}',
    'control.tile_padding': '{spacing.spacing_05}',
    'control.tile_min_height': 64,
    'control.tile_min_width': 128,
    'type.tile': '{type.body_compact_01}',
    'color.tile_label': '{color.text_primary}',
    'color.tile_focus': '{color.focus}',
    'control.tile_focus_width': '{focus.width}',
    'color.tile_container_hover': '{color.layer_hover_01}',
    'color.tile_label_disabled': '{color.text_disabled}',
    'control.tile_icon_size': 20,
    'control.tile_icon_inset': '{spacing.spacing_04}',
    'color.tile_icon': '{color.icon_interactive}',
    'color.tile_icon_disabled': '{color.icon_disabled}',
    'control.tile_border_width': '{border.width_01}',
    'control.tile_mark_space': '{spacing.spacing_09}',
    'control.tile_mark_size': 16,
    'control.tile_mark_inset': '{spacing.spacing_05}',
    'color.tile_mark': '{color.icon_secondary}',
    'color.tile_mark_selected': '{color.icon_primary}',
    'color.tile_mark_disabled': '{color.icon_disabled}',
    'color.tile_border_selected': '{color.layer_selected_inverse}',
    'color.tile_border_selected_disabled': '{color.border_disabled}',
    'control.tile_chevron_seat': 48,
    'color.tile_chevron': '{color.icon_primary}',
    'color.pagination_container': '{color.layer_01}',
    'color.pagination_divider': '{color.border_subtle_00}',
    'control.pagination_divider_width': '{border.width_01}',
    'type.pagination': '{type.body_compact_01}',
    'color.pagination_label': '{color.text_primary}',
    'color.pagination_count_label': '{color.text_secondary}',
    'control.pagination_padding_inline': '{spacing.spacing_05}',
    'control.pagination_text_gap': '{spacing.spacing_05}',
    'control.pagination_select_padding_start': '{spacing.spacing_05}',
    'control.pagination_select_padding_end': 36,
    'color.pagination_select_container_hover': '{color.layer_hover_01}',
    'color.pagination_button_icon': '{color.icon_primary}',
    'color.pagination_button_icon_disabled': '{color.icon_disabled}',
    'color.pagination_button_container_hover': '{color.layer_hover_01}',
    'control.pagination_collapse_width': 672,
    'type.pagination_nav_page': {type_set:true,font_size:14,line_height_px:14,letter_spacing:0.16,weight:400,font_family:'sans'},
    'type.pagination_nav_page_active': {type_set:true,font_size:14,line_height_px:14,letter_spacing:0.16,weight:600,font_family:'sans'},
    'color.pagination_nav_page_label': '{color.text_primary}',
    'color.pagination_nav_page_label_disabled': {op:'alpha',args:['color.text_secondary',0.5]},
    'color.pagination_nav_page_container_hover': '{color.background_hover}',
    'control.pagination_nav_page_padding_inline': '{spacing.spacing_02}',
    'control.pagination_nav_indicator_width': 16,
    'control.pagination_nav_indicator_height': 4,
    'color.pagination_nav_indicator': '{color.border_interactive}',
    'color.pagination_nav_focus': '{color.focus}',
    'control.pagination_nav_focus_width': '{focus.width}',
    'control.pagination_skeleton_width_short': 35,
    'control.pagination_skeleton_width_medium': 70,
    'control.pagination_skeleton_width_long': 105,
    'color.tree_node_container': '{color.layer_01}',
    'color.tree_node_container_hover': '{color.layer_hover_01}',
    'color.tree_node_container_selected': '{color.layer_selected_01}',
    'color.tree_node_container_selected_hover': '{color.layer_selected_hover_01}',
    'color.tree_node_label': '{color.text_secondary}',
    'color.tree_node_label_hover': '{color.text_primary}',
    'color.tree_node_label_selected': '{color.text_primary}',
    'color.tree_node_icon': '{color.icon_secondary}',
    'color.tree_node_icon_hover': '{color.icon_primary}',
    'color.tree_node_indicator': '{color.interactive}',
    'control.tree_node_indicator_width': 4,
    'color.tree_node_container_disabled': '{color.field_01}',
    'color.tree_node_label_disabled': '{color.text_disabled}',
    'color.tree_node_icon_disabled': '{color.icon_disabled}',
    'color.tree_focus': '{color.focus}',
    'control.tree_focus_width': '{focus.width}',
    'control.tree_node_padding_start': '{spacing.spacing_05}',
    'control.tree_label_padding_end': '{spacing.spacing_05}',
    'control.tree_leaf_padding_block': 7,
    'type.tree_node_label': {type_set:true,font_size:14,line_height_px:16.8,letter_spacing:0.16,weight:400,font_family:'sans'},
    'control.tree_label_text_padding_start': '{spacing.spacing_02}',
    'control.tree_leaf_padding_start': '{spacing.spacing_08}',
    'control.tree_leaf_padding_start_icon': '{spacing.spacing_07}',
    'control.tree_leaf_padding_start_nested_icon': '{spacing.spacing_06}',
    'control.tree_indent': '{spacing.spacing_05}',
    'control.tree_toggle_size': 24,
    'control.tree_toggle_offset': '{spacing.spacing_02}',
    'control.tree_icon_size': 16,
    'control.tree_icon_gap': '{spacing.spacing_03}',
    'type.date_picker_value': '{type.code02}',
    'control.date_picker_range_input_width': 143.5,
    'control.date_picker_calendar_width': 288,
    'control.date_picker_calendar_padding_inline': '{spacing.spacing_02}',
    'control.date_picker_calendar_padding_top': '{spacing.spacing_02}',
    'control.date_picker_calendar_padding_bottom': '{spacing.spacing_03}',
    'color.date_picker_calendar_container': '{color.layer_01}',
    'shadow.date_picker_calendar': '{shadow.level_01}',
    'control.date_picker_header_height': 40,
    'control.date_picker_nav_size': 40,
    'control.date_picker_year_width': 60,
    'control.date_picker_weekday_height': 40,
    'control.date_picker_day_size': 40,
    'type.date_picker_month': '{type.heading_compact_01}',
    'type.date_picker_day': '{type.body_compact_01}',
    'type.date_picker_day_today': {type_set:true,font_size:14,line_height_px:18.00008,letter_spacing:0.16,weight:600,font_family:'sans'},
    'color.date_picker_label': '{color.text_primary}',
    'color.date_picker_nav_icon': '{color.icon_primary}',
    'color.date_picker_nav_icon_disabled': '{color.icon_disabled}',
    'color.date_picker_container_hover': '{color.layer_hover_01}',
    'color.date_picker_year_container_hover': '{color.background_hover}',
    'color.date_picker_day_label_outside': '{color.text_helper}',
    'color.date_picker_day_label_today': '{color.link_primary}',
    'control.date_picker_today_mark_size': 4,
    'control.date_picker_today_mark_offset': 7,
    'color.date_picker_day_container_selected': '{color.button_primary}',
    'color.date_picker_day_label_selected': '{color.text_on_color}',
    'color.date_picker_day_container_range': '{color.highlight}',
    'color.date_picker_day_label_disabled': '{color.text_disabled}',
    'color.date_picker_day_focus': '{color.button_primary}',
    'color.date_picker_day_focus_selected': '{color.layer_02}',
    'control.date_picker_day_focus_width_selected': '{border.width_01}',
    'control.date_picker_day_focus_inset_selected': 3,
    'type.file_uploader_title': '{type.heading_compact_01}',
    'color.file_uploader_title': '{color.text_primary}',
    'control.file_uploader_title_gap': '{spacing.spacing_03}',
    'type.file_uploader_description': '{type.label01}',
    'color.file_uploader_description': '{color.text_secondary}',
    'color.file_uploader_label_disabled': '{color.text_disabled}',
    'control.file_uploader_list_gap': '{spacing.spacing_06}',
    'color.file_uploader_item_container': '{color.layer_01}',
    'control.file_uploader_item_max_width': 320,
    'control.file_uploader_item_gap': '{spacing.spacing_03}',
    'control.file_uploader_item_row_gap': '{spacing.spacing_04}',
    'type.file_uploader_item': '{type.body_compact_01}',
    'color.file_uploader_item_label': '{color.text_primary}',
    'control.file_uploader_item_padding_start': '{spacing.spacing_05}',
    'control.file_uploader_name_max_width': 280,
    'control.file_uploader_name_max_width_invalid': 248,
    'color.file_uploader_item_outline_invalid': '{color.support_error}',
    'control.file_uploader_item_outline_width': '{border.width_01}',
    'type.file_uploader_error_title': '{type.heading_compact_01}',
    'type.file_uploader_error_body': '{type.body_compact_01}',
    'color.file_uploader_error_title': '{color.text_primary}',
    'color.file_uploader_error_body': '{color.text_secondary}',
    'control.file_uploader_close_size': 24,
    'color.file_uploader_close_icon': '{color.icon_primary}',
    'color.file_uploader_close_icon_disabled': '{color.icon_disabled}',
    'color.file_uploader_invalid_icon': '{color.support_error}',
    'control.file_uploader_invalid_icon_gap': '{spacing.spacing_03}',
    'color.file_uploader_complete_icon': '{color.interactive}',
    'control.file_uploader_drop_height': 96,
    'color.file_uploader_drop_outline': '{color.border_strong_01}',
    'color.file_uploader_drop_outline_disabled': '{color.button_disabled}',
    'color.file_uploader_drop_outline_active': '{color.focus}',
    'control.file_uploader_drop_outline_width_active': '{focus.width}',
    'color.file_uploader_drop_label': '{color.link_primary}',
    'color.file_uploader_drop_label_active': '{color.text_primary}',
    'control.file_uploader_skeleton_title_width': 100,
    'control.file_uploader_skeleton_description_width': 225,
    'color.card_container': '{color.layer_01}',
    'color.card_label': '{color.text_primary}',
    'control.card_border_width': '{border.width_01}',
    'color.card_outline_clickable': '{color.border_tile_01}',
    'color.card_container_hover': '{color.layer_hover_01}',
    'color.card_focus': '{color.focus}',
    'control.card_focus_width': '{focus.width}',
    'control.card_padding': '{spacing.spacing_05}',
    'control.card_header_padding_bottom_label': '{spacing.spacing_03}',
    'control.card_actions_space': '{spacing.spacing_03}',
    'type.card_label': '{type.label01}',
    'type.card_description': '{type.label01}',
    'type.card_title': '{type.heading_compact_02}',
    'type.card_title_large': '{type.heading03}',
    'control.card_text_gap': '{spacing.spacing_01}',
    'type.card_body': '{type.body_compact_01}',
    'control.card_body_padding_top': '{spacing.spacing_03}',
    'color.card_divider': '{color.border_subtle_01}',
    'control.card_divider_width': '{border.width_01}',
    'control.card_actions_height': 32,
    'control.card_action_padding_inline': '{spacing.spacing_04}',
    'control.card_actions_offset': '{spacing.spacing_02}',
    'control.card_action_divider_height': 24,
    'control.card_action_divider_width': 0.8,
    'color.card_action_divider': '{color.layer_hover_01}',
    'control.card_icon_padding': '{spacing.spacing_03}',
    'control.card_icon_gap': '{spacing.spacing_05}',
    'color.card_icon_container_hover': '{color.layer_hover_01}',
    'color.card_icon_active': '{color.link_primary_hover}',
    'type.empty_state_title': '{type.heading03}',
    'type.empty_state_title_small': '{type.body_compact_02}',
    'type.empty_state_subtitle': '{type.body01}',
    'type.empty_state_subtitle_small': '{type.label01}',
    'color.empty_state_title': '{color.text_primary}',
    'color.empty_state_subtitle': '{color.text_secondary}',
    'control.empty_state_title_gap': '{spacing.spacing_03}',
    'control.empty_state_subtitle_gap': '{spacing.spacing_05}',
    'control.empty_state_illustration_size': '{spacing.spacing_11}',
    'control.empty_state_illustration_size_small': '{spacing.spacing_10}',
    'control.empty_state_illustration_gap': '{spacing.spacing_05}',
    'control.empty_state_action_gap': '{spacing.spacing_05}',
    'color.page_header_container': '{color.background}',
    'color.page_header_container_scrolled': '{color.layer_01}',
    'color.page_header_shadow': '{color.layer_accent_01}',
    'control.page_header_padding_inline': '{spacing.spacing_07}',
    'control.page_header_breadcrumb_height': 40,
    'control.page_header_breadcrumb_gap': '{spacing.spacing_02}',
    'color.page_header_bar_collapsed': '{color.layer_01}',
    'control.page_header_row_gap': '{spacing.spacing_05}',
    'type.page_header_title': '{type.heading04}',
    'color.page_header_title': '{color.text_primary}',
    'control.page_header_title_min_height': 40,
    'control.page_header_title_icon_size': '{size.icon_01}',
    'control.page_header_title_icon_gap': '{spacing.spacing_04}',
    'type.page_header_subtitle': '{type.body01}',
    'color.page_header_subtitle': '{color.text_primary}',
    'control.page_header_subtitle_gap': '{spacing.spacing_03}',
    'control.page_header_tags_padding_block': '{spacing.spacing_02}',
    'control.page_header_tags_padding_end': '{spacing.spacing_07}',
    'color.page_header_divider': '{color.border_subtle_00}',
    'control.tearsheet_inset_inline': '{spacing.spacing_10}',
    'control.tearsheet_inset_top': 90,
    'control.tearsheet_inset_top_lower': 130,
    'control.tearsheet_stack_offset': '{spacing.spacing_05}',
    'control.tearsheet_enter_offset': 500,
    'control.tearsheet_header_height': '{spacing.spacing_11}',
    'control.tearsheet_header_padding_end': '{spacing.spacing_11}',
    'control.tearsheet_header_padding_block': '{spacing.spacing_06}',
    'control.tearsheet_header_padding_inline': '{spacing.spacing_07}',
    'color.tearsheet_header_container': '{color.layer_01}',
    'type.tearsheet_heading': '{type.heading04}',
    'control.tearsheet_description_gap': '{spacing.spacing_05}',
    'control.tearsheet_description_max_ratio': 0.6,
    'type.tearsheet_description': '{type.body_compact_01}',
    'control.tearsheet_navigation_gap': '{spacing.spacing_04}',
    'control.tearsheet_influencer_width': 256,
    'control.tearsheet_influencer_width_wide': 320,
    'color.tearsheet_influencer_container': '{color.layer_01}',
    'color.tearsheet_divider': '{color.border_subtle_01}',
    'control.tearsheet_divider_width': '{border.width_01}',
    'color.tearsheet_main_container': '{color.background}',
    'color.tearsheet_actions_container': '{color.background}',
    'control.tearsheet_action_height': '{spacing.spacing_11}',
    'control.tearsheet_action_padding_top': '{spacing.spacing_05}',
    'control.tearsheet_action_padding_bottom': '{spacing.spacing_07}',
    'control.tearsheet_action_max_width': 232,
    'control.toggletip_focus_width': '{border.width_01}',
    'control.toggletip_focus_offset': 0,
    'control.tag_height_large': 32
};
const V10_BUILT = {
    'color.tile_container': {a:'color.layer_01'},
    'control.tile_padding': {a:'spacing.spacing_05'},
    'control.tile_min_height': {v:64},
    'control.tile_min_width': {v:128},
    'type.tile': {a:'type.body_compact_01'},
    'color.tile_label': {a:'color.text_primary'},
    'color.tile_focus': {a:'color.focus'},
    'control.tile_focus_width': {a:'focus.width'},
    'color.tile_container_hover': {a:'color.layer_hover_01'},
    'color.tile_label_disabled': {a:'color.text_disabled'},
    'control.tile_icon_size': {v:20},
    'control.tile_icon_inset': {a:'spacing.spacing_04'},
    'color.tile_icon': {a:'color.icon_interactive'},
    'color.tile_icon_disabled': {a:'color.icon_disabled'},
    'control.tile_border_width': {a:'border.width_01'},
    'control.tile_mark_space': {a:'spacing.spacing_09'},
    'control.tile_mark_size': {v:16},
    'control.tile_mark_inset': {a:'spacing.spacing_05'},
    'color.tile_mark': {a:'color.icon_secondary'},
    'color.tile_mark_selected': {a:'color.icon_primary'},
    'color.tile_mark_disabled': {a:'color.icon_disabled'},
    'color.tile_border_selected': {a:'color.layer_selected_inverse'},
    'color.tile_border_selected_disabled': {a:'color.border_disabled'},
    'control.tile_chevron_seat': {v:48},
    'color.tile_chevron': {a:'color.icon_primary'},
    'color.pagination_container': {a:'color.layer_01'},
    'color.pagination_divider': {a:'color.border_subtle_00'},
    'control.pagination_divider_width': {a:'border.width_01'},
    'type.pagination': {a:'type.body_compact_01'},
    'color.pagination_label': {a:'color.text_primary'},
    'color.pagination_count_label': {a:'color.text_secondary'},
    'control.pagination_padding_inline': {a:'spacing.spacing_05'},
    'control.pagination_text_gap': {a:'spacing.spacing_05'},
    'control.pagination_select_padding_start': {a:'spacing.spacing_05'},
    'control.pagination_select_padding_end': {v:36},
    'color.pagination_select_container_hover': {a:'color.layer_hover_01'},
    'color.pagination_button_icon': {a:'color.icon_primary'},
    'color.pagination_button_icon_disabled': {a:'color.icon_disabled'},
    'color.pagination_button_container_hover': {a:'color.layer_hover_01'},
    'control.pagination_collapse_width': {v:672},
    'type.pagination_nav_page': {t:{fontSize:14,lineHeight:14,letterSpacing:0.16,fontWeight:'400',fontFamily:'sans'}},
    'type.pagination_nav_page_active': {t:{fontSize:14,lineHeight:14,letterSpacing:0.16,fontWeight:'600',fontFamily:'sans'}},
    'color.pagination_nav_page_label': {a:'color.text_primary'},
    'color.pagination_nav_page_label_disabled': {alpha:'color.text_secondary'},
    'color.pagination_nav_page_container_hover': {a:'color.background_hover'},
    'control.pagination_nav_page_padding_inline': {a:'spacing.spacing_02'},
    'control.pagination_nav_indicator_width': {v:16},
    'control.pagination_nav_indicator_height': {v:4},
    'color.pagination_nav_indicator': {a:'color.border_interactive'},
    'color.pagination_nav_focus': {a:'color.focus'},
    'control.pagination_nav_focus_width': {a:'focus.width'},
    'control.pagination_skeleton_width_short': {v:35},
    'control.pagination_skeleton_width_medium': {v:70},
    'control.pagination_skeleton_width_long': {v:105},
    'color.tree_node_container': {a:'color.layer_01'},
    'color.tree_node_container_hover': {a:'color.layer_hover_01'},
    'color.tree_node_container_selected': {a:'color.layer_selected_01'},
    'color.tree_node_container_selected_hover': {a:'color.layer_selected_hover_01'},
    'color.tree_node_label': {a:'color.text_secondary'},
    'color.tree_node_label_hover': {a:'color.text_primary'},
    'color.tree_node_label_selected': {a:'color.text_primary'},
    'color.tree_node_icon': {a:'color.icon_secondary'},
    'color.tree_node_icon_hover': {a:'color.icon_primary'},
    'color.tree_node_indicator': {a:'color.interactive'},
    'control.tree_node_indicator_width': {v:4},
    'color.tree_node_container_disabled': {a:'color.field_01'},
    'color.tree_node_label_disabled': {a:'color.text_disabled'},
    'color.tree_node_icon_disabled': {a:'color.icon_disabled'},
    'color.tree_focus': {a:'color.focus'},
    'control.tree_focus_width': {a:'focus.width'},
    'control.tree_node_padding_start': {a:'spacing.spacing_05'},
    'control.tree_label_padding_end': {a:'spacing.spacing_05'},
    'control.tree_leaf_padding_block': {v:7},
    'type.tree_node_label': {t:{fontSize:14,lineHeight:16.8,letterSpacing:0.16,fontWeight:'400',fontFamily:'sans'}},
    'control.tree_label_text_padding_start': {a:'spacing.spacing_02'},
    'control.tree_leaf_padding_start': {a:'spacing.spacing_08'},
    'control.tree_leaf_padding_start_icon': {a:'spacing.spacing_07'},
    'control.tree_leaf_padding_start_nested_icon': {a:'spacing.spacing_06'},
    'control.tree_indent': {a:'spacing.spacing_05'},
    'control.tree_toggle_size': {v:24},
    'control.tree_toggle_offset': {a:'spacing.spacing_02'},
    'control.tree_icon_size': {v:16},
    'control.tree_icon_gap': {a:'spacing.spacing_03'},
    'type.date_picker_value': {a:'type.code02'},
    'control.date_picker_range_input_width': {v:143.5},
    'control.date_picker_calendar_width': {v:288},
    'control.date_picker_calendar_padding_inline': {a:'spacing.spacing_02'},
    'control.date_picker_calendar_padding_top': {a:'spacing.spacing_02'},
    'control.date_picker_calendar_padding_bottom': {a:'spacing.spacing_03'},
    'color.date_picker_calendar_container': {a:'color.layer_01'},
    'shadow.date_picker_calendar': {a:'shadow.level_01'},
    'control.date_picker_header_height': {v:40},
    'control.date_picker_nav_size': {v:40},
    'control.date_picker_year_width': {v:60},
    'control.date_picker_weekday_height': {v:40},
    'control.date_picker_day_size': {v:40},
    'type.date_picker_month': {a:'type.heading_compact_01'},
    'type.date_picker_day': {a:'type.body_compact_01'},
    'type.date_picker_day_today': {t:{fontSize:14,lineHeight:18.00008,letterSpacing:0.16,fontWeight:'600',fontFamily:'sans'}},
    'color.date_picker_label': {a:'color.text_primary'},
    'color.date_picker_nav_icon': {a:'color.icon_primary'},
    'color.date_picker_nav_icon_disabled': {a:'color.icon_disabled'},
    'color.date_picker_container_hover': {a:'color.layer_hover_01'},
    'color.date_picker_year_container_hover': {a:'color.background_hover'},
    'color.date_picker_day_label_outside': {a:'color.text_helper'},
    'color.date_picker_day_label_today': {a:'color.link_primary'},
    'control.date_picker_today_mark_size': {v:4},
    'control.date_picker_today_mark_offset': {v:7},
    'color.date_picker_day_container_selected': {a:'color.button_primary'},
    'color.date_picker_day_label_selected': {a:'color.text_on_color'},
    'color.date_picker_day_container_range': {a:'color.highlight'},
    'color.date_picker_day_label_disabled': {a:'color.text_disabled'},
    'color.date_picker_day_focus': {a:'color.button_primary'},
    'color.date_picker_day_focus_selected': {a:'color.layer_02'},
    'control.date_picker_day_focus_width_selected': {a:'border.width_01'},
    'control.date_picker_day_focus_inset_selected': {v:3},
    'type.file_uploader_title': {a:'type.heading_compact_01'},
    'color.file_uploader_title': {a:'color.text_primary'},
    'control.file_uploader_title_gap': {a:'spacing.spacing_03'},
    'type.file_uploader_description': {a:'type.label01'},
    'color.file_uploader_description': {a:'color.text_secondary'},
    'color.file_uploader_label_disabled': {a:'color.text_disabled'},
    'control.file_uploader_list_gap': {a:'spacing.spacing_06'},
    'color.file_uploader_item_container': {a:'color.layer_01'},
    'control.file_uploader_item_max_width': {v:320},
    'control.file_uploader_item_gap': {a:'spacing.spacing_03'},
    'control.file_uploader_item_row_gap': {a:'spacing.spacing_04'},
    'type.file_uploader_item': {a:'type.body_compact_01'},
    'color.file_uploader_item_label': {a:'color.text_primary'},
    'control.file_uploader_item_padding_start': {a:'spacing.spacing_05'},
    'control.file_uploader_name_max_width': {v:280},
    'control.file_uploader_name_max_width_invalid': {v:248},
    'color.file_uploader_item_outline_invalid': {a:'color.support_error'},
    'control.file_uploader_item_outline_width': {a:'border.width_01'},
    'type.file_uploader_error_title': {a:'type.heading_compact_01'},
    'type.file_uploader_error_body': {a:'type.body_compact_01'},
    'color.file_uploader_error_title': {a:'color.text_primary'},
    'color.file_uploader_error_body': {a:'color.text_secondary'},
    'control.file_uploader_close_size': {v:24},
    'color.file_uploader_close_icon': {a:'color.icon_primary'},
    'color.file_uploader_close_icon_disabled': {a:'color.icon_disabled'},
    'color.file_uploader_invalid_icon': {a:'color.support_error'},
    'control.file_uploader_invalid_icon_gap': {a:'spacing.spacing_03'},
    'color.file_uploader_complete_icon': {a:'color.interactive'},
    'control.file_uploader_drop_height': {v:96},
    'color.file_uploader_drop_outline': {a:'color.border_strong_01'},
    'color.file_uploader_drop_outline_disabled': {a:'color.button_disabled'},
    'color.file_uploader_drop_outline_active': {a:'color.focus'},
    'control.file_uploader_drop_outline_width_active': {a:'focus.width'},
    'color.file_uploader_drop_label': {a:'color.link_primary'},
    'color.file_uploader_drop_label_active': {a:'color.text_primary'},
    'control.file_uploader_skeleton_title_width': {v:100},
    'control.file_uploader_skeleton_description_width': {v:225},
    'color.card_container': {a:'color.layer_01'},
    'color.card_label': {a:'color.text_primary'},
    'control.card_border_width': {a:'border.width_01'},
    'color.card_outline_clickable': {a:'color.border_tile_01'},
    'color.card_container_hover': {a:'color.layer_hover_01'},
    'color.card_focus': {a:'color.focus'},
    'control.card_focus_width': {a:'focus.width'},
    'control.card_padding': {a:'spacing.spacing_05'},
    'control.card_header_padding_bottom_label': {a:'spacing.spacing_03'},
    'control.card_actions_space': {a:'spacing.spacing_03'},
    'type.card_label': {a:'type.label01'},
    'type.card_description': {a:'type.label01'},
    'type.card_title': {a:'type.heading_compact_02'},
    'type.card_title_large': {a:'type.heading03'},
    'control.card_text_gap': {a:'spacing.spacing_01'},
    'type.card_body': {a:'type.body_compact_01'},
    'control.card_body_padding_top': {a:'spacing.spacing_03'},
    'color.card_divider': {a:'color.border_subtle_01'},
    'control.card_divider_width': {a:'border.width_01'},
    'control.card_actions_height': {v:32},
    'control.card_action_padding_inline': {a:'spacing.spacing_04'},
    'control.card_actions_offset': {a:'spacing.spacing_02'},
    'control.card_action_divider_height': {v:24},
    'control.card_action_divider_width': {v:0.8},
    'color.card_action_divider': {a:'color.layer_hover_01'},
    'control.card_icon_padding': {a:'spacing.spacing_03'},
    'control.card_icon_gap': {a:'spacing.spacing_05'},
    'color.card_icon_container_hover': {a:'color.layer_hover_01'},
    'color.card_icon_active': {a:'color.link_primary_hover'},
    'type.empty_state_title': {a:'type.heading03'},
    'type.empty_state_title_small': {a:'type.body_compact_02'},
    'type.empty_state_subtitle': {a:'type.body01'},
    'type.empty_state_subtitle_small': {a:'type.label01'},
    'color.empty_state_title': {a:'color.text_primary'},
    'color.empty_state_subtitle': {a:'color.text_secondary'},
    'control.empty_state_title_gap': {a:'spacing.spacing_03'},
    'control.empty_state_subtitle_gap': {a:'spacing.spacing_05'},
    'control.empty_state_illustration_size': {a:'spacing.spacing_11'},
    'control.empty_state_illustration_size_small': {a:'spacing.spacing_10'},
    'control.empty_state_illustration_gap': {a:'spacing.spacing_05'},
    'control.empty_state_action_gap': {a:'spacing.spacing_05'},
    'color.page_header_container': {a:'color.background'},
    'color.page_header_container_scrolled': {a:'color.layer_01'},
    'color.page_header_shadow': {a:'color.layer_accent_01'},
    'control.page_header_padding_inline': {a:'spacing.spacing_07'},
    'control.page_header_breadcrumb_height': {v:40},
    'control.page_header_breadcrumb_gap': {a:'spacing.spacing_02'},
    'color.page_header_bar_collapsed': {a:'color.layer_01'},
    'control.page_header_row_gap': {a:'spacing.spacing_05'},
    'type.page_header_title': {a:'type.heading04'},
    'color.page_header_title': {a:'color.text_primary'},
    'control.page_header_title_min_height': {v:40},
    'control.page_header_title_icon_size': {v:16},
    'control.page_header_title_icon_gap': {a:'spacing.spacing_04'},
    'type.page_header_subtitle': {a:'type.body01'},
    'color.page_header_subtitle': {a:'color.text_primary'},
    'control.page_header_subtitle_gap': {a:'spacing.spacing_03'},
    'control.page_header_tags_padding_block': {a:'spacing.spacing_02'},
    'control.page_header_tags_padding_end': {a:'spacing.spacing_07'},
    'color.page_header_divider': {a:'color.border_subtle_00'},
    'control.tearsheet_inset_inline': {a:'spacing.spacing_10'},
    'control.tearsheet_inset_top': {v:90},
    'control.tearsheet_inset_top_lower': {v:130},
    'control.tearsheet_stack_offset': {a:'spacing.spacing_05'},
    'control.tearsheet_enter_offset': {v:500},
    'control.tearsheet_header_height': {a:'spacing.spacing_11'},
    'control.tearsheet_header_padding_end': {a:'spacing.spacing_11'},
    'control.tearsheet_header_padding_block': {a:'spacing.spacing_06'},
    'control.tearsheet_header_padding_inline': {a:'spacing.spacing_07'},
    'color.tearsheet_header_container': {a:'color.layer_01'},
    'type.tearsheet_heading': {a:'type.heading04'},
    'control.tearsheet_description_gap': {a:'spacing.spacing_05'},
    'control.tearsheet_description_max_ratio': {v:0.6},
    'type.tearsheet_description': {a:'type.body_compact_01'},
    'control.tearsheet_navigation_gap': {a:'spacing.spacing_04'},
    'control.tearsheet_influencer_width': {v:256},
    'control.tearsheet_influencer_width_wide': {v:320},
    'color.tearsheet_influencer_container': {a:'color.layer_01'},
    'color.tearsheet_divider': {a:'color.border_subtle_01'},
    'control.tearsheet_divider_width': {a:'border.width_01'},
    'color.tearsheet_main_container': {a:'color.background'},
    'color.tearsheet_actions_container': {a:'color.background'},
    'control.tearsheet_action_height': {a:'spacing.spacing_11'},
    'control.tearsheet_action_padding_top': {a:'spacing.spacing_05'},
    'control.tearsheet_action_padding_bottom': {a:'spacing.spacing_07'},
    'control.tearsheet_action_max_width': {v:232},
    'control.toggletip_focus_width': {a:'border.width_01'},
    'control.toggletip_focus_offset': {v:0},
    'control.tag_height_large': {v:32}
};

describe('carbon template - contract v10 census cells', () => {

  it('should answer every v10 cell identically in each scheme', () => {
    for (const schemeName of ['white', 'g10', 'g90', 'g100']) {
      const tokens = profile.schemes[schemeName].tokens;
      for (const [name, expected] of Object.entries(V10_RAW)) {
        assert.deepEqual(tokens[name], expected, schemeName + ' ' + name);
      }
      assert.equal(Object.keys(tokens).length, 1719, schemeName + ' token count');
    }
  });

  it('should resolve every v10 cell in each built scheme', () => {
    for (const schemeName of ['white', 'g10', 'g90', 'g100']) {
      const built = Themer.buildTheme(profile.schemes[schemeName], [], 'native');
      for (const [name, check] of Object.entries(V10_BUILT)) {
        const actual = built.tokens[name];
        assert.ok(actual !== undefined, schemeName + ' missing ' + name);
        if (check.a) {
          assert.deepEqual(actual, built.tokens[check.a], schemeName + ' ' + name);
        } else if (check.v !== undefined) {
          assert.deepEqual(actual, check.v, schemeName + ' ' + name);
        } else if (check.t) {
          assert.deepEqual(actual, check.t, schemeName + ' ' + name);
        } else if (check.alpha) {
          const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(built.tokens[check.alpha]);
          assert.deepEqual(actual, 'rgba(' + parseInt(m[1], 16) + ', ' + parseInt(m[2], 16) + ', ' + parseInt(m[3], 16) + ', 0.5)', schemeName + ' ' + name);
        }
      }
    }
  });

  it('should pin file_uploader_name_max_width under the compact form', () => {
    for (const schemeName of ['white', 'g10', 'g90', 'g100']) {
      const compact = Themer.buildTheme(profile.schemes[schemeName], [], 'native', { variant: { form: 'compact' } });
      assert.equal(compact.tokens['control.file_uploader_name_max_width'], 216, schemeName);
    }
  });

  it('should answer no v10 cell from the default template', () => {
    const names = new Set(Object.keys(V10_RAW));
    for (const schemeName of ['white', 'g10', 'g90', 'g100']) {
      const inherited = profile.schemes[schemeName].from_default.filter(function (k) { return names.has(k); });
      assert.deepEqual(inherited, [], schemeName + ' from_default ' + JSON.stringify(inherited));
    }
  });

});
