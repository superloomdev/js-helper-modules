// Info: Test suite for js-client-helper-themer.
//
// The engine is pure, so every test is synchronous and needs no fixture
// server, no container, and no clock control.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import loader from './loader.js';
import buildTemplate from './fixtures/template.js';
import themerLoader from 'helper-themer';

const { Lib } = loader();

const Themer = themerLoader(Lib, {});
const TEMPLATE = buildTemplate();
const BASE_LAYER = [{ name: 'base' }];


describe('loader', () => {

  it('should return the public interface when loaded with defaults', () => {

    const instance = themerLoader(Lib, {});

    assert.equal(typeof instance.buildTheme, 'function');
    assert.equal(typeof instance.resolve, 'function');
    assert.equal(typeof instance.emit, 'function');
    assert.equal(typeof instance.validateTemplate, 'function');
    assert.equal(typeof instance.platforms, 'function');
    assert.equal(typeof instance.cacheStats, 'function');
    assert.equal(typeof instance.clearCache, 'function');

  });

  it('should throw when BASE_FONT_SIZE is not a positive number', () => {

    assert.throws(
      () => themerLoader(Lib, { BASE_FONT_SIZE: 0 }),
      /^TypeError: \[helper-themer\] CONFIG\.BASE_FONT_SIZE must be a number greater than zero$/
    );

  });

  it('should throw when CACHE_CAPACITY is not a whole number of one or greater', () => {

    assert.throws(
      () => themerLoader(Lib, { CACHE_CAPACITY: 0 }),
      /^TypeError: \[helper-themer\] CONFIG\.CACHE_CAPACITY must be a whole number of 1 or greater$/
    );

    assert.throws(
      () => themerLoader(Lib, { CACHE_CAPACITY: 2.5 }),
      /^TypeError: \[helper-themer\] CONFIG\.CACHE_CAPACITY must be a whole number of 1 or greater$/
    );

  });

  it('should throw when CACHE_ENABLED is not a boolean', () => {

    assert.throws(
      () => themerLoader(Lib, { CACHE_ENABLED: 'yes' }),
      /^TypeError: \[helper-themer\] CONFIG\.CACHE_ENABLED must be true or false$/
    );

  });

  it('should throw when MIN_CONTRAST_RATIO is outside the representable range', () => {

    assert.throws(
      () => themerLoader(Lib, { MIN_CONTRAST_RATIO: 22 }),
      /^TypeError: \[helper-themer\] CONFIG\.MIN_CONTRAST_RATIO must be a number between 1 and 21 inclusive$/
    );

  });

  it('should give each instance its own cache when loaded twice', () => {

    const first = themerLoader(Lib, {});
    const second = themerLoader(Lib, {});

    first.resolve(TEMPLATE, BASE_LAYER);

    assert.equal(first.cacheStats().size, 1);
    assert.equal(second.cacheStats().size, 0);

  });

});


describe('resolve', () => {

  it('should resolve a literal token to its own value when the entry is a literal', () => {

    const result = Themer.resolve(TEMPLATE, BASE_LAYER);

    assert.equal(result.tokens.background, '#ffffff');

  });

  it('should resolve an alias to its target value when the entry names another token', () => {

    const result = Themer.resolve(TEMPLATE, BASE_LAYER);

    assert.equal(result.tokens.brandAlias, result.tokens.brand);
    assert.equal(result.tokens.brandAlias, '#0f62fe');

  });

  it('should walk the ramp away from the background when the rule is rampStep', () => {

    const result = Themer.resolve(TEMPLATE, BASE_LAYER);

    assert.equal(result.tokens.textPrimary, '#161616');

  });

  it('should read the named palette step when the rule is hue', () => {

    const result = Themer.resolve(TEMPLATE, BASE_LAYER);

    assert.equal(result.tokens.brand, '#0f62fe');

  });

  it('should generate spacing as a multiple of the mini unit when the entry names a scale', () => {

    const result = Themer.resolve(TEMPLATE, BASE_LAYER);

    assert.equal(result.tokens.spacing03, 16);
    assert.equal(result.tokens.spacing05, 32);

  });

  it('should generate a geometric value when the entry names the geometric scale', () => {

    const result = Themer.resolve(TEMPLATE, BASE_LAYER);

    assert.equal(result.tokens.geoStep03, 40);

  });

  it('should resolve a type set to an object carrying its own font size', () => {

    const result = Themer.resolve(TEMPLATE, BASE_LAYER);

    assert.deepEqual(result.tokens.code01, {
      fontSize: 12,
      lineHeight: 1.33333,
      letterSpacing: 0.32,
      fontWeight: 400,
      fontFamily: 'mono'
    });

  });

  it('should omit the weight when a type set declares none', () => {

    const result = Themer.resolve(TEMPLATE, BASE_LAYER);

    assert.equal('fontWeight' in result.tokens.helperText01, false);

  });

  it('should seed shadow geometry from the elevation table when a level is declared', () => {

    const result = Themer.resolve(TEMPLATE, BASE_LAYER);

    assert.equal(result.tokens.cardShadow.layers.length, 2);
    assert.equal(result.tokens.cardShadow.elevation, 2);
    assert.equal(result.tokens.cardShadow.layers[0].color, '#000000');

  });

  it('should let a later layer override an earlier pin when both name a token', () => {

    const result = Themer.resolve(TEMPLATE, [
      { name: 'base', tokens: { brand: '#111111' } },
      { name: 'tenant', tokens: { brand: '#222222' } }
    ]);

    assert.equal(result.tokens.brand, '#222222');

  });

  it('should rescale every generated value when a layer overrides a scale seed', () => {

    const result = Themer.resolve(TEMPLATE, [
      { name: 'dense', scales: { miniUnit: { base: 4 } } }
    ]);

    assert.equal(result.tokens.spacing03, 8);
    assert.equal(result.tokens.spacing05, 16);

  });

  it('should not mutate the template when a layer overrides a scale seed', () => {

    Themer.resolve(TEMPLATE, [{ name: 'dense', scales: { miniUnit: { base: 4 } } }]);

    assert.equal(TEMPLATE.scales.miniUnit.base, 8);

  });

  it('should scale duration tokens when a layer sets a motion factor', () => {

    const result = Themer.resolve(TEMPLATE, [{ name: 'reduced', motion_factor: 0.5 }]);

    assert.equal(result.tokens.durationFast, 55);

  });

  it('should leave non-duration tokens untouched when a motion factor applies', () => {

    const result = Themer.resolve(TEMPLATE, [{ name: 'reduced', motion_factor: 0.5 }]);

    assert.equal(result.tokens.spacing03, 16);

  });

  it('should count the route and the source separately when tokens resolve', () => {

    const result = Themer.resolve(TEMPLATE, [{ name: 'base', tokens: { brand: '#333333' } }]);

    assert.equal(result.stats.route.alias, 1);
    assert.equal(result.stats.route.type_set, 2);
    assert.equal(result.stats.route.shadow, 2);
    assert.equal(result.stats.source.theme, 1);

  });

  it('should correct a failing color and record the change when contrast mode is correct', () => {

    const result = Themer.resolve(TEMPLATE, BASE_LAYER);

    assert.equal(result.corrections.length, 1);
    assert.equal(result.corrections[0].token, 'warning');
    assert.equal(result.corrections[0].from, '#fa4d56');
    assert.equal(result.tokens.warning, result.corrections[0].to);
    assert.ok(result.corrections[0].ratio_after >= 4.5);

  });

  it('should snap to a palette step rather than invent a color when one complies', () => {

    const result = Themer.resolve(TEMPLATE, BASE_LAYER);

    assert.equal(result.corrections[0].strategy, 'snap:red60');
    assert.equal(result.tokens.warning, '#da1e28');

  });

  it('should report the violation and leave the value in place when contrast mode is report', () => {

    const result = Themer.resolve(TEMPLATE, BASE_LAYER, { contrast: 'report' });

    assert.equal(result.violations.length, 1);
    assert.equal(result.corrections.length, 0);
    assert.equal(result.tokens.warning, '#fa4d56');

  });

  it('should throw when the template is not a plain object', () => {

    assert.throws(
      () => Themer.resolve(null, BASE_LAYER),
      /^TypeError: \[helper-themer\] template must be a plain object$/
    );

  });

  it('should throw when the layers argument is not an array', () => {

    assert.throws(
      () => Themer.resolve(TEMPLATE, { name: 'base' }),
      /^TypeError: \[helper-themer\] layers must be an array of layer objects$/
    );

  });

  it('should name the offending index when a layer is not an object', () => {

    assert.throws(
      () => Themer.resolve(TEMPLATE, [{ name: 'base' }, 'tenant']),
      /^TypeError: \[helper-themer\] layers\[1\] must be a plain object$/
    );

  });

  it('should throw when an alias names a token nothing declares', () => {

    const template = buildTemplate();
    template.tokens.orphan = '{missing}';
    template.meta.orphan = { group: 'color' };

    assert.throws(
      () => Themer.resolve(template, BASE_LAYER),
      /^TypeError: \[helper-themer\] tokens\.missing must be a declared token or alias target$/
    );

  });

  it('should throw when aliases form a cycle', () => {

    const template = buildTemplate();
    template.tokens.loopA = '{loopB}';
    template.tokens.loopB = '{loopA}';
    template.meta.loopA = { group: 'color' };
    template.meta.loopB = { group: 'color' };

    assert.throws(
      () => Themer.resolve(template, BASE_LAYER),
      /^TypeError: \[helper-themer\] tokens\.loop[AB] resolves through an alias cycle$/
    );

  });

  it('should throw when a token entry matches no known route', () => {

    const template = buildTemplate();
    template.tokens.broken = { nothing: true };
    template.meta.broken = { group: 'raw' };

    assert.throws(
      () => Themer.resolve(template, BASE_LAYER),
      /^TypeError: \[helper-themer\] tokens\.broken must be a literal, alias, rule, generator, or type set$/
    );

  });

  it('should throw when a generator names a scale the engine does not provide', () => {

    const template = buildTemplate();
    template.tokens.odd = { scale: 'nonexistent', step: 1 };
    template.meta.odd = { group: 'dimension' };

    assert.throws(
      () => Themer.resolve(template, BASE_LAYER),
      /^TypeError: \[helper-themer\] tokens\.odd\.scale must name a generator this engine provides$/
    );

  });

  it('should throw when a rule names an operation the engine does not provide', () => {

    const template = buildTemplate();
    template.tokens.odd = { op: 'nonexistent', args: [] };
    template.meta.odd = { group: 'color' };

    assert.throws(
      () => Themer.resolve(template, BASE_LAYER),
      /^TypeError: \[helper-themer\] tokens\.odd\.op must name an operation this engine provides$/
    );

  });

  it('should throw when a type set declares a negative line height', () => {

    const template = buildTemplate();
    template.tokens.bad = { type_set: true, step: 1, line_height: -1 };
    template.meta.bad = { group: 'typeSet' };

    assert.throws(
      () => Themer.resolve(template, BASE_LAYER),
      /^TypeError: \[helper-themer\] tokens\.bad\.line_height must be a number of zero or greater$/
    );

  });

  it('should throw when a layer motion factor falls outside zero and one', () => {

    assert.throws(
      () => Themer.resolve(TEMPLATE, [{ name: 'bad', motion_factor: 2 }]),
      /^TypeError: \[helper-themer\] layers\[0\]\.motion_factor must be a number between 0 and 1 inclusive$/
    );

  });

});


describe('emit', () => {

  it('should convert dimensions to rem against the base font size when the platform is web', () => {

    const resolved = Themer.resolve(TEMPLATE, BASE_LAYER);
    const web = Themer.emit(resolved, TEMPLATE, 'web');

    assert.equal(web.tokens.spacing03, '1rem');
    assert.equal(web.tokens.spacing05, '2rem');

  });

  it('should leave dimensions as raw numbers when the platform is native', () => {

    const resolved = Themer.resolve(TEMPLATE, BASE_LAYER);
    const native = Themer.emit(resolved, TEMPLATE, 'native');

    assert.equal(native.tokens.spacing03, 16);
    assert.equal(native.tokens.spacing05, 32);

  });

  it('should emit a line height ratio when the platform is web', () => {

    const resolved = Themer.resolve(TEMPLATE, BASE_LAYER);
    const web = Themer.emit(resolved, TEMPLATE, 'web');

    assert.deepEqual(web.tokens.code01, {
      fontSize: '0.75rem',
      lineHeight: '1.33333',
      letterSpacing: '0.32px',
      fontWeight: 400,
      fontFamily: 'mono'
    });

  });

  it('should emit an absolute line height when the platform is native', () => {

    const resolved = Themer.resolve(TEMPLATE, BASE_LAYER);
    const native = Themer.emit(resolved, TEMPLATE, 'native');

    assert.deepEqual(native.tokens.code01, {
      fontSize: 12,
      lineHeight: 16,
      letterSpacing: 0.32,
      fontWeight: '400',
      fontFamily: 'mono'
    });

  });

  it('should omit the weight rather than stringify undefined when a type set declares none', () => {

    const resolved = Themer.resolve(TEMPLATE, BASE_LAYER);
    const native = Themer.emit(resolved, TEMPLATE, 'native');

    assert.equal('fontWeight' in native.tokens.helperText01, false);
    assert.equal(JSON.stringify(native.tokens).indexOf('undefined'), -1);

  });

  it('should pass the family token through untranslated on both platforms', () => {

    const resolved = Themer.resolve(TEMPLATE, BASE_LAYER);

    assert.equal(Themer.emit(resolved, TEMPLATE, 'web').tokens.code01.fontFamily, 'mono');
    assert.equal(Themer.emit(resolved, TEMPLATE, 'native').tokens.code01.fontFamily, 'mono');

  });

  it('should invent no family when the source type set declares none', () => {

    const resolved = Themer.resolve(TEMPLATE, BASE_LAYER);
    const native = Themer.emit(resolved, TEMPLATE, 'native');

    assert.equal('fontFamily' in native.tokens.helperText01, false);

  });

  it('should comma-join every shadow layer when the platform is web', () => {

    const resolved = Themer.resolve(TEMPLATE, BASE_LAYER);
    const web = Themer.emit(resolved, TEMPLATE, 'web');

    assert.equal(
      web.tokens.cardShadow,
      '0px 3px 6px rgba(0, 0, 0, 0.16), 0px 3px 6px rgba(0, 0, 0, 0.23)'
    );

  });

  it('should keep the spread slot when the platform is web', () => {

    const resolved = Themer.resolve(TEMPLATE, BASE_LAYER);
    const web = Themer.emit(resolved, TEMPLATE, 'web');

    assert.equal(web.tokens.spreadShadow, '0px 2px 4px 3px rgba(0, 0, 0, 0.2)');

  });

  it('should collapse to the layer with the greatest blur when the platform is native', () => {

    const resolved = Themer.resolve(TEMPLATE, BASE_LAYER);
    const native = Themer.emit(resolved, TEMPLATE, 'native');

    assert.equal(native.tokens.cardShadow.shadowRadius, 6);
    assert.equal(native.tokens.cardShadow.elevation, 2);

  });

  it('should emit easing as a cubic-bezier string when the platform is web', () => {

    const resolved = Themer.resolve(TEMPLATE, BASE_LAYER);
    const web = Themer.emit(resolved, TEMPLATE, 'web');

    assert.equal(web.tokens.easingStandard, 'cubic-bezier(0.2, 0, 0.38, 0.9)');

  });

  it('should emit easing as control points when the platform is native', () => {

    const resolved = Themer.resolve(TEMPLATE, BASE_LAYER);
    const native = Themer.emit(resolved, TEMPLATE, 'native');

    assert.deepEqual(native.tokens.easingStandard, [0.2, 0, 0.38, 0.9]);

  });

  it('should substitute the declared fallback when a token is unavailable on the platform', () => {

    const resolved = Themer.resolve(TEMPLATE, BASE_LAYER);
    const native = Themer.emit(resolved, TEMPLATE, 'native');

    assert.equal(native.tokens.fluidGutter, 16);
    assert.equal(native.substituted.length, 1);
    assert.equal(native.substituted[0].token, 'fluidGutter');
    assert.equal(native.substituted[0].declared, '4vw');

  });

  it('should emit the same token keys on both platforms', () => {

    const resolved = Themer.resolve(TEMPLATE, BASE_LAYER);
    const web_keys = Object.keys(Themer.emit(resolved, TEMPLATE, 'web').tokens).sort();
    const native_keys = Object.keys(Themer.emit(resolved, TEMPLATE, 'native').tokens).sort();

    assert.deepEqual(web_keys, native_keys);

  });

  it('should report no loss when the platform is web', () => {

    const resolved = Themer.resolve(TEMPLATE, BASE_LAYER);
    const web = Themer.emit(resolved, TEMPLATE, 'web');

    assert.deepEqual(web.lossy, []);

  });

  it('should report the collapsed layers when the platform is native', () => {

    const resolved = Themer.resolve(TEMPLATE, BASE_LAYER);
    const native = Themer.emit(resolved, TEMPLATE, 'native');
    const found = native.lossy.filter((l) => l.token === 'cardShadow' && l.fact === 'layers');

    assert.equal(found.length, 1);

  });

  it('should report the discarded spread and name its token when the platform is native', () => {

    const resolved = Themer.resolve(TEMPLATE, BASE_LAYER);
    const native = Themer.emit(resolved, TEMPLATE, 'native');
    const found = native.lossy.filter((l) => l.token === 'spreadShadow' && l.fact === 'spread');

    assert.equal(found.length, 1);

  });

  it('should throw when the platform is not one the engine emits for', () => {

    const resolved = Themer.resolve(TEMPLATE, BASE_LAYER);

    assert.throws(
      () => Themer.emit(resolved, TEMPLATE, 'android'),
      /^TypeError: \[helper-themer\] platform must be one of: web, native$/
    );

  });

});


describe('buildTheme', () => {

  it('should return emitted tokens and the derivation reports in one call', () => {

    const theme = Themer.buildTheme(TEMPLATE, BASE_LAYER, 'web');

    assert.equal(theme.tokens.spacing03, '1rem');
    assert.equal(theme.corrections.length, 1);
    assert.deepEqual(theme.lossy, []);
    assert.equal(theme.substituted.length, 0);

  });

  it('should equal the two-stage result when called with the same arguments', () => {

    const instance = themerLoader(Lib, {});
    const combined = instance.buildTheme(TEMPLATE, BASE_LAYER, 'native');
    const resolved = instance.resolve(TEMPLATE, BASE_LAYER);
    const staged = instance.emit(resolved, TEMPLATE, 'native');

    assert.deepEqual(combined.tokens, staged.tokens);

  });

});


describe('validateTemplate', () => {

  it('should report success with no errors when the template is well formed', () => {

    assert.deepEqual(Themer.validateTemplate(TEMPLATE), {
      success: true,
      errors: []
    });

  });

  it('should report the finding rather than throw when the token map is missing', () => {

    assert.deepEqual(Themer.validateTemplate({ polarity: 'light' }), {
      success: false,
      errors: ['[helper-themer] template.tokens must be a plain object']
    });

  });

  it('should report the finding when the base font size is not a positive number', () => {

    assert.deepEqual(Themer.validateTemplate({ tokens: {}, scales: { base_font_size: 0 } }), {
      success: false,
      errors: ['[helper-themer] template.scales.base_font_size must be a number greater than zero']
    });

  });

  it('should report every finding at once when a template breaks several rules', () => {

    const result = Themer.validateTemplate({
      tokens: 'not-an-object',
      meta: 'not-an-object',
      palette: 'not-an-object'
    });

    assert.deepEqual(result, {
      success: false,
      errors: [
        '[helper-themer] template.tokens must be a plain object',
        '[helper-themer] template.meta must be a plain object',
        '[helper-themer] template.palette must be a plain object'
      ]
    });

  });

  it('should report the finding when the template itself is not an object', () => {

    assert.deepEqual(Themer.validateTemplate(null), {
      success: false,
      errors: ['[helper-themer] template must be a plain object']
    });

  });

  it('should keep throwing from resolve after a template was checked', () => {

    Themer.validateTemplate({ tokens: 'not-an-object' });

    assert.throws(
      () => Themer.resolve(null, BASE_LAYER),
      /^TypeError: \[helper-themer\] template must be a plain object$/
    );

  });

});


describe('platforms', () => {

  it('should list web and native when asked which platforms are supported', () => {

    assert.deepEqual(Themer.platforms(), ['web', 'native']);

  });

  it('should return a copy a caller cannot use to mutate the engine', () => {

    Themer.platforms().push('android');

    assert.deepEqual(Themer.platforms(), ['web', 'native']);

  });

});


describe('cacheStats', () => {

  it('should hit when the same layer content arrives in a fresh array', () => {

    const instance = themerLoader(Lib, {});

    instance.resolve(TEMPLATE, [{ name: 'base' }]);
    instance.resolve(TEMPLATE, [{ name: 'base' }]);

    assert.equal(instance.cacheStats().hits, 1);
    assert.equal(instance.cacheStats().misses, 1);

  });

  it('should miss when the layer content differs', () => {

    const instance = themerLoader(Lib, {});

    instance.resolve(TEMPLATE, [{ name: 'base' }]);
    instance.resolve(TEMPLATE, [{ name: 'other' }]);

    assert.equal(instance.cacheStats().misses, 2);

  });

  it('should keep two templates apart when their layers are identical', () => {

    const instance = themerLoader(Lib, {});
    const blue = buildTemplate('#0f62fe');
    const red = buildTemplate('#da1e28');

    assert.equal(instance.resolve(blue, BASE_LAYER).tokens.accent, '#0f62fe');
    assert.equal(instance.resolve(red, BASE_LAYER).tokens.accent, '#da1e28');

  });

  it('should keep the two platforms apart when emitting one resolved theme', () => {

    const instance = themerLoader(Lib, {});
    const resolved = instance.resolve(TEMPLATE, BASE_LAYER);

    assert.equal(typeof instance.emit(resolved, TEMPLATE, 'web').tokens.spacing03, 'string');
    assert.equal(typeof instance.emit(resolved, TEMPLATE, 'native').tokens.spacing03, 'number');

  });

  it('should keep differing options apart when the template and layers match', () => {

    const instance = themerLoader(Lib, {});

    instance.resolve(TEMPLATE, BASE_LAYER, { contrast: 'correct' });
    instance.resolve(TEMPLATE, BASE_LAYER, { contrast: 'report' });

    assert.equal(instance.cacheStats().misses, 2);

  });

  it('should evict the oldest entry when capacity is exceeded', () => {

    const instance = themerLoader(Lib, { CACHE_CAPACITY: 3 });

    for (let i = 0; i < 5; i++) {
      instance.resolve(TEMPLATE, [{ name: 'layer' + i }]);
    }

    assert.equal(instance.cacheStats().size, 3);
    assert.equal(instance.cacheStats().evictions, 2);

  });

  it('should keep a re-read entry alive when a later insert forces eviction', () => {

    const instance = themerLoader(Lib, { CACHE_CAPACITY: 3 });

    instance.resolve(TEMPLATE, [{ name: 'a' }]);
    instance.resolve(TEMPLATE, [{ name: 'b' }]);
    instance.resolve(TEMPLATE, [{ name: 'c' }]);

    // Re-reading 'a' makes 'b' the oldest entry
    instance.resolve(TEMPLATE, [{ name: 'a' }]);
    instance.resolve(TEMPLATE, [{ name: 'd' }]);

    const hits_before = instance.cacheStats().hits;
    instance.resolve(TEMPLATE, [{ name: 'a' }]);
    assert.equal(instance.cacheStats().hits, hits_before + 1);

    const misses_before = instance.cacheStats().misses;
    instance.resolve(TEMPLATE, [{ name: 'b' }]);
    assert.equal(instance.cacheStats().misses, misses_before + 1);

  });

  it('should store nothing when caching is disabled', () => {

    const instance = themerLoader(Lib, { CACHE_ENABLED: false });

    instance.resolve(TEMPLATE, BASE_LAYER);
    instance.resolve(TEMPLATE, BASE_LAYER);

    assert.equal(instance.cacheStats().size, 0);
    assert.equal(instance.cacheStats().hits, 0);
    assert.equal(instance.cacheStats().misses, 2);

  });

  it('should return an equal result whether or not the cache served it', () => {

    const cached = themerLoader(Lib, {});
    const uncached = themerLoader(Lib, { CACHE_ENABLED: false });

    assert.deepEqual(
      cached.buildTheme(TEMPLATE, BASE_LAYER, 'native'),
      uncached.buildTheme(TEMPLATE, BASE_LAYER, 'native')
    );

  });

});


describe('clearCache', () => {

  it('should reset the entries and the counters when called', () => {

    const instance = themerLoader(Lib, {});

    instance.resolve(TEMPLATE, BASE_LAYER);
    instance.clearCache();

    assert.deepEqual(instance.cacheStats(), {
      hits: 0,
      misses: 0,
      evictions: 0,
      size: 0
    });

  });

  it('should make a previous hit into a miss after clearing', () => {

    const instance = themerLoader(Lib, {});

    instance.resolve(TEMPLATE, BASE_LAYER);
    instance.resolve(TEMPLATE, BASE_LAYER);

    assert.equal(instance.cacheStats().hits, 1);

    instance.clearCache();

    instance.resolve(TEMPLATE, BASE_LAYER);

    assert.equal(instance.cacheStats().hits, 0);
    assert.equal(instance.cacheStats().misses, 1);

  });

});
