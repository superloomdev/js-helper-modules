// Info: Variant tests for contract v9.
//
// Proves the adaptive cascade: a template's named token-pin bundles apply
// after the base and before the caller's layers, selected by the `variant`
// option and switched off by `adaptive: 'fixed'`, with each malformed
// declaration and selection failing by name. The published templates'
// round-trip lives in each template's own suite, where the package under
// test is the local build.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import loader from './loader.js';
import themerLoader from 'helper-themer';

const { Lib } = loader();
const Themer = themerLoader(Lib, {});


// A template with a form and a platform variant sharing one cell, so the
// cascade order is measurable, plus a leveled alias the pins can move
function variantTemplate () {
  return {
    tokens: {
      'color.background': '#ffffff',
      'color.field_01': '#f4f4f4',
      'color.field_02': '#e0e0e0',
      'color.field_03': '#c6c6c6',
      'color.f': '{color.field_01}',
      'control.notification_inline_width': 736,
      'anatomy.toggle_widget': 'drawn'
    },
    variants: {
      'form.compact': {
        tokens: {
          'control.notification_inline_width': 288,
          'color.f': '{color.field_02}'
        }
      },
      'platform.ios': {
        tokens: {
          'control.notification_inline_width': 300,
          'anatomy.toggle_widget': 'system'
        }
      }
    }
  };
}


describe('variants - the cascade', () => {

  it('should move exactly the pinned cells and leave every other token untouched', () => {
    const template = variantTemplate();
    const base = Themer.buildTheme(template, [], 'web');
    const compact = Themer.buildTheme(template, [], 'web', { variant: { form: 'compact' } });
    for (const name of Object.keys(compact.tokens)) {
      if (name === 'control.notification_inline_width' || name === 'color.f') {
        continue;
      }
      assert.deepEqual(compact.tokens[name], base.tokens[name], name + ' moved');
    }
    assert.equal(compact.tokens['control.notification_inline_width'], 288);
    assert.equal(compact.tokens['color.f'], '#e0e0e0');
  });

  it('should apply the platform variant after the form variant', () => {
    const theme = Themer.buildTheme(variantTemplate(), [], 'web', { variant: { form: 'compact', platform: 'ios' } });
    assert.equal(theme.tokens['control.notification_inline_width'], 300);
    assert.equal(theme.tokens['anatomy.toggle_widget'], 'system');
  });

  it('should let a brand layer pin survive both variants', () => {
    const theme = Themer.buildTheme(variantTemplate(),
      [{ name: 'brand', tokens: { 'control.notification_inline_width': 640, 'anatomy.toggle_widget': 'drawn' } }],
      'web', { variant: { form: 'compact', platform: 'ios' } });
    assert.equal(theme.tokens['control.notification_inline_width'], 640);
    assert.equal(theme.tokens['anatomy.toggle_widget'], 'drawn');
  });

  it('should ignore the variants under adaptive fixed', () => {
    const template = variantTemplate();
    const base = Themer.buildTheme(template, [], 'web');
    const fixed = Themer.buildTheme(template, [], 'web', { variant: { form: 'compact', platform: 'ios' }, adaptive: 'fixed' });
    assert.deepEqual(fixed.tokens, base.tokens);
  });

  it('should read a variant pin on a leveled source the same as the same pin as a layer', () => {
    const template = variantTemplate();
    const viaVariant = Themer.buildTheme(template, [], 'web', { variant: { form: 'compact' } });
    const viaLayer = Themer.buildTheme(template,
      [{ name: 'brand', tokens: { 'color.f': '{color.field_02}' } }], 'web');
    assert.equal(viaVariant.tokens['color.f'], '#e0e0e0');
    assert.deepEqual(viaVariant.levels[2]['color.f'], viaLayer.levels[2]['color.f']);
    assert.deepEqual(viaVariant.levels[3]['color.f'], viaLayer.levels[3]['color.f']);
  });

  it('should drop an undeclared variant and apply the declared half', () => {
    const template = variantTemplate();
    delete template.variants['platform.ios'];
    const theme = Themer.buildTheme(template, [], 'web', { variant: { form: 'compact', platform: 'ios' } });
    assert.equal(theme.tokens['control.notification_inline_width'], 288);
    assert.equal(theme.tokens['anatomy.toggle_widget'], 'drawn');
  });

  it('should leave the cascade untouched when no selection is given', () => {
    const template = variantTemplate();
    const base = Themer.buildTheme(template, [], 'web');
    const auto = Themer.buildTheme(template, [], 'web', { adaptive: 'auto' });
    assert.deepEqual(auto.tokens, base.tokens);
  });

});


describe('variants - declaration rejections', () => {

  it('should reject a variants section that is not a plain object', () => {
    assert.throws(function () {
      Themer.resolve({ tokens: {}, variants: 7 }, []);
    }, /TypeError: \[helper-themer\] template\.variants must be a plain object$/);
    assert.throws(function () {
      Themer.resolve({ tokens: {}, variants: [] }, []);
    }, /TypeError: \[helper-themer\] template\.variants must be a plain object$/);
  });

  it('should reject an unknown variant key', () => {
    assert.throws(function () {
      Themer.resolve({ tokens: {}, variants: { 'density.small': { tokens: {} } } }, []);
    }, /TypeError: \[helper-themer\] template\.variants\.density\.small must be one of: form\.compact, form\.medium, form\.expanded, platform\.web, platform\.ios, platform\.android, platform\.macos, platform\.windows$/);
  });

  it('should reject a variant entry that is not a plain object', () => {
    assert.throws(function () {
      Themer.resolve({ tokens: {}, variants: { 'form.compact': 'compact' } }, []);
    }, /TypeError: \[helper-themer\] template\.variants\.form\.compact must be a plain object$/);
  });

  it('should reject a variant entry carrying more than tokens', () => {
    assert.throws(function () {
      Themer.resolve({ tokens: {}, variants: { 'form.compact': { tokens: {}, weight: 9 } } }, []);
    }, /TypeError: \[helper-themer\] template\.variants\.form\.compact\.weight must carry only a tokens object$/);
  });

  it('should reject a variant entry whose tokens is not a plain object', () => {
    assert.throws(function () {
      Themer.resolve({ tokens: {}, variants: { 'form.compact': { tokens: [] } } }, []);
    }, /TypeError: \[helper-themer\] template\.variants\.form\.compact\.tokens must be a plain object$/);
  });

  it('should carry exactly the pins a layer pin carries', () => {
    // Variant pins move through the same effective-layer path as caller
    // layers: resolve validates the variant's structure, and pin values get
    // the same treatment a layer's do (none - a template's own tokens are
    // the ones the contract audit holds)
    const template = variantTemplate();
    const viaVariant = Themer.buildTheme(template, [], 'web', { variant: { form: 'compact' } });
    const viaLayer = Themer.buildTheme(template,
      [{ name: 'variant-equivalent', tokens: template.variants['form.compact'].tokens }], 'web');
    assert.equal(viaVariant.tokens['control.notification_inline_width'],
      viaLayer.tokens['control.notification_inline_width']);
    assert.equal(viaVariant.tokens['color.f'], viaLayer.tokens['color.f']);
  });

});


describe('variants - selection rejections', () => {

  const template = { tokens: {} };

  it('should reject a variant selection that is not a plain object', () => {
    assert.throws(function () {
      Themer.resolve(template, [], { variant: 'compact' });
    }, /TypeError: \[helper-themer\] options\.variant must be a plain object$/);
  });

  it('should reject an unknown form selection', () => {
    assert.throws(function () {
      Themer.resolve(template, [], { variant: { form: 'xxl' } });
    }, /TypeError: \[helper-themer\] options\.variant\.form must be a form of: compact, medium, expanded or a platform of: web, ios, android, macos, windows$/);
  });

  it('should reject an unknown platform selection', () => {
    assert.throws(function () {
      Themer.resolve(template, [], { variant: { platform: 'haiku' } });
    }, /TypeError: \[helper-themer\] options\.variant\.platform must be a form of: compact, medium, expanded or a platform of: web, ios, android, macos, windows$/);
  });

  it('should reject an unknown selection key', () => {
    assert.throws(function () {
      Themer.resolve(template, [], { variant: { density: 'small' } });
    }, /TypeError: \[helper-themer\] options\.variant\.density must be a form of: compact, medium, expanded or a platform of: web, ios, android, macos, windows$/);
  });

  it('should reject an unknown adaptive mode', () => {
    assert.throws(function () {
      Themer.resolve(template, [], { adaptive: 'live' });
    }, /TypeError: \[helper-themer\] options\.adaptive must be one of: auto, fixed$/);
  });

  it('should still reject an unknown top-level option', () => {
    assert.throws(function () {
      Themer.resolve(template, [], { shadow_mode: 'flat' });
    }, /TypeError: \[helper-themer\] options\.shadow_mode must be one of: contrast, min_contrast_ratio, motion_factor, variant, adaptive$/);
  });

});
