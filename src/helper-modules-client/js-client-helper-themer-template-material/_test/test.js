// Info: Test suite for js-client-helper-themer-template-material.
//
// Verifies the Material 3 reference template: profile identity, scheme count,
// contract validity, parity oracle values, expressive springs (D19), unit gate,
// regeneration, engine build with two-layer shadows, brand layer, and
// from_base correctness.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import loader from './loader.js';
import themerLoader from 'helper-themer';
import baseProfile from 'helper-themer-template-base';
import profile from 'helper-themer-template-material';
import oracle from './fixtures/parity-oracle.json' with { type: 'json' };

const { Lib } = loader();
const Themer = themerLoader(Lib, {});
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

  it('should export contract_version 2', () => {
    assert.equal(profile.contract_version, 2);
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


describe('material template - from_base correctness', () => {

  for (const schemeName of SCHEME_NAMES) {

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


describe('material template - engine build', () => {

  it('should build light on native and emit shadow.level_01 as two-layer boxShadow', () => {
    const built = Themer.buildTheme(profile.schemes.light, [], 'native');
    const shadow = built.tokens['shadow.level_01'];
    assert.ok(shadow);
    // Native emission: { boxShadow: "layer1, layer2" }
    assert.ok(shadow.boxShadow, 'shadow.level_01 should have boxShadow property');
    const parts = shadow.boxShadow.split(',').map(function (s) { return s.trim(); });
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

  it('should declare provenance with base version, shasum, and schema in every scheme', () => {
    for (const name of SCHEME_NAMES) {
      const p = profile.schemes[name].provenance;
      assert.ok(p, name + ' missing provenance');
      assert.equal(p.base_version, '1.0.0', name + ' base_version');
      assert.ok(p.base_shasum, name + ' missing base_shasum');
      assert.ok(p.generator_schema, name + ' missing generator_schema');
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

  it('should have base shasum matching the registry base shasum', () => {
    const registryShasum = execSync(
      'npm view @superloomdev/js-client-helper-themer-template-base@1.0.0 dist.shasum',
      { encoding: 'utf8', stdio: 'pipe' }
    ).trim();
    for (const name of SCHEME_NAMES) {
      assert.equal(
        profile.schemes[name].provenance.base_shasum,
        registryShasum,
        name + ' base_shasum does not match registry'
      );
    }
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

  it('should have caption02 deepEqual to corrected base value (14px/18px)', () => {
    assert.deepEqual(
      profile.schemes.light.tokens['type.caption02'],
      baseProfile.schemes.light.tokens['type.caption02']
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
