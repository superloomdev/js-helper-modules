// Tests for js-client-helper-styler
// Covers all exported functions with automated assertions
'use strict';

const assert = require('node:assert/strict');
const { describe, it } = require('node:test');

// Load dependencies via loader (DI pattern)
const loader = require('./loader');
const { Lib } = loader();
const Styler = Lib.Styler;



// ============================================================================
// 1. COLOR DERIVATION
// ============================================================================

describe('deriveColor', function () {

  it('should return empty object when inputs are empty', function () {
    const result = Styler.deriveColor({}, {});
    assert.deepStrictEqual(result, {});
  });

  it('should copy value when swatch rule uses ref', function () {
    const template = {
      defaults: { primary: '#FF0000' },
      swatches: { APP_PRIMARY: { ref: 'primary' } }
    };
    const result = Styler.deriveColor(template, {});
    assert.strictEqual(result.APP_PRIMARY, '#FF0000');
  });

  it('should mix colors when swatch rule uses operation', function () {
    const template = {
      defaults: { primary: '#FF0000', bg: '#FFFFFF' },
      swatches: { MIXED: { operation: 'mix', args: ['primary', 'bg', 50] } }
    };
    const result = Styler.deriveColor(template, {});
    assert.ok(result.MIXED.startsWith('#'));
  });

  it('should apply overrides from color_values', function () {
    const template = {
      defaults: { primary: '#FF0000' },
      swatches: { APP_PRIMARY: { ref: 'primary' } }
    };
    const result = Styler.deriveColor(template, { overrides: { APP_PRIMARY: '#00FF00' } });
    assert.strictEqual(result.APP_PRIMARY, '#00FF00');
  });

});


// ============================================================================
// 2. DIMENSION DERIVATION
// ============================================================================

describe('deriveDimension', function () {

  it('should return empty object when inputs are empty', function () {
    const result = Styler.deriveDimension({}, {});
    assert.deepStrictEqual(result, {});
  });

  it('should build modular scale from base and ratio', function () {
    const template = {
      defaults: { baseSize: 16, ratio: 1.25 },
      scales: {
        fontSize: { type: 'modular', base: 'baseSize', ratio: 'ratio', steps: { sm: -1, md: 0, lg: 1 } }
      },
      constants: []
    };
    const result = Styler.deriveDimension(template, {});
    assert.ok(result.fontSize.sm < result.fontSize.md);
    assert.ok(result.fontSize.md < result.fontSize.lg);
  });

  it('should build linear scale from unit', function () {
    const template = {
      defaults: { unit: 8 },
      scales: {
        space: { type: 'linear', unit: 'unit', steps: { xs: 1, sm: 2, md: 3 } }
      },
      constants: []
    };
    const result = Styler.deriveDimension(template, {});
    assert.strictEqual(result.space.xs, 8);
    assert.strictEqual(result.space.sm, 16);
    assert.strictEqual(result.space.md, 24);
  });

  it('should throw error for unknown scale type', function () {
    const template = {
      defaults: {},
      scales: { bad: { type: 'unknown' } },
      constants: []
    };
    assert.throws(function () {
      Styler.deriveDimension(template, {});
    });
  });

});


// ============================================================================
// 3. FONT DERIVATION
// ============================================================================

describe('deriveFont', function () {

  it('should return family with System fallback', function () {
    const template = {
      defaults: {},
      roles: ['primary']
    };
    const result = Styler.deriveFont(template, {});
    assert.strictEqual(result.family.primary, 'System');
  });

  it('should resolve primary family from values', function () {
    const template = {
      defaults: {},
      roles: ['primary']
    };
    const result = Styler.deriveFont(template, { primaryFamily: 'Inter' });
    assert.strictEqual(result.family.primary, 'Inter');
  });

  it('should chain family fallback to previous role', function () {
    const template = {
      defaults: {},
      roles: ['primary', 'secondary']
    };
    const result = Styler.deriveFont(template, { primaryFamily: 'Inter' });
    assert.strictEqual(result.family.primary, 'Inter');
    assert.strictEqual(result.family.secondary, 'Inter');
  });

  it('should build weight fallback chain', function () {
    const template = {
      defaults: { weight: { regular: '400', bold: '700' } },
      roles: ['primary']
    };
    const result = Styler.deriveFont(template, {});
    assert.strictEqual(result.weight.regular, '400');
    assert.strictEqual(result.weight.bold, '700');
    assert.strictEqual(result.weight.medium, '400');
  });

});


// ============================================================================
// 4. THEME EXTENSION
// ============================================================================

describe('extend', function () {

  it('should return empty object when both inputs empty', function () {
    const result = Styler.extend({}, {});
    assert.deepStrictEqual(result, { color: {}, dimension: {}, font: {} });
  });

  it('should merge base values when variant empty', function () {
    const base = { color: { primary: '#FF0000' } };
    const result = Styler.extend(base, {});
    assert.strictEqual(result.color.primary, '#FF0000');
  });

  it('should variant values override base', function () {
    const base = { color: { primary: '#FF0000', secondary: '#00FF00' } };
    const variant = { color: { primary: '#0000FF' } };
    const result = Styler.extend(base, variant);
    assert.strictEqual(result.color.primary, '#0000FF');
    assert.strictEqual(result.color.secondary, '#00FF00');
  });

  it('should merge all three groups', function () {
    const base = {
      color: { primary: '#FF0000' },
      dimension: { baseSize: 16 },
      font: { primaryFamily: 'Inter' }
    };
    const variant = { color: { primary: '#00FF00' } };
    const result = Styler.extend(base, variant);
    assert.strictEqual(result.color.primary, '#00FF00');
    assert.strictEqual(result.dimension.baseSize, 16);
    assert.strictEqual(result.font.primaryFamily, 'Inter');
  });

});


// ============================================================================
// 5. THEME DERIVATION
// ============================================================================

describe('derive', function () {

  it('should derive complete theme from template and values', function () {
    const template = Styler.defaultTemplate;
    const values = {
      color: { primary: '#0D9488', bg: '#FFFFFF' },
      dimension: { baseSize: 16, unit: 8, ratio: 1.25 },
      font: { primaryFamily: 'Inter' }
    };
    const result = Styler.derive(template, values);
    assert.ok(result.Color.APP_PRIMARY);
    assert.ok(result.Dimension.fontSize);
    assert.ok(result.Font.family.primary);
  });

});


// ============================================================================
// 6. THEME ASSEMBLY
// ============================================================================

describe('assemble', function () {

  it('should assemble theme from base and variant', function () {
    const template = Styler.defaultTemplate;
    const base = {
      color: { primary: '#0D9488', bg: '#FFFFFF' },
      dimension: { baseSize: 16, unit: 8, ratio: 1.25 },
      font: { primaryFamily: 'Inter' }
    };
    const variant = { color: { primary: '#FF0000' } };
    const result = Styler.assemble(template, base, variant);
    assert.strictEqual(result.Color.APP_PRIMARY, '#FF0000');
    assert.ok(result.Color.TEXT_ON_PRIMARY);
    assert.ok(result.Dimension.fontSize);
  });

  it('should throw error for malformed template', function () {
    assert.throws(function () {
      Styler.assemble({}, {}, {});
    });
  });

});


// ============================================================================
// 7. UTILITY GENERATION
// ============================================================================

describe('generateUtilities', function () {

  it('should generate font size utilities', function () {
    const template = Styler.defaultTemplate;
    const base = {
      color: { primary: '#0D9488', bg: '#FFFFFF', textPrimary: '#000000' },
      dimension: { baseSize: 16, unit: 8, ratio: 1.25, lineHeightRatio: 1.5 },
      font: { primaryFamily: 'Inter' }
    };
    const theme = Styler.assemble(template, base, {});
    const utilities = Styler.generateUtilities(theme);
    assert.ok(utilities.font_size_md);
    assert.ok(utilities.font_size_sm);
    assert.ok(utilities.p_a_md);
    assert.ok(utilities.p_h_sm);
  });

  it('should generate color utilities', function () {
    const template = Styler.defaultTemplate;
    const base = {
      color: { primary: '#0D9488', bg: '#FFFFFF', textPrimary: '#000000' },
      dimension: { baseSize: 16, unit: 8, ratio: 1.25 },
      font: { primaryFamily: 'Inter' }
    };
    const theme = Styler.assemble(template, base, {});
    const utilities = Styler.generateUtilities(theme);
    assert.ok(utilities.background_app_primary);
    assert.ok(utilities.font_text_primary);
  });

});


// ============================================================================
// 8. DEFAULT TEMPLATE
// ============================================================================

describe('defaultTemplate', function () {

  it('should have color section with swatches', function () {
    assert.ok(Styler.defaultTemplate.color);
    assert.ok(Styler.defaultTemplate.color.swatches);
    assert.ok(Styler.defaultTemplate.color.swatches.APP_PRIMARY);
  });

  it('should have dimension section with scales', function () {
    assert.ok(Styler.defaultTemplate.dimension);
    assert.ok(Styler.defaultTemplate.dimension.scales);
    assert.ok(Styler.defaultTemplate.dimension.scales.fontSize);
  });

  it('should have font section with roles', function () {
    assert.ok(Styler.defaultTemplate.font);
    assert.ok(Styler.defaultTemplate.font.roles);
  });

});
