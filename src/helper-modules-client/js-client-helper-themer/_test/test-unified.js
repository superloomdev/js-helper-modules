// Ported from lab S6-unified: exercises the engine across every token group.
//
// Re-keyed from camelCase to snake_case per LD13. Lab's internal functions
// (correctForContrast, contrastRatio) and performance measurements are omitted.
// Lab's validateTemplate returns { code, message } objects; the module returns
// string arrays, so validation assertions are adapted.
'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const loader = require('./loader.js');
const { Lib } = loader();
const Themer = require('helper-themer')(Lib, {});

const inventory = require('./fixtures/carbon-inventory.json');

const RAMP = [
  '#ffffff', '#f4f4f4', '#e0e0e0', '#c6c6c6', '#a8a8a8',
  '#8d8d8d', '#6f6f6f', '#525252', '#393939', '#262626', '#161616'
];

const SPACING_MULTIPLIERS = [0.25, 0.5, 1, 1.5, 2, 3, 4, 5, 6, 8, 10, 12, 20];

const template = {
  polarity: 'light',
  ramp: RAMP,
  palette: inventory.palette,
  scales: {
    base_font_size: 16,
    miniUnit: { base: 8 },
    carbonType: { base: 12 },
    geometric: { base: 16, ratio: 1.25 }
  },
  tokens: {},
  meta: {},
  contrast_rules: [
    ['text.primary', 'background', 4.5],
    ['text.error', 'background', 4.5]
  ]
};

function declare (name, entry, meta) {
  template.tokens[name] = entry;
  template.meta[name] = meta;
}

// Colour
declare('background', { op: 'rampStep', args: [0] }, { group: 'colour' });
declare('layer.01', { op: 'rampStep', args: [1] }, { group: 'colour' });
declare('text.primary', { op: 'rampStep', args: [10] }, { group: 'colour' });
declare('text.error', { op: 'hue', args: ['red', 60] }, { group: 'colour' });
declare('link.primary', { op: 'hue', args: ['blue', 60] }, { group: 'colour' });
declare('border.interactive', '{link.primary}', { group: 'colour' });

// Dimension, every step from one generator
SPACING_MULTIPLIERS.forEach(function (multiplier, i) {
  declare('spacing' + String(i + 1).padStart(2, '0'), { scale: 'miniUnit', multiplier: multiplier }, { group: 'dimension' });
});

// Type scale, every step from the recurrence
for (let step = 1; step <= 23; step++) {
  declare('scale' + String(step).padStart(2, '0'), { scale: 'carbonType', step: step }, { group: 'fontSize' });
}

// Type sets, which resolve to objects
const TYPE_SETS = {
  caption01: { step: 1, weight: 400, line_height: 1.33333, letter_spacing: 0.32 },
  bodyShort01: { step: 3, weight: 400, line_height: 1.28572, letter_spacing: 0.16 },
  bodyLong02: { step: 4, weight: 400, line_height: 1.5, letter_spacing: 0 },
  productiveHeading01: { step: 3, weight: 600, line_height: 1.28572, letter_spacing: 0.16 },
  display01: { step: 13, weight: 300, line_height: 1.19, letter_spacing: -0.64 }
};

for (const [name, set] of Object.entries(TYPE_SETS)) {
  declare(name, Object.assign({ type_set: true }, set), { group: 'typeSet' });
}

// Motion
const DURATIONS = { 'fast-01': 70, 'fast-02': 110, 'moderate-01': 150, 'moderate-02': 240, 'slow-01': 400, 'slow-02': 700 };
for (const [name, value] of Object.entries(DURATIONS)) {
  declare('duration.' + name, value, { group: 'duration' });
}

const EASINGS = {
  'standard-productive': [0.2, 0, 0.38, 0.9],
  'entrance-productive': [0, 0, 0.38, 0.9],
  'exit-productive': [0.2, 0, 1, 0.9]
};
for (const [name, value] of Object.entries(EASINGS)) {
  declare('easing.' + name, value, { group: 'easing' });
}

// Platform-restricted tokens, in both directions
declare('fluidSpacing02', '2vw', { group: 'raw', platforms: ['web'], fallback: { native: 16 } });
declare('fluidSpacing03', '5vw', { group: 'raw', platforms: ['web'], fallback: { native: 40 } });
declare('elevation.raised', 4, { group: 'raw', platforms: ['native'], fallback: { web: '0 2px 6px rgba(0,0,0,0.2)' } });


describe('unified engine - conformance against Carbon', () => {

  const light = Themer.resolve(template, [{ name: 'carbon-white', polarity: 'light' }]);

  it('should reproduce all 13 Carbon spacing steps exactly', () => {

    const CARBON_SPACING = [2, 4, 8, 12, 16, 24, 32, 40, 48, 64, 80, 96, 160];
    const gotSpacing = SPACING_MULTIPLIERS.map(function (_, i) {
      return light.tokens['spacing' + String(i + 1).padStart(2, '0')];
    });

    assert.deepEqual(gotSpacing, CARBON_SPACING);

  });

  it('should reproduce all 23 Carbon type scale steps exactly', () => {

    const CARBON_TYPE = [12, 14, 16, 18, 20, 24, 28, 32, 36, 42, 48, 54, 60, 68, 76, 84, 92, 102, 112, 122, 132, 144, 156];
    const gotType = CARBON_TYPE.map(function (_, i) {
      return light.tokens['scale' + String(i + 1).padStart(2, '0')];
    });

    assert.deepEqual(gotType, CARBON_TYPE);

  });

  it('should resolve the alias border.interactive to link.primary', () => {

    assert.equal(light.tokens['border.interactive'], '#0f62fe');

  });

});


describe('unified engine - type sets as objects', () => {

  const light = Themer.resolve(template, [{ name: 'carbon-white', polarity: 'light' }]);
  const webEmit = Themer.emit(light, template, 'web');
  const nativeEmit = Themer.emit(light, template, 'native');

  it('should keep the line height ratio on web', () => {

    assert.equal(webEmit.tokens['bodyLong02'].lineHeight, '1.5');

  });

  it('should emit an absolute line height on native', () => {

    assert.equal(nativeEmit.tokens['bodyLong02'].lineHeight, 27);
    assert.equal(nativeEmit.tokens['bodyLong02'].fontSize, 18);

  });

});


describe('unified engine - platform tiers in both directions', () => {

  const light = Themer.resolve(template, [{ name: 'carbon-white', polarity: 'light' }]);
  const webEmit = Themer.emit(light, template, 'web');
  const nativeEmit = Themer.emit(light, template, 'native');

  it('should emit web-only tokens on web and substitute on native', () => {

    assert.equal(webEmit.tokens['fluidSpacing02'], '2vw');
    assert.equal(nativeEmit.tokens['fluidSpacing02'], 16);

  });

  it('should emit native-only tokens on native and substitute on web', () => {

    assert.equal(nativeEmit.tokens['elevation.raised'], 4);
    assert.equal(webEmit.tokens['elevation.raised'], '0 2px 6px rgba(0,0,0,0.2)');

  });

  it('should emit identical key sets on both platforms', () => {

    const webKeys = Object.keys(webEmit.tokens).sort();
    const nativeKeys = Object.keys(nativeEmit.tokens).sort();

    assert.deepEqual(webKeys, nativeKeys);

    const anyUndefined = webKeys.filter(function (k) {
      return webEmit.tokens[k] === undefined || nativeEmit.tokens[k] === undefined;
    });

    assert.equal(anyUndefined.length, 0);

  });

});


describe('unified engine - density from one number', () => {

  it('should rescale every spacing token when miniUnit base changes', () => {

    for (const base of [6, 8, 10]) {
      const dense = Themer.resolve(template, [
        { name: 'carbon-white' },
        { name: 'density', scales: { miniUnit: { base: base } } }
      ]);
      const row = [1, 2, 3, 4, 5, 6, 7].map(function (i) { return dense.tokens['spacing0' + i]; });

      const expected = [0.25, 0.5, 1, 1.5, 2, 3, 4].map(function (m) { return m * base; });
      assert.deepEqual(row, expected);
    }

  });

  it('should leave the type scale untouched when only miniUnit changes', () => {

    const compact = Themer.resolve(template, [
      { name: 'x' },
      { name: 'density', scales: { miniUnit: { base: 4 } } }
    ]);

    assert.equal(compact.tokens['spacing05'], 8);
    assert.equal(compact.tokens['scale01'], 12);

  });

});


describe('unified engine - reduced motion', () => {

  it('should scale durations by the motion factor', () => {

    for (const factor of [1, 0.5, 0]) {
      const m = Themer.resolve(template, [
        { name: 'x' },
        { name: 'a11y', motion_factor: factor }
      ]);

      assert.equal(m.tokens['duration.fast-01'], 70 * factor);
      assert.equal(m.tokens['duration.moderate-01'], 150 * factor);
      assert.equal(m.tokens['duration.slow-02'], 700 * factor);
    }

  });

  it('should leave easings alone when motion factor is zero', () => {

    const stillMotion = Themer.resolve(template, [
      { name: 'x' },
      { name: 'a11y', motion_factor: 0 }
    ]);

    assert.equal(stillMotion.tokens['duration.slow-02'], 0);
    assert.deepEqual(stillMotion.tokens['easing.standard-productive'], [0.2, 0, 0.38, 0.9]);

  });

});


describe('unified engine - cascade at real depth', () => {

  const cascaded = Themer.resolve(template, [
    { name: '1-carbon-base', polarity: 'light' },
    { name: '2-brand', tokens: { 'link.primary': '#6929c4' } },
    { name: '3-super-app-shape', tokens: { 'spacing05': 20 }, scales: { miniUnit: { base: 8 } } },
    { name: '4-tenant', tokens: { 'link.primary': '#005d5d', 'text.error': '#a2191f' } },
    { name: '5-user-prefs', polarity: 'dark', motion_factor: 0.5 }
  ]);

  it('should let layer 4 override layer 2 for link.primary', () => {

    assert.equal(cascaded.tokens['link.primary'], '#005d5d');

  });

  it('should keep a pinned spacing value from layer 3', () => {

    assert.equal(cascaded.tokens['spacing05'], 20);

  });

  it('should flip polarity from layer 5', () => {

    assert.equal(cascaded.polarity, 'dark');

  });

  it('should follow polarity for rampStep rules', () => {

    assert.equal(cascaded.tokens['background'], '#161616');
    assert.equal(cascaded.tokens['text.primary'], '#ffffff');

  });

  it('should halve durations from the motion factor in layer 5', () => {

    assert.equal(cascaded.tokens['duration.slow-02'], 350);

  });

});


describe('unified engine - contrast enforcement against an explicit pin', () => {

  it('should leave a passing pin alone in light polarity', () => {

    const pinnedLight = Themer.resolve(template, [
      { name: 'tenant', polarity: 'light', tokens: { 'text.error': '#a2191f' } }
    ]);

    assert.equal(pinnedLight.tokens['text.error'], '#a2191f');

  });

  it('should snap a failing pin to a palette step in dark polarity', () => {

    const pinnedDark = Themer.resolve(template, [
      { name: 'tenant', polarity: 'dark', tokens: { 'text.error': '#a2191f' } }
    ]);

    assert.equal(pinnedDark.tokens['text.error'], '#fa4d56');

  });

  it('should report the violation and leave the value in place when mode is report', () => {

    const reported = Themer.resolve(
      template,
      [{ name: 'tenant', polarity: 'dark', tokens: { 'text.error': '#a2191f' } }],
      { contrast: 'report' }
    );

    assert.equal(reported.tokens['text.error'], '#a2191f');
    assert.equal(reported.corrections.length, 0);
    assert.equal(reported.violations.length, 1);
    assert.equal(reported.violations[0].suggested, '#fa4d56');

  });

  it('should report violations in both correct and report modes', () => {

    const pinnedDark = Themer.resolve(template, [
      { name: 'tenant', polarity: 'dark', tokens: { 'text.error': '#a2191f' } }
    ]);

    assert.equal(pinnedDark.violations.length, 1);

  });

});


describe('unified engine - failure modes', () => {

  it('should reject a two-token alias cycle', () => {

    const cyclic = JSON.parse(JSON.stringify(template));
    cyclic.tokens['a'] = '{b}';
    cyclic.tokens['b'] = '{a}';
    cyclic.meta['a'] = { group: 'colour' };
    cyclic.meta['b'] = { group: 'colour' };

    assert.throws(() => Themer.resolve(cyclic, [{ name: 'x' }]), /\[helper-themer\]/);

  });

  it('should reject an unknown scale generator', () => {

    const badScale = JSON.parse(JSON.stringify(template));
    badScale.tokens['oops'] = { scale: 'nonexistent', step: 1 };
    badScale.meta['oops'] = { group: 'dimension' };

    assert.throws(() => Themer.resolve(badScale, [{ name: 'x' }]), /\[helper-themer\]/);

  });

  it('should reject an unknown operation', () => {

    const badOp = JSON.parse(JSON.stringify(template));
    badOp.tokens['oops'] = { op: 'nope', args: [] };
    badOp.meta['oops'] = { group: 'colour' };

    assert.throws(() => Themer.resolve(badOp, [{ name: 'x' }]), /\[helper-themer\]/);

  });

  it('should reject an unknown emit platform', () => {

    const light = Themer.resolve(template, [{ name: 'x' }]);

    assert.throws(() => Themer.emit(light, template, 'flutter'), /\[helper-themer\]/);

  });

  it('should reject an alias to a missing token', () => {

    const missingAlias = JSON.parse(JSON.stringify(template));
    missingAlias.tokens['oops'] = '{does.not.exist}';
    missingAlias.meta['oops'] = { group: 'colour' };

    assert.throws(() => Themer.resolve(missingAlias, [{ name: 'x' }]), /\[helper-themer\]/);

  });

});
