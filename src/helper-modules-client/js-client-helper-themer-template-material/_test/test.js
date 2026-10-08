// Info: Test suite for js-client-helper-themer-template-material.
//
// Verifies the Material 3 reference template: profile identity, scheme count,
// contract validity, parity oracle values, expressive springs (D19), unit gate,
// regeneration, engine build with two-layer shadows, brand layer, and
// from_default correctness.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import loader from './loader.js';
import themerLoader from 'helper-themer';
import defaultProfile from 'helper-themer-template-default';
import profile from 'helper-themer-template-material';
import oracle from './fixtures/parity-oracle.json' with { type: 'json' };
import mapping from '../data/mapping.js';

const { Lib } = loader();
const Themer = themerLoader(Lib, {});

// Material's own values that the engine's role audit reports, each with its
// source; every entry must keep reproducing, so the list can only shrink
const AUDIT_EXCEPTIONS = Object.freeze([
  {
    scheme: 'light_medium_contrast',
    rule: 'contrast',
    tokens: ['color.button_tonal_label_hover', 'color.button_tonal_container_hover'],
    reason: 'Material lays on-secondary-container at 8% over secondary-container for a hovered tonal button (_md-comp-filled-tonal-button.scss); in the medium-contrast light scheme the label reads 4.36:1'
  },
  {
    scheme: 'light_medium_contrast',
    rule: 'contrast',
    tokens: ['color.button_tonal_label_active', 'color.button_tonal_container_active'],
    reason: 'Material keeps the hover layer (8%) under the pressed layer (12%) of a pressed button, as md-ripple draws them; in the medium-contrast light scheme the tonal label reads 3.51:1'
  },
  {
    scheme: 'light',
    rule: 'contrast',
    tokens: ['color.button_primary_label_active', 'color.button_primary_container_active'],
    reason: 'Material keeps the hover layer (8%) under the pressed layer (12%) of a pressed button, as md-ripple draws them; on-primary over primary reads 4.14:1'
  },
  {
    scheme: 'light',
    rule: 'contrast',
    tokens: ['color.button_secondary_label_active', 'color.button_secondary_container_active'],
    reason: 'Material keeps the hover layer (8%) under the pressed layer (12%) of a pressed button, as md-ripple draws them; on-secondary over secondary, the filled recipe with Material roles substituted reads 4.13:1'
  },
  {
    scheme: 'light',
    rule: 'contrast',
    tokens: ['color.button_danger_tertiary_label_active', 'color.button_danger_tertiary_container_active'],
    reason: 'Material keeps the hover layer (8%) under the pressed layer (12%) of a pressed button, as md-ripple draws them; error over the page, the outlined recipe with error substituted reads 4.42:1'
  },
  {
    scheme: 'light',
    rule: 'contrast',
    tokens: ['color.button_danger_ghost_label_active', 'color.button_danger_ghost_container_active'],
    reason: 'Material keeps the hover layer (8%) under the pressed layer (12%) of a pressed button, as md-ripple draws them; error over the page, the text recipe with error substituted reads 4.42:1'
  },
  {
    scheme: 'light',
    rule: 'contrast',
    tokens: ['color.button_elevated_label_active', 'color.button_elevated_container_active'],
    reason: 'Material keeps the hover layer (8%) under the pressed layer (12%) of a pressed button, as md-ripple draws them; primary over surface-container-low reads 4.49:1'
  }
]);
const contract = Themer.getContract();
const contractKeys = Object.keys(contract.tokens);

const here = dirname(fileURLToPath(import.meta.url));
const moduleRoot = resolve(here, '..');

const SCHEME_NAMES = [
  'light', 'dark',
  'light_medium_contrast', 'light_high_contrast',
  'dark_medium_contrast', 'dark_high_contrast'
];

// D19 expressive spring literals
const EXPRESSIVE_SPRINGS = {
  'motion.spring_spatial_default': { spring: true, stiffness: 380, damping: 31.19, mass: 1 },
  'motion.spring_spatial_fast': { spring: true, stiffness: 800, damping: 33.94, mass: 1 },
  'motion.spring_spatial_slow': { spring: true, stiffness: 200, damping: 22.63, mass: 1 },
  'motion.spring_effects_default': { spring: true, stiffness: 1600, damping: 80, mass: 1 },
  'motion.spring_effects_fast': { spring: true, stiffness: 3800, damping: 123.29, mass: 1 },
  'motion.spring_effects_slow': { spring: true, stiffness: 800, damping: 56.57, mass: 1 }
};


describe('material template - profile identity', () => {

  it('should export id material-v0_192', () => {
    assert.equal(profile.id, 'material-v0_192');
  });

  it('should export contract_version 5', () => {
    assert.equal(profile.contract_version, 5);
  });

  it('should export reference with Material package versions', () => {
    assert.equal(profile.reference.material_web, '@material/web@2.5.0');
    assert.equal(profile.reference.material_color_utilities, '@material/material-color-utilities@0.4.0');
    assert.equal(profile.reference.token_set_version, 'v0_192');
  });

  it('should export reference with Compose motion tokens source', () => {
    assert.ok(profile.reference.compose_material3_motion_tokens);
  });

  it('should have six schemes', () => {
    for (const name of SCHEME_NAMES) {
      assert.ok(profile.schemes[name], 'missing scheme ' + name);
    }
  });

});


describe('material template - scheme polarity', () => {

  it('should have light polarity for light', () => {
    assert.equal(profile.schemes.light.polarity, 'light');
  });

  it('should have dark polarity for dark', () => {
    assert.equal(profile.schemes.dark.polarity, 'dark');
  });

  it('should have light polarity for light_medium_contrast', () => {
    assert.equal(profile.schemes.light_medium_contrast.polarity, 'light');
  });

  it('should have light polarity for light_high_contrast', () => {
    assert.equal(profile.schemes.light_high_contrast.polarity, 'light');
  });

  it('should have dark polarity for dark_medium_contrast', () => {
    assert.equal(profile.schemes.dark_medium_contrast.polarity, 'dark');
  });

  it('should have dark polarity for dark_high_contrast', () => {
    assert.equal(profile.schemes.dark_high_contrast.polarity, 'dark');
  });

});


describe('material template - key count', () => {

  for (const schemeName of SCHEME_NAMES) {

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


describe('material template - contract validity', () => {

  for (const schemeName of SCHEME_NAMES) {

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


describe('material template - parity oracle', () => {

  it('should match oracle primary for light', () => {
    assert.equal(profile.schemes.light.tokens['color.interactive'],
      oracle.light.primary);
  });

  it('should match oracle on_primary for light', () => {
    assert.equal(profile.schemes.light.tokens['color.text_on_color'],
      oracle.light.on_primary);
  });

  it('should match oracle surface for light', () => {
    assert.equal(profile.schemes.light.tokens['color.background'],
      oracle.light.surface);
  });

  it('should match oracle on_surface for light', () => {
    assert.equal(profile.schemes.light.tokens['color.text_primary'],
      oracle.light.on_surface);
  });

  it('should match oracle error for light', () => {
    assert.equal(profile.schemes.light.tokens['color.support_error'],
      oracle.light.error);
  });

  it('should match oracle primary for dark', () => {
    assert.equal(profile.schemes.dark.tokens['color.interactive'],
      oracle.dark.primary);
  });

  it('should match oracle body_medium type set for light', () => {
    const body01 = profile.schemes.light.tokens['type.body01'];
    assert.equal(body01.font_size, oracle.light.body_medium.size);
    assert.equal(body01.weight, oracle.light.body_medium.weight);
    assert.equal(body01.line_height_px, oracle.light.body_medium.line_height);
    assert.equal(body01.letter_spacing, oracle.light.body_medium.tracking);
  });

  it('should match oracle shape medium 12', () => {
    assert.equal(profile.schemes.light.tokens['shape.radius_12'],
      oracle.light.shape_medium);
  });

  it('should match oracle elevation level 1 two layers', () => {
    const shadow = profile.schemes.light.tokens['shadow.level_01'];
    assert.equal(shadow.shadow, true);
    assert.equal(shadow.layers.length, oracle.light.elevation_level1.layers);
    assert.equal(shadow.layers[0].y, oracle.light.elevation_level1.y1);
    assert.equal(shadow.layers[0].blur, oracle.light.elevation_level1.blur1);
    assert.equal(shadow.layers[1].y, oracle.light.elevation_level1.y2);
    assert.equal(shadow.layers[1].blur, oracle.light.elevation_level1.blur2);
    assert.equal(shadow.layers[1].spread, oracle.light.elevation_level1.spread2);
  });

});


describe('material template - expressive springs (D19)', () => {

  for (const [springKey, expected] of Object.entries(EXPRESSIVE_SPRINGS)) {

    it('should deepEqual ' + springKey + ' to D19 expressive literal', () => {
      assert.deepEqual(
        profile.schemes.light.tokens[springKey],
        expected
      );
    });

  }

});


describe('material template - unit gate', () => {

  for (const schemeName of SCHEME_NAMES) {

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


describe('material template - from_default correctness', () => {

  for (const schemeName of SCHEME_NAMES) {

    it('should have non-empty from_default in ' + schemeName, () => {
      assert.ok(profile.schemes[schemeName].from_default.length,
        schemeName + ' from_default is empty');
    });

    it('should have every from_default key deepEqual the default value in ' + schemeName, () => {
      // The generator completes each scheme from the default scheme of the same polarity
      const fromDefault = profile.schemes[schemeName].from_default;
      const defaultScheme = defaultProfile.schemes[profile.schemes[schemeName].polarity];
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

    it('should inherit all five stacking tokens from the default template in ' + schemeName, () => {
      const fromDefault = profile.schemes[schemeName].from_default;
      for (const key of ['stacking.dropdown', 'stacking.modal', 'stacking.header', 'stacking.overlay', 'stacking.floating']) {
        assert.ok(fromDefault.includes(key),
          schemeName + ' missing stacking provenance ' + key);
      }
    });

  }

});


describe('material template - mapping', () => {

  // Roles one Superloom key may take from two Material roles, because Material
  // derives them equal in every scheme (background and surface); every other key
  // is answered by exactly one role, so the generator never lets the last of
  // several roles win (on-background and on-surface differ in the contrast schemes)
  const EQUAL_BY_DEFINITION = {
    'color.background': ['background', 'surface']
  };

  it('should answer every Superloom key from one Material role, or from roles Material defines equal', () => {
    const writers = {};
    for (const [group, table] of Object.entries(mapping)) {
      if (!Lib.Utils.isObject(table) || Array.isArray(table)) {
        continue;
      }
      for (const [role, target] of Object.entries(table)) {
        for (const key of [].concat(target)) {
          writers[key] = (writers[key] || []).concat(group === 'color' ? role : group + '.' + role);
        }
      }
    }
    const shared = {};
    for (const [key, roles] of Object.entries(writers)) {
      if (roles.length > 1) {
        shared[key] = roles;
      }
    }
    assert.deepEqual(shared, EQUAL_BY_DEFINITION);
  });

});


describe('material template - role audit', () => {

  // The engine's role rules: every content role reads on its surface, roles
  // that mean different things differ, every shadow level is translucent.
  // Caught here, at the template, before any component draws the value.
  for (const schemeName of SCHEME_NAMES) {

    it('should pass the engine role audit for ' + schemeName + ' on native, apart from its listed reference exceptions', () => {
      const built = Themer.buildTheme(profile.schemes[schemeName], [], 'native');
      const result = Themer.auditRoles(built);
      const listed = AUDIT_EXCEPTIONS.filter(function (entry) {
        return entry.scheme === schemeName;
      });
      const matches = function (entry, finding) {
        return entry.rule === finding.rule && entry.tokens.join() === finding.tokens.join();
      };
      assert.deepEqual(result.findings.filter(function (finding) {
        return !listed.some(function (entry) {
          return matches(entry, finding);
        });
      }), [], 'role audit findings for ' + schemeName);
      // A listed exception that no longer reproduces is stale
      for (const entry of listed) {
        assert.ok(result.findings.some(function (finding) {
          return matches(entry, finding);
        }), 'stale audit exception ' + entry.tokens.join(' on ') + ' in ' + schemeName + '; remove it');
      }
    });

  }

});


describe('material template - engine build', () => {

  it('should build light on native and emit shadow.level_01 as two-layer boxShadow', () => {
    const built = Themer.buildTheme(profile.schemes.light, [], 'native');
    const shadow = built.tokens['shadow.level_01'];
    assert.ok(shadow);
    // Native emission: { boxShadow: "layer1, layer2" }
    assert.ok(shadow.boxShadow, 'shadow.level_01 should have boxShadow property');
    // Layers are comma-separated; a layer's rgba() color carries commas of its own
    const parts = shadow.boxShadow.split(/,(?![^(]*\))/).map(function (s) { return s.trim(); });
    assert.equal(parts.length, 2, 'shadow.level_01 should have exactly 2 layers');
  });

  it('should build light on native and emit body01 type set', () => {
    const built = Themer.buildTheme(profile.schemes.light, [], 'native');
    const body01 = built.tokens['type.body01'];
    assert.deepEqual(body01, {
      fontSize: 14,
      lineHeight: 20,
      letterSpacing: 0.25,
      fontWeight: '400',
      fontFamily: 'sans'
    });
  });

  it('should build light with a brand layer overriding radius_04', () => {
    const built = Themer.buildTheme(
      profile.schemes.light,
      [{ name: 'brand', tokens: { 'shape.radius_04': 8 } }],
      'native'
    );
    assert.equal(built.tokens['shape.radius_04'], 8);
    assert.equal(built.tokens['color.interactive'],
      profile.schemes.light.tokens['color.interactive']);
  });

});

describe('material template - feedback field', () => {

  it('should have feedback.field = outline', () => {
    const built = Themer.buildTheme(profile.schemes.light, [], 'native');
    assert.equal(built.tokens['feedback.field'], 'outline');
  });

});


describe('material template - regeneration test', () => {

  it('should produce byte-identical files when run into a temp directory', () => {

    const tmpDir = resolve(here, 'fixtures', 'tmp-regen');
    rmSync(tmpDir, { recursive: true, force: true });
    mkdirSync(tmpDir, { recursive: true });

    execSync('node ' + resolve(moduleRoot, 'scripts', 'generate.js') + ' ' + tmpDir, {
      cwd: moduleRoot,
      stdio: 'pipe'
    });

    for (const scheme of SCHEME_NAMES) {
      const generated = readFileSync(resolve(tmpDir, scheme + '.js'), 'utf8');
      const committed = readFileSync(resolve(moduleRoot, 'data', scheme + '.js'), 'utf8');
      assert.equal(generated, committed, scheme + '.js differs from regenerated output');
    }

    rmSync(tmpDir, { recursive: true, force: true });

  });

});


describe('material template - generation provenance', () => {

  it('should declare provenance with default template version, shasum, and schema in every scheme', () => {
    for (const name of SCHEME_NAMES) {
      const p = profile.schemes[name].provenance;
      assert.ok(p, name + ' missing provenance');
      assert.equal(p.default_version, '1.0.0', name + ' default_version');
      assert.ok(p.default_shasum, name + ' missing default_shasum');
      assert.equal(p.generator_schema, 'v3', name + ' generator_schema');
    }
  });

  it('should have identical provenance across all six schemes', () => {
    const ref = JSON.stringify(profile.schemes.light.provenance);
    for (const name of SCHEME_NAMES) {
      assert.equal(
        JSON.stringify(profile.schemes[name].provenance),
        ref,
        name + ' provenance differs from light'
      );
    }
  });

  it('should have default shasum matching the registry default shasum', () => {
    const registryShasum = execSync(
      'npm view @superloomdev/js-client-helper-themer-template-default@1.0.0 dist.shasum',
      { encoding: 'utf8', stdio: 'pipe' }
    ).trim();
    for (const name of SCHEME_NAMES) {
      assert.equal(
        profile.schemes[name].provenance.default_shasum,
        registryShasum,
        name + ' default_shasum does not match registry'
      );
    }
  });

});


describe('material template - anatomy enums (v4)', () => {

  const ANATOMY = {
    'anatomy.label': 'floating',
    'anatomy.switch_handle': 'grows',
    'anatomy.status_marker': 'plain',
    'anatomy.dialog_actions': 'trailing',
    'anatomy.slider_handle': 'bar',
    'anatomy.button_label': 'center'
  };

  for (const schemeName of SCHEME_NAMES) {

    it('should hold Material\'s shape choice for every anatomy enum in ' + schemeName, () => {
      const tokens = profile.schemes[schemeName].tokens;
      const actual = {};
      for (const name of Object.keys(ANATOMY)) {
        actual[name] = tokens[name];
      }
      assert.deepEqual(actual, ANATOMY);
      for (const name of Object.keys(ANATOMY)) {
        assert.equal(profile.schemes[schemeName].from_default.indexOf(name), -1, name + ' was completed from the default template');
      }
    });

  }

});


describe('material template - icon literals (v4)', () => {

  const iconKeys = contractKeys.filter(function (name) {
    return contract.tokens[name].group === 'icon';
  });
  const iconMap = JSON.parse(readFileSync(resolve(moduleRoot, 'scripts', 'icon-map.json'), 'utf8'));
  const iconPkg = JSON.parse(readFileSync(resolve(moduleRoot, 'node_modules', '@material-symbols', 'svg-400', 'package.json'), 'utf8'));

  // The select's indicator is the select's own drawing (a 24px box), not a Symbols glyph
  const DRAWINGS = {
    'icon.dropdown_indicator': { icon: true, viewBox: '0 0 24 24', paths: [{ d: 'M7 9.5 12 14.5 17 9.5Z' }] },
    'icon.checked_indicator': { icon: true, viewBox: '2 2 14 14', paths: [{ d: 'M7 14 8.414 12.586 4.414 8.586 3 10Z M7 14 15 6 13.586 4.586 5.586 12.586Z' }] },
    'icon.mixed_indicator': { icon: true, viewBox: '2 2 14 14', paths: [{ d: 'M4 8h10v2H4Z' }] }
  };

  it('should carry 82 icon literals, every one valid, none completed from the default template', () => {
    assert.equal(iconKeys.length, 82);
    for (const schemeName of SCHEME_NAMES) {
      const scheme = profile.schemes[schemeName];
      const subset = {};
      for (const name of iconKeys) {
        if (DRAWINGS[name] !== undefined) {
          assert.deepEqual(scheme.tokens[name], DRAWINGS[name], schemeName + ' ' + name);
          subset[name] = scheme.tokens[name];
          continue;
        }
        assert.equal(scheme.tokens[name].icon, true, schemeName + ' ' + name + ' lacks the icon marker');
        assert.equal(scheme.tokens[name].viewBox, '0 -960 960 960', schemeName + ' ' + name + ' viewBox');
        assert.equal(scheme.tokens[name].paths.length, 1, schemeName + ' ' + name + ' has one path');
        assert.equal(scheme.tokens[name].sizes, undefined, schemeName + ' ' + name + ' has no size variants');
        assert.equal(scheme.from_default.indexOf(name), -1, name + ' was completed from the default template');
        subset[name] = scheme.tokens[name];
      }
      assert.deepEqual(Themer.validateContract({ tokens: subset }, { required: iconKeys }).errors, []);
    }
  });

  it('should draw a different glyph from the default template for every icon', () => {
    for (const name of iconKeys) {
      assert.notDeepEqual(profile.schemes.light.tokens[name], defaultProfile.schemes.light.tokens[name], name);
    }
  });

  it('should record icon provenance that matches the pinned package and the mapping snapshot', () => {
    assert.equal(iconPkg.version, '0.47.4');
    for (const schemeName of SCHEME_NAMES) {
      assert.deepEqual(profile.schemes[schemeName].provenance.icons, {
        package: '@material-symbols/svg-400',
        version: iconPkg.version,
        style: 'outlined',
        map_source: iconMap.source,
        map_sha256: iconMap.source_sha256,
        drawings: {
          dropdown_indicator: '@material/web 2.5.0 select/internal/select.js renderTrailingIcon',
          checked_indicator: '@material/web 2.5.0 checkbox/internal/_checkbox.scss .checked .mark',
          mixed_indicator: '@material/web 2.5.0 checkbox/internal/_checkbox.scss .indeterminate .mark'
        }
      });
    }
    assert.deepEqual(Object.keys(iconMap.icons).map(function (name) { return 'icon.' + name; }), iconKeys);
  });

});


describe('material template - explicit type roles', () => {

  const EXPLICIT_ROLES = [
    'type.body02', 'type.body01', 'type.caption01',
    'type.display01', 'type.display02', 'type.display03',
    'type.heading05', 'type.heading04', 'type.heading03',
    'type.heading02', 'type.heading01', 'type.heading_compact_01',
    'type.label01', 'type.label02', 'type.legal01'
  ];

  for (const role of EXPLICIT_ROLES) {

    it('should have explicit font_size and line_height_px for ' + role, () => {
      const ts = profile.schemes.light.tokens[role];
      assert.ok(ts.font_size, role + ' missing font_size');
      assert.ok(ts.line_height_px, role + ' missing line_height_px');
      assert.equal(ts.scale, undefined, role + ' should not have scale');
      assert.equal(ts.step, undefined, role + ' should not have step');
    });

  }

  it('should have caption02 deepEqual to corrected default value (14px/18px)', () => {
    assert.deepEqual(
      profile.schemes.light.tokens['type.caption02'],
      defaultProfile.schemes.light.tokens['type.caption02']
    );
    assert.equal(profile.schemes.light.tokens['type.caption02'].font_size, 14);
    assert.equal(profile.schemes.light.tokens['type.caption02'].line_height_px, 18);
  });

  it('should have no type set with line_height_px below font_size', () => {
    for (const name of SCHEME_NAMES) {
      const tokens = profile.schemes[name].tokens;
      for (const key of Object.keys(tokens)) {
        if (key.startsWith('type.') && tokens[key] && tokens[key].type_set) {
          const ts = tokens[key];
          if (ts.font_size && ts.line_height_px) {
            assert.ok(
              ts.line_height_px >= ts.font_size,
              name + ' ' + key + ' line_height_px ' + ts.line_height_px +
                ' < font_size ' + ts.font_size
            );
          }
        }
      }
    }
  });

});


describe('material template - every scheme resolves every token', () => {

  const HEX = /^#[0-9a-f]{6}$/;

  for (const schemeName of Object.keys(profile.schemes)) {

    it('should carry an eleven-step neutral ramp of lowercase hex colors in ' + schemeName, () => {
      const ramp = profile.schemes[schemeName].ramp;
      assert.equal(ramp.length, 11);
      for (const step of ramp) {
        assert.match(step, HEX);
      }
      assert.equal(new Set(ramp).size, 11, 'ramp steps are distinct');
    });

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


describe('material template - v5 control roles and role colors', () => {

  const light = profile.schemes.light.tokens;

  it('should state the geometry of its own controls, read from the pinned component tokens', () => {
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
      button_height: 40, button_radius: 9999, button_padding_start: 24, button_padding_end: 24, button_icon_size: 18,
      field_height: 56, field_radius: 4, field_icon_size: 24, checkbox_size: 18, checkbox_border: 2, option_height: 48
    });
    for (const schemeName of SCHEME_NAMES) {
      for (const key of Object.keys(profile.schemes[schemeName].tokens).filter((name) => name.indexOf('control.') === 0)) {
        assert.equal(profile.schemes[schemeName].from_default.includes(key), false, schemeName + ' completed ' + key);
      }
    }
  });

  it('should draw the button label in label-large and the raised field label in body-small', () => {
    assert.deepEqual(light['type.button_label'], light['type.label01']);
    assert.deepEqual(light['type.field_label_raised'], light['type.caption01']);
    assert.equal(light['type.button_label'].font_size, 14);
    assert.equal(light['type.field_label_raised'].font_size, 12);
  });

  it('should fill the primary button, the link and the checked control with primary, and put inverse icons on the inverse surface', () => {
    assert.equal(light['color.button_primary'], light['color.interactive']);
    assert.equal(light['color.button_primary_hover'], light['color.interactive']);
    assert.equal(light['color.link_primary'], light['color.interactive']);
    assert.equal(light['color.control_checked'], light['color.interactive']);
    assert.equal(light['color.icon_on_color'], light['color.text_on_color']);
    assert.equal(light['color.icon_inverse'], light['color.text_inverse']);
    assert.notEqual(light['color.icon_inverse'], light['color.icon_primary']);
    assert.equal(light['color.icon_primary'], light['color.text_primary']);
    assert.equal(light['color.focus'], light['color.button_secondary']);
    assert.notEqual(light['color.focus'], defaultProfile.schemes.light.tokens['color.focus']);
  });

  it('should fill tonal and elevated buttons from the secondary container and the low surface container', () => {
    assert.equal(light['color.button_tonal'], light['color.button_secondary_hover']);
    assert.equal(light['color.button_tonal_hover'], light['color.button_tonal']);
    assert.notEqual(light['color.text_on_button_tonal'], light['color.text_on_color']);
    assert.equal(light['color.button_elevated'], light['color.layer_01']);
  });

});


describe('material template - role grid (v5 amendment)', () => {

  const cells = Object.keys(contract.grid).flatMap(function (group) {
    return contract.grid[group].map(function (cell) {
      return group + '.' + cell;
    });
  });

  for (const schemeName of SCHEME_NAMES) {

    it('should answer every grid cell from Material\'s own component tokens in ' + schemeName + ', none completed from the default', () => {
      const scheme = profile.schemes[schemeName];
      for (const name of cells) {
        assert.notEqual(scheme.tokens[name], undefined, name);
        assert.equal(scheme.from_default.includes(name), false, name + ' completed from the default');
      }
    });

  }

  it('should draw Material\'s field, button and checkbox states', () => {
    const built = Themer.buildTheme(profile.schemes.light, [], 'native').tokens;
    // Field: outline turns on-surface on hover, primary and 2px on focus; disabled at 12% and 38%
    assert.equal(built['color.field_outline_hover'], built['color.text_primary']);
    assert.equal(built['control.field_outline_width_focus'], 3);
    assert.match(built['color.field_outline_disabled'], /^rgba\(.*, 0\.12\)$/);
    assert.match(built['color.field_label_disabled'], /^rgba\(.*, 0\.38\)$/);
    assert.equal(built['control.field_icon_inset'], 12);
    assert.equal(built['type.field_value'].fontSize, 16);
    // Button: no state layer on focus, a ring 3px wide 2px outside on keyboard focus, hover elevation
    assert.equal(built['color.button_primary_container_focus'], built['color.button_primary_container']);
    assert.equal(built['control.button_focus_width'], 3);
    assert.equal(built['control.button_focus_offset'], 2);
    assert.equal(built['feedback.focus_trigger'], 'keyboard');
    assert.equal(built['shadow.button_primary_hover'].boxShadow, built['shadow.level_01'].boxShadow);
    assert.equal(built['control.button_ghost_padding_start'], 12);
    assert.equal(built['control.button_min_width'], 64);
    // Checkbox: a 44px ring around an 18px box, state layers per selection
    assert.equal(built['control.selection_focus_offset'], 13);
    // A pressed layer keeps the hover layer under it: 8% then 12%, 19% together
    assert.match(built['color.selection_layer_active'], /^rgba\(.*, 0\.19\)$/);
  });

});


describe('material template - brand reach into the role grid', () => {

  it('should carry a brand layer on a mapped key into every cell drawn in that role', () => {
    const layer = { tokens: { 'color.interactive': '#c2410c', 'color.focus': '#123456' } };
    const built = Themer.buildTheme(profile.schemes.light, [layer], 'native').tokens;
    assert.equal(built['color.button_primary_container'], '#c2410c');
    assert.equal(built['color.field_outline_focus'], '#c2410c');
    assert.equal(built['color.selection_container'], '#c2410c');
    assert.equal(built['color.button_focus_ring'], '#123456');
    assert.equal(built['color.selection_focus_ring'], '#123456');
    // Derived cells follow too: the translucent hover of an outlined button is the key at the layer's opacity
    assert.equal(built['color.button_tertiary_container_hover'], 'rgba(194, 65, 12, 0.08)');
  });

});

