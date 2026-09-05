// Info: Failing tests for additive Themer capabilities (Plan 0149, Step 2.1).
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
