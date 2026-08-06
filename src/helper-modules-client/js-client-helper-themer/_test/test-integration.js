// Ported from lab S12-integration: lossy projection reporting and cache
// correctness.
//
// Re-keyed from camelCase to snake_case per LD13. Lab's createResolver()
// is replaced by the module's built-in per-instance cache.
'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const loader = require('./loader.js');
const { Lib } = loader();
const Themer = require('helper-themer')(Lib, {});


function makeTemplate (accentHex) {

  return {
    polarity: 'light',
    ramp: ['#ffffff', '#161616'],
    palette: {},
    scales: { base_font_size: 16, carbonType: { base: 12 }, miniUnit: { base: 8 } },
    tokens: {
      brand: accentHex,
      bodyText: { type_set: true, step: 2, weight: 400, line_height: 1.42857, letter_spacing: 0.16 },
      codeText: { type_set: true, step: 1, weight: 400, line_height: 1.33333, letter_spacing: 0.32, font_family: 'mono' },
      cardShadow: {
        shadow: true,
        layers: [
          { offset_x: 0, offset_y: 2, blur: 4, spread: 1, color: '#000000', opacity: 0.2 },
          { offset_x: 0, offset_y: 8, blur: 16, spread: 0, color: '#000000', opacity: 0.1 }
        ]
      },
      flatShadow: {
        shadow: true,
        layers: [
          { offset_x: 0, offset_y: 1, blur: 2, spread: 0, color: '#000000', opacity: 0.3 }
        ]
      }
    },
    meta: {
      brand: { group: 'colour' },
      bodyText: { group: 'typeSet' },
      codeText: { group: 'typeSet' },
      cardShadow: { group: 'shadow' },
      flatShadow: { group: 'shadow' }
    },
    contrast_rules: []
  };

}

const LAYERS = [{ name: 'base' }];


describe('lossy projection reporting', () => {

  const t = makeTemplate('#0f62fe');
  const r = Themer.resolve(t, LAYERS);
  const web = Themer.emit(r, t, 'web');
  const native = Themer.emit(r, t, 'native');

  it('should report no loss on web - CSS represents every shadow fact', () => {

    assert.deepEqual(web.lossy, []);

  });

  it('should report the collapsed multi-layer shadow on native', () => {

    const found = native.lossy.filter((l) => l.token === 'cardShadow' && l.fact === 'layers');

    assert.equal(found.length, 1);
    assert.match(found[0].reason, /2 layers collapsed/);

  });

  it('should report the discarded spread on native, naming the token', () => {

    const found = native.lossy.filter((l) => l.token === 'cardShadow' && l.fact === 'spread');

    assert.equal(found.length, 1);

  });

  it('should report no loss for a single-layer zero-spread shadow on native', () => {

    const found = native.lossy.filter((l) => l.token === 'flatShadow');

    assert.deepEqual(found, []);

  });

  it('should name a token that exists in the emitted output for every lossy entry', () => {

    for (const entry of native.lossy) {
      assert.ok(entry.token in native.tokens, 'unknown token ' + entry.token);
    }

  });

});


describe('cache correctness - a stale hit is a silent bug', () => {

  const t = makeTemplate('#0f62fe');

  it('should hit when a fresh array with equal content arrives', () => {

    const instance = require('helper-themer')(Lib, {});

    instance.resolve(t, [{ name: 'base' }]);
    instance.resolve(t, [{ name: 'base' }]);

    assert.equal(instance.cacheStats().hits, 1);
    assert.equal(instance.cacheStats().misses, 1);

  });

  it('should miss when the layer content differs', () => {

    const instance = require('helper-themer')(Lib, {});

    instance.resolve(t, [{ name: 'base' }]);
    instance.resolve(t, [{ name: 'other' }]);

    assert.equal(instance.cacheStats().misses, 2);

  });

  it('should not collide when a different template has identical layers', () => {

    const instance = require('helper-themer')(Lib, {});
    const blue = makeTemplate('#0f62fe');
    const red = makeTemplate('#da1e28');

    const a = instance.resolve(blue, LAYERS);
    const b = instance.resolve(red, LAYERS);

    assert.equal(a.tokens.brand, '#0f62fe');
    assert.equal(b.tokens.brand, '#da1e28');

  });

  it('should not collide when options differ', () => {

    const instance = require('helper-themer')(Lib, {});

    instance.resolve(t, LAYERS, { min_contrast_ratio: 4.5 });
    instance.resolve(t, LAYERS, { min_contrast_ratio: 7 });

    assert.equal(instance.cacheStats().misses, 2);

  });

  it('should return an equal result whether or not the cache served it', () => {

    const cached = require('helper-themer')(Lib, {});
    const uncached = require('helper-themer')(Lib, { CACHE_ENABLED: false });

    assert.deepEqual(
      cached.buildTheme(t, LAYERS, 'native'),
      uncached.buildTheme(t, LAYERS, 'native')
    );

  });

  it('should keep web and native emit apart', () => {

    const instance = require('helper-themer')(Lib, {});
    const rr = instance.resolve(t, LAYERS);
    const w = instance.emit(rr, t, 'web');
    const n = instance.emit(rr, t, 'native');

    assert.notDeepEqual(w.tokens.bodyText, n.tokens.bodyText);
    assert.equal(typeof w.tokens.bodyText.fontSize, 'string');
    assert.equal(typeof n.tokens.bodyText.fontSize, 'number');

  });

  it('should hit on a repeat emit of the same resolved result', () => {

    const instance = require('helper-themer')(Lib, {});
    const rr = instance.resolve(t, LAYERS);

    instance.emit(rr, t, 'native');
    instance.emit(rr, t, 'native');

    assert.equal(instance.cacheStats().hits, 1);

  });

});


describe('LRU bound', () => {

  const t = makeTemplate('#0f62fe');

  it('should respect capacity and evict the oldest entry', () => {

    const instance = require('helper-themer')(Lib, { CACHE_CAPACITY: 3 });

    for (let i = 0; i < 5; i++) {
      instance.resolve(t, [{ name: 'layer' + i }]);
    }

    assert.equal(instance.cacheStats().size, 3);
    assert.equal(instance.cacheStats().evictions, 2);

  });

  it('should refresh recency on read, so an LRU is not a FIFO queue', () => {

    const instance = require('helper-themer')(Lib, { CACHE_CAPACITY: 3 });

    instance.resolve(t, [{ name: 'a' }]);
    instance.resolve(t, [{ name: 'b' }]);
    instance.resolve(t, [{ name: 'c' }]);

    // Touch 'a' so 'b' becomes the oldest
    instance.resolve(t, [{ name: 'a' }]);

    // Inserting 'd' must evict 'b', not the re-read 'a'
    instance.resolve(t, [{ name: 'd' }]);

    const hitsBefore = instance.cacheStats().hits;
    instance.resolve(t, [{ name: 'a' }]);
    assert.equal(instance.cacheStats().hits, hitsBefore + 1);

    const missesBefore = instance.cacheStats().misses;
    instance.resolve(t, [{ name: 'b' }]);
    assert.equal(instance.cacheStats().misses, missesBefore + 1);

  });

  it('should reset both entries and counters on clear', () => {

    const instance = require('helper-themer')(Lib, {});

    instance.resolve(t, LAYERS);
    instance.clearCache();

    assert.deepEqual(instance.cacheStats(), {
      hits: 0,
      misses: 0,
      evictions: 0,
      size: 0
    });

  });

});
