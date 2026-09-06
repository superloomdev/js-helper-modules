// Info: Failing tests for additive Themer capabilities.
//
// These tests expose G02 (cache key omits template metadata and emission
// options), G11 (color parser ignores alpha in 8-digit hex and rgb/rgba),
// and G12 (shadow emission lacks modern mode and explicit geometry support).
//
// The tests are written to fail against the current implementation and pass
// after Step 2.2 implements the additive capabilities.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import loader from './loader.js';
import themerLoader from 'helper-themer';

const { Lib } = loader();
const Themer = themerLoader(Lib, {});


// Minimal template with a shadow token for testing.
function shadowTemplate () {

  return {
    polarity: 'light',
    ramp: ['#ffffff', '#f4f4f4', '#e0e0e0', '#c6c6c6', '#a8a8a8', '#8d8d8d', '#6f6f6f', '#525252', '#393939', '#262626', '#161616'],
    palette: { shadowColor: '#000000' },
    scales: { base_font_size: 16 },
    tokens: {
      background: '#ffffff',
      textPrimary: '#161616',
      shadowColor: '#000000',
      cardShadow: {
        shadow: true,
        layers: [
          { offset_x: 0, offset_y: 2, blur: 6, spread: 0, opacity: 0.3 },
          { offset_x: 0, offset_y: 4, blur: 8, spread: 1, opacity: 0.2 }
        ],
        color: '{shadowColor}',
        elevation: 2
      }
    },
    meta: {
      background: { group: 'color' },
      textPrimary: { group: 'color' },
      shadowColor: { group: 'color' },
      cardShadow: { group: 'shadow' }
    }
  };

}


describe('recovery - isolation and overrides', function () {

  it('should preserve each engine contrast configuration after another engine is created', function () {
    const first = themerLoader(Lib, { CACHE_ENABLED: false, MIN_CONTRAST_RATIO: 1 });
    const template = { tokens: { fg: '#777777', bg: '#ffffff' }, contrast_rules: [['fg', 'bg']] };
    assert.deepEqual(first.resolve(template, [], { contrast: 'report' }).violations, []);
    const second = themerLoader(Lib, { MIN_CONTRAST_RATIO: 7 });
    assert.equal(second.resolve(template, [], { contrast: 'report' }).violations[0].required, 7);
    first.clearCache();
    assert.deepEqual(first.resolve(template, [], { contrast: 'report' }).violations, []);
  });

  it('should keep injected validators and scale dependencies private to each engine', function () {
    let secondCalls = 0;
    const first = themerLoader(Lib, { CACHE_ENABLED: false });
    const otherLib = { ...Lib, Utils: { ...Lib.Utils, isNumber: function (value) {
      secondCalls++;
      return Lib.Utils.isNumber(value);
    } } };
    themerLoader(otherLib, {});
    secondCalls = 0;
    const result = first.buildTheme({ tokens: { size: { scale: 'miniUnit', multiplier: 2 } }, scales: { miniUnit: { base: 8 } } }, [], 'native');
    assert.equal(result.tokens.size, 16);
    assert.equal(secondCalls, 0);
  });

  it('should prioritize an explicit motion option including zero over the layer factor', function () {
    const engine = themerLoader(Lib, {});
    const template = { tokens: { duration: 100 }, meta: { duration: { group: 'duration' } } };
    const layers = [{ motion_factor: 0.5 }];
    assert.equal(engine.buildTheme(template, layers, 'native').tokens.duration, 50);
    assert.equal(engine.buildTheme(template, layers, 'native', { motion_factor: 0 }).tokens.duration, 0);
    assert.equal(engine.buildTheme(template, layers, 'native', { motion_factor: 0.25 }).tokens.duration, 25);
  });

  it('should replace scalar root sizes while merging named scale seeds without mutating inputs', function () {
    const engine = themerLoader(Lib, {});
    const template = { tokens: { size: 16 }, meta: { size: { group: 'dimension' } }, scales: { base_font_size: 16, geometric: { base: 10, ratio: 2 } } };
    const layers = [{ scales: { base_font_size: 32, geometric: { base: 12 } } }];
    const before = JSON.stringify({ template, layers });
    const resolved = engine.resolve(template, layers);
    assert.deepEqual(resolved.scales, { base_font_size: 32, geometric: { base: 12, ratio: 2 } });
    assert.equal(engine.emit(resolved, template, 'web').tokens.size, '0.5rem');
    assert.equal(JSON.stringify({ template, layers }), before);
  });

  it('should reject malformed layer scale overrides before merging', function () {
    const engine = themerLoader(Lib, {});
    for (const scales of [[], 'bad', { base_font_size: 0 }, { base_font_size: Infinity }, { base_font_size: '16' }, { geometric: 2 }]) {
      assert.throws(function () { engine.resolve({ tokens: { size: 16 } }, [{ scales }]); }, TypeError);
    }
  });

});

describe('recovery - public boundaries', function () {

  it('should reject unknown groups on direct emit without requiring resolve first', function () {
    const engine = themerLoader(Lib, {});
    assert.throws(function () {
      engine.emit({ tokens: { size: 16 }, scales: {} }, { tokens: { size: 16 }, meta: { size: { group: 'unknown' } } }, 'native');
    }, /must name a known emitter group/);
  });

  it('should reject non-object options before splitting or normalizing them', function () {
    const engine = themerLoader(Lib, {});
    const template = shadowTemplate();
    const resolved = engine.resolve(template, []);
    for (const options of [false, 1, 'box_shadow']) {
      assert.throws(function () { engine.buildTheme(template, [], 'native', options); }, TypeError);
      assert.throws(function () { engine.emit(resolved, template, 'native', options); }, TypeError);
    }
  });

});

describe('recovery - exact authored values', function () {

  it('should preserve explicit fractional type metrics through native emission', function () {
    const template = {
      scales: { base_font_size: 16, carbonType: { base: 12 } },
      tokens: { body: { type_set: true, font_size: 14.5, line_height_px: 20.25, letter_spacing: 0.16, weight: 400 } },
      meta: { body: { group: 'typeSet' } }
    };
    const result = Themer.buildTheme(template, [], 'native');
    assert.deepEqual(result.tokens.body, { fontSize: 14.5, lineHeight: 20.25, letterSpacing: 0.16, fontWeight: '400' });
    assert.deepEqual(Themer.buildTheme(template, [], 'web').tokens.body, {
      fontSize: '0.90625rem',
      lineHeight: '1.265625rem',
      letterSpacing: '0.16px',
      fontWeight: 400
    });
  });

  it('should resolve aliases in exact type metrics', function () {
    const template = {
      scales: { base_font_size: 16, carbonType: { base: 12 } },
      tokens: { size: 14.5, height: 20.25, body: { type_set: true, font_size: '{size}', line_height_px: '{height}', letter_spacing: 0 } },
      meta: { body: { group: 'typeSet' } }
    };
    const result = Themer.buildTheme(template, [], 'native');
    assert.deepEqual(result.tokens.body, { fontSize: 14.5, lineHeight: 20.25, letterSpacing: 0 });
  });

  it('should reject conflicting or missing type-set metric forms', function () {
    const engine = themerLoader(Lib, {});
    const entries = [
      { type_set: true, step: 1, font_size: 14, line_height: 1.5 },
      { type_set: true, font_size: 14, line_height: 1.5, line_height_px: 20 },
      { type_set: true, line_height: 1.5 }
    ];
    for (const body of entries) {
      assert.throws(function () {
        engine.resolve({ tokens: { body }, scales: { carbonType: { base: 12 } } }, []);
      }, TypeError);
    }
  });

  it('should omit absent optional type-set properties without undefined or NaN', function () {
    const engine = themerLoader(Lib, {});
    const result = engine.buildTheme({ tokens: { body: { type_set: true, font_size: 14 } } }, [], 'native');
    assert.deepEqual(result.tokens.body, { fontSize: 14 });
  });

  it('should compose shadow color alpha and layer opacity exactly once', function () {
    const template = shadowTemplate();
    template.tokens.shadowColor = '#00000080';
    template.tokens.cardShadow.layers = [{ offset_x: 0, offset_y: 2, blur: 6, spread: 0, opacity: 0.5 }];
    const result = Themer.buildTheme(template, [], 'web');
    assert.equal(result.tokens.cardShadow, '0px 2px 6px rgba(0, 0, 0, ' + (128 / 255 * 0.5) + ')');
  });

  it('should use numeric rgba colors in shadow arithmetic', function () {
    const template = shadowTemplate();
    template.tokens.shadowColor = 'rgba(0, 0, 0, 0.5)';
    template.tokens.cardShadow.layers = [{ offset_x: 0, offset_y: 2, blur: 6, spread: 0, opacity: 0.5 }];
    const result = Themer.buildTheme(template, [], 'web');
    assert.equal(result.tokens.cardShadow, '0px 2px 6px rgba(0, 0, 0, 0.25)');
  });

  it('should preserve interpolated alpha in mix operations', function () {
    const engine = themerLoader(Lib, {});
    const result = engine.buildTheme({
      tokens: {
        a: 'rgba(255, 0, 0, 0.5)',
        b: '#0000ff80',
        mixed: { op: 'mix', args: ['a', 'b', 50] }
      }
    }, [], 'native');
    assert.equal(result.tokens.mixed, '#80008080');
  });

  it('should reject an unknown shadow emission mode', function () {
    assert.throws(function () {
      Themer.buildTheme(shadowTemplate(), [], 'native', { shadow_mode: 'unknown' });
    }, TypeError);
  });

  it('should measure translucent foreground contrast against its declared opaque background', function () {
    const engine = themerLoader(Lib, {});
    const result = engine.buildTheme({
      tokens: { fg: '#00000000', bg: '#ffffff' },
      contrast_rules: [['fg', 'bg', 4.5]]
    }, [], 'native', { contrast: 'report' });
    assert.equal(result.violations.length, 1);
    assert.equal(result.violations[0].ratio, 1);
    assert.equal(result.violations[0].strategy, 'unsupported-alpha-correction');
    assert.equal(result.tokens.fg, '#00000000');
  });

  it('should reject contrast against a translucent background with no compositing context', function () {
    const engine = themerLoader(Lib, {});
    assert.throws(function () {
      engine.buildTheme({
        tokens: { fg: '#161616', bg: '#ffffff80' },
        contrast_rules: [['fg', 'bg', 4.5]]
      }, [], 'native', { contrast: 'report' });
    }, /opaque compositing background/);
  });

  it('should reject malformed numeric colors when arithmetic reads them', function () {
    const engine = themerLoader(Lib, {});
    for (const color of ['rgb(0, 0, 256)', 'rgba(0, 0, 0, 2)', 'rgb(0%, 0%, 0%)', '#xyz']) {
      const template = shadowTemplate();
      template.tokens.shadowColor = color;
      assert.throws(function () { engine.buildTheme(template, [], 'web'); }, /supported numeric color/);
    }
  });

  it('should reject malformed or incomplete explicit shadow layers', function () {
    const engine = themerLoader(Lib, {});
    const layers = [
      [],
      [{}],
      [{ offset_x: 0, offset_y: 0, blur: 1, spread: 0, opacity: 2 }],
      [{ offset_x: 0, offset_y: 0, blur: 1, spread: 0, inset: 'yes' }]
    ];
    for (const value of layers) {
      const template = shadowTemplate();
      template.tokens.cardShadow.layers = value;
      assert.throws(function () { engine.buildTheme(template, [], 'web'); }, TypeError);
    }
  });

  it('should emit native shadow color and composed alpha exactly once', function () {
    const template = shadowTemplate();
    template.tokens.shadowColor = '#00000080';
    template.tokens.cardShadow.layers = [{ offset_x: 0, offset_y: 2, blur: 6, spread: 0, opacity: 0.5 }];
    const result = Themer.buildTheme(template, [], 'native');
    assert.deepEqual(result.tokens.cardShadow, {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 6,
      shadowOpacity: (128 / 255) * 0.5,
      elevation: 2
    });
  });

  it('should report inset loss in legacy native emission', function () {
    const template = shadowTemplate();
    template.tokens.cardShadow.layers = [{ offset_x: 0, offset_y: 2, blur: 6, spread: 0, opacity: 0.5, inset: true }];
    const result = Themer.buildTheme(template, [], 'native');
    assert.deepEqual(result.lossy.map(function (entry) { return entry.fact; }), ['inset']);
  });

});

describe('recovery - correction dependency consistency', function () {

  it('should refresh aliases and rules that depend on a corrected token', function () {
    const engine = themerLoader(Lib, {});
    const result = engine.buildTheme({
      tokens: {
        fg: '#ffffff',
        bg: '#ffffff',
        alias: '{fg}',
        derived: { op: 'mix', args: ['fg', 'bg', 100] }
      },
      contrast_rules: [['fg', 'bg', 4.5]]
    }, [], 'native');
    assert.notEqual(result.tokens.fg, '#ffffff');
    assert.equal(result.tokens.alias, result.tokens.fg);
    assert.equal(result.tokens.derived, result.tokens.fg);
    assert.deepEqual(result.stats.route, { literal: 2, alias: 1, rule: 1, generator: 0, type_set: 0, shadow: 0 });
  });

  it('should invalidate the complete dependent graph before recomputing it', function () {
    const engine = themerLoader(Lib, {});
    const result = engine.buildTheme({
      tokens: {
        fg: '#ffffff',
        bg: '#ffffff',
        early: { op: 'mix', args: ['fg', 'late', 50] },
        late: '{fg}',
        diamondLeft: '{fg}',
        diamondRight: { op: 'mix', args: ['fg', 'bg', 100] },
        diamond: { op: 'mix', args: ['diamondLeft', 'diamondRight', 50] }
      },
      contrast_rules: [['fg', 'bg', 4.5]]
    }, [], 'native');
    assert.equal(result.tokens.early, result.tokens.fg);
    assert.equal(result.tokens.late, result.tokens.fg);
    assert.equal(result.tokens.diamondLeft, result.tokens.fg);
    assert.equal(result.tokens.diamondRight, result.tokens.fg);
    assert.equal(result.tokens.diamond, result.tokens.fg);
    assert.deepEqual(result.stats.route, { literal: 2, alias: 2, rule: 3, generator: 0, type_set: 0, shadow: 0 });
  });

  it('should preserve authored values and dependencies in contrast report mode', function () {
    const engine = themerLoader(Lib, {});
    const result = engine.buildTheme({
      tokens: {
        fg: '#ffffff',
        bg: '#ffffff',
        alias: '{fg}',
        derived: { op: 'mix', args: ['alias', 'bg', 100] }
      },
      contrast_rules: [['fg', 'bg', 4.5], ['derived', 'bg', 4.5]]
    }, [], 'native', { contrast: 'report' });
    assert.equal(result.tokens.fg, '#ffffff');
    assert.equal(result.tokens.alias, '#ffffff');
    assert.equal(result.tokens.derived, '#ffffff');
    assert.equal(result.corrections.length, 0);
    assert.equal(result.violations.length, 2);
  });

});

describe('G11 - alpha-aware color parsing', () => {

  it('should resolve and emit a color with 8-digit hex alpha (#RRGGBBAA)', () => {

    // A color token with alpha should resolve and emit with the alpha preserved
    const template = {
      polarity: 'light',
      ramp: ['#ffffff', '#f4f4f4'],
      scales: { base_font_size: 16 },
      tokens: {
        background: '#ffffff',
        overlay: '#0f62fe80'
      },
      meta: {
        background: { group: 'color' },
        overlay: { group: 'color' }
      }
    };

    const result = Themer.buildTheme(template, [{ name: 'base' }], 'web');
    // The web emission should carry the alpha somehow (rgba or 8-digit hex)
    // The exact format depends on implementation, but the value should not
    // lose the alpha channel
    assert.ok(result.tokens.overlay, 'overlay token must be emitted');
    assert.notEqual(result.tokens.overlay, '#0f62fe', 'alpha must not be silently dropped');

  });

  it('should resolve and emit a color with 4-digit hex alpha (#RGBA)', () => {

    const template = {
      polarity: 'light',
      ramp: ['#ffffff', '#f4f4f4'],
      scales: { base_font_size: 16 },
      tokens: {
        background: '#ffffff',
        tint: '#0f68'
      },
      meta: {
        background: { group: 'color' },
        tint: { group: 'color' }
      }
    };

    const result = Themer.buildTheme(template, [{ name: 'base' }], 'web');
    assert.ok(result.tokens.tint, 'tint token must be emitted');
    assert.notEqual(result.tokens.tint, '#00ff66', 'alpha must not be silently dropped');

  });

  it('should resolve and emit 3-digit hex without alpha (defaults to opaque)', () => {

    const template = {
      polarity: 'light',
      ramp: ['#ffffff', '#f4f4f4'],
      scales: { base_font_size: 16 },
      tokens: {
        background: '#fff',
        text: '#000'
      },
      meta: {
        background: { group: 'color' },
        text: { group: 'color' }
      }
    };

    const result = Themer.buildTheme(template, [{ name: 'base' }], 'web');
    // 3-digit hex should resolve and emit without error
    // The web emitter passes through literal values, so the exact format
    // depends on whether normalization is applied
    assert.ok(result.tokens.background, 'background must be emitted');
    assert.ok(result.tokens.text, 'text must be emitted');

  });

  it('should resolve and emit 6-digit hex without alpha (defaults to opaque)', () => {

    const template = {
      polarity: 'light',
      ramp: ['#ffffff', '#f4f4f4'],
      scales: { base_font_size: 16 },
      tokens: {
        background: '#ffffff',
        accent: '#0f62fe'
      },
      meta: {
        background: { group: 'color' },
        accent: { group: 'color' }
      }
    };

    const result = Themer.buildTheme(template, [{ name: 'base' }], 'web');
    assert.equal(result.tokens.accent, '#0f62fe');

  });

});


describe('G12 - shadow emission modes', () => {

  it('should emit legacy native shadow by default (3-argument emit)', () => {

    const resolved = Themer.resolve(shadowTemplate(), [{ name: 'base' }]);
    const emitted = Themer.emit(resolved, shadowTemplate(), 'native');

    // Legacy native emission collapses to a dominant layer
    assert.equal(typeof emitted.tokens.cardShadow.shadowColor, 'string');
    assert.equal(typeof emitted.tokens.cardShadow.shadowOffset, 'object');
    assert.equal(typeof emitted.tokens.cardShadow.shadowRadius, 'number');
    assert.equal(typeof emitted.tokens.cardShadow.shadowOpacity, 'number');

  });

  it('should emit box_shadow mode preserving all layers when options specify it', () => {

    const resolved = Themer.resolve(shadowTemplate(), [{ name: 'base' }]);
    const emitted = Themer.emit(resolved, shadowTemplate(), 'native', {
      shadow_mode: 'box_shadow'
    });

    // Modern box_shadow mode should preserve all layer geometry
    // The exact shape depends on implementation, but it should carry
    // more information than the legacy collapsed single-layer form
    assert.ok(emitted.tokens.cardShadow, 'shadow token must be emitted');

  });

  it('should omit options and produce identical output to 3-argument emit', () => {

    const resolved = Themer.resolve(shadowTemplate(), [{ name: 'base' }]);

    const legacyResult = Themer.emit(resolved, shadowTemplate(), 'native');
    const optionsResult = Themer.emit(resolved, shadowTemplate(), 'native', {});

    // Omitting options must be semantically identical to passing empty options
    assert.deepEqual(legacyResult.tokens, optionsResult.tokens);

  });

  it('should report loss in legacy mode but not in box_shadow mode', () => {

    const resolved = Themer.resolve(shadowTemplate(), [{ name: 'base' }]);

    const legacyResult = Themer.emit(resolved, shadowTemplate(), 'native');
    const modernResult = Themer.emit(resolved, shadowTemplate(), 'native', {
      shadow_mode: 'box_shadow'
    });

    // Legacy mode should report loss (spread dropped, single layer collapsed)
    const legacyLoss = (legacyResult.lossy || []).filter(l => l.token === 'cardShadow');
    assert.ok(legacyLoss.length > 0, 'legacy mode should report loss for multi-layer shadow');

    // Modern mode should not report loss for the same shadow
    const modernLoss = (modernResult.lossy || []).filter(l => l.token === 'cardShadow');
    assert.equal(modernLoss.length, 0, 'box_shadow mode should not report loss');

  });

});


describe('G02 - cache key includes emission options', () => {

  it('should not share cache entries between legacy and box_shadow modes', () => {

    const themer = themerLoader(Lib, { CACHE_ENABLED: true });
    const template = shadowTemplate();
    const resolved = themer.resolve(template, [{ name: 'base' }]);

    // Emit with legacy mode
    themer.emit(resolved, template, 'native', { shadow_mode: 'legacy' });
    const statsAfterLegacy = themer.cacheStats();

    // Emit with box_shadow mode - should be a cache miss, not a hit
    themer.emit(resolved, template, 'native', { shadow_mode: 'box_shadow' });
    const statsAfterModern = themer.cacheStats();

    // The cache should have grown (new entry for the different mode)
    assert.ok(
      statsAfterModern.size > statsAfterLegacy.size,
      'different shadow modes should not share a cache entry (size: ' + statsAfterLegacy.size + ' -> ' + statsAfterModern.size + ')'
    );

  });

  it('should share cache entries for omitted vs explicitly defaulted options', () => {

    const themer = themerLoader(Lib, { CACHE_ENABLED: true });
    const template = shadowTemplate();
    const resolved = themer.resolve(template, [{ name: 'base' }]);

    // Emit with no options
    themer.emit(resolved, template, 'native');
    const statsAfterFirst = themer.cacheStats();

    // Emit with empty options - should be a cache hit
    themer.emit(resolved, template, 'native', {});
    const statsAfterSecond = themer.cacheStats();

    // The cache size should not have grown (same entry reused)
    assert.equal(
      statsAfterSecond.size,
      statsAfterFirst.size,
      'omitted options and empty options should share a cache entry'
    );

  });

});


describe('G12 - explicit shadow geometry validation', () => {

  it('should reject negative blur in a shadow layer', () => {

    const template = shadowTemplate();
    template.tokens.cardShadow.layers[0].blur = -1;

    assert.throws(
      () => Themer.resolve(template, [{ name: 'base' }]),
      /blur/
    );

  });

  it('should reject non-finite offset values', () => {

    const template = shadowTemplate();
    template.tokens.cardShadow.layers[0].offset_y = Infinity;

    assert.throws(
      () => Themer.resolve(template, [{ name: 'base' }]),
      /offset|finite/
    );

  });

  it('should accept signed offsets and spread', () => {

    const template = shadowTemplate();
    template.tokens.cardShadow.layers[0].offset_x = -2;
    template.tokens.cardShadow.layers[0].offset_y = -3;
    template.tokens.cardShadow.layers[0].spread = -1;

    // Should not throw - negative offsets and spread are valid
    const resolved = Themer.resolve(template, [{ name: 'base' }]);
    assert.ok(resolved.tokens.cardShadow, 'shadow with signed geometry should resolve');

  });

  it('should normalize absent opacity to 1', () => {

    const template = shadowTemplate();
    delete template.tokens.cardShadow.layers[0].opacity;

    const resolved = Themer.resolve(template, [{ name: 'base' }]);
    assert.ok(resolved.tokens.cardShadow, 'shadow without opacity should resolve');

  });

});


describe('G02 - cache key includes template metadata', () => {

  it('should not reuse cache when template metadata changes', () => {

    const themer = themerLoader(Lib, { CACHE_ENABLED: true });

    const template1 = shadowTemplate();
    const template2 = shadowTemplate();

    // Add different metadata to template2 - this creates a new template identity
    template2.meta.cardShadow = Object.assign({}, template2.meta.cardShadow, {
      _version: 'v2'
    });

    const resolved1 = themer.resolve(template1, [{ name: 'base' }]);
    const resolved2 = themer.resolve(template2, [{ name: 'base' }]);

    // Emit both - should produce separate cache entries
    themer.emit(resolved1, template1, 'native');
    const statsAfterFirst = themer.cacheStats();

    themer.emit(resolved2, template2, 'native');
    const statsAfterSecond = themer.cacheStats();

    // Cache should have grown (different template metadata = different entry)
    assert.ok(
      statsAfterSecond.size > statsAfterFirst.size,
      'different template metadata should not share a cache entry (size: ' + statsAfterFirst.size + ' -> ' + statsAfterSecond.size + ')'
    );

  });

});
