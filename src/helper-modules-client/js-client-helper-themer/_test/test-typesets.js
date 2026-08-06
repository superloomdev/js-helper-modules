// Ported from lab S7-typesets: conformance of all 58 Carbon type sets
// against the engine.
//
// 36 definitions plus 22 aliases = 58 total.
// Re-keyed from camelCase to snake_case per LD13.
//
// The lab's Carbon source oracle check (parsing /tmp/carbon/...) is omitted
// because the Carbon source tree is not available in the module test
// environment. The transcribed tables below are the test data.
'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const loader = require('./loader.js');
const { Lib } = loader();
const Themer = require('helper-themer')(Lib, {});

// Scale values from Carbon packages/type/src/scale.ts

const SCALE = {
  1: 12, 2: 14, 3: 16, 4: 18, 5: 20, 6: 24, 7: 28, 8: 32,
  9: 36, 10: 42, 11: 48, 12: 54, 13: 60, 14: 68, 15: 76, 16: 84,
  17: 92, 18: 102, 19: 112, 20: 122, 21: 132, 22: 144, 23: 156
};

// The 36 definitions (base values, breakpoints excluded)

const DEFINITIONS = {
  caption01:            { step: 1,  weight: 400, line_height: 1.33333, letter_spacing: 0.32 },
  caption02:            { step: 2,  weight: 400, line_height: 1.28572, letter_spacing: 0.32 },
  label01:              { step: 1,  weight: 400, line_height: 1.33333, letter_spacing: 0.32 },
  label02:              { step: 2,  weight: 400, line_height: 1.28572, letter_spacing: 0.16 },
  helperText01:         { step: 1,                    line_height: 1.33333, letter_spacing: 0.32 },
  helperText02:         { step: 2,                    line_height: 1.28572, letter_spacing: 0.16 },
  bodyShort01:          { step: 2,  weight: 400, line_height: 1.28572, letter_spacing: 0.16 },
  bodyLong01:           { step: 2,  weight: 400, line_height: 1.42857, letter_spacing: 0.16 },
  bodyShort02:          { step: 3,  weight: 400, line_height: 1.375,   letter_spacing: 0 },
  bodyLong02:           { step: 3,  weight: 400, line_height: 1.5,     letter_spacing: 0 },
  code01:               { step: 1,  weight: 400, line_height: 1.33333, letter_spacing: 0.32, font_family: 'mono' },
  code02:               { step: 2,  weight: 400, line_height: 1.42857, letter_spacing: 0.32, font_family: 'mono' },
  heading01:            { step: 2,  weight: 600, line_height: 1.42857, letter_spacing: 0.16 },
  productiveHeading01:  { step: 2,  weight: 600, line_height: 1.28572, letter_spacing: 0.16 },
  heading02:            { step: 3,  weight: 600, line_height: 1.5,     letter_spacing: 0 },
  productiveHeading02:  { step: 3,  weight: 600, line_height: 1.375,   letter_spacing: 0 },
  productiveHeading03:  { step: 5,  weight: 400, line_height: 1.4,     letter_spacing: 0 },
  productiveHeading04:  { step: 7,  weight: 400, line_height: 1.28572, letter_spacing: 0 },
  productiveHeading05:  { step: 8,  weight: 400, line_height: 1.25,    letter_spacing: 0 },
  productiveHeading06:  { step: 10, weight: 300, line_height: 1.199,   letter_spacing: 0 },
  productiveHeading07:  { step: 12, weight: 300, line_height: 1.199,   letter_spacing: 0 },
  expressiveHeading01:  { step: 2,  weight: 600, line_height: 1.25,    letter_spacing: 0.16 },
  expressiveHeading02:  { step: 3,  weight: 600, line_height: 1.5,     letter_spacing: 0 },
  expressiveHeading03:  { step: 5,  weight: 400, line_height: 1.4,     letter_spacing: 0 },
  expressiveHeading04:  { step: 7,  weight: 400, line_height: 1.28572, letter_spacing: 0 },
  expressiveHeading05:  { step: 8,  weight: 400, line_height: 1.25,    letter_spacing: 0 },
  expressiveHeading06:  { step: 8,  weight: 600, line_height: 1.25,    letter_spacing: 0 },
  expressiveParagraph01:{ step: 6,  weight: 300, line_height: 1.334,   letter_spacing: 0 },
  quotation01:          { step: 5,  weight: 400, line_height: 1.3,     letter_spacing: 0, font_family: 'serif' },
  quotation02:          { step: 8,  weight: 300, line_height: 1.25,    letter_spacing: 0, font_family: 'serif' },
  display01:            { step: 10, weight: 300, line_height: 1.19,    letter_spacing: 0 },
  display02:            { step: 10, weight: 600, line_height: 1.19,    letter_spacing: 0 },
  display03:            { step: 10, weight: 300, line_height: 1.19,    letter_spacing: 0 },
  display04:            { step: 10, weight: 300, line_height: 1.19,    letter_spacing: 0 },
  legal01:              { step: 1,  weight: 400, line_height: 1.33333, letter_spacing: 0.32 },
  legal02:              { step: 2,  weight: 400, line_height: 1.28572, letter_spacing: 0.16 }
};

// The 22 aliases

const ALIASES = {
  bodyCompact01:    'bodyShort01',
  bodyCompact02:    'bodyShort02',
  body01:           'bodyLong01',
  body02:           'bodyLong02',
  headingCompact01: 'productiveHeading01',
  headingCompact02: 'productiveHeading02',
  heading03:        'productiveHeading03',
  heading04:        'productiveHeading04',
  heading05:        'productiveHeading05',
  heading06:        'productiveHeading06',
  heading07:        'productiveHeading07',
  fluidHeading03:   'expressiveHeading03',
  fluidHeading04:   'expressiveHeading04',
  fluidHeading05:   'expressiveHeading05',
  fluidHeading06:   'expressiveHeading06',
  fluidParagraph01: 'expressiveParagraph01',
  fluidQuotation01: 'quotation01',
  fluidQuotation02: 'quotation02',
  fluidDisplay01:   'display01',
  fluidDisplay02:   'display02',
  fluidDisplay03:   'display03',
  fluidDisplay04:   'display04'
};


// Build the template with snake_case keys

const template = {
  polarity: 'light',
  ramp: ['#ffffff', '#161616'],
  palette: {},
  scales: { base_font_size: 16, carbonType: { base: 12 } },
  tokens: {},
  meta: {},
  contrast_rules: []
};

for (const [name, def] of Object.entries(DEFINITIONS)) {
  const entry = { type_set: true };
  for (const [k, v] of Object.entries(def)) {
    entry[k] = v;
  }
  template.tokens[name] = entry;
  template.meta[name] = { group: 'typeSet' };
}

for (const [name, target] of Object.entries(ALIASES)) {
  template.tokens[name] = '{' + target + '}';
  template.meta[name] = { group: 'typeSet' };
}

const resolved = Themer.resolve(template, [{ name: 'base' }]);
const web = Themer.emit(resolved, template, 'web');
const native = Themer.emit(resolved, template, 'native');


describe('type set definitions - conformance against Carbon source', () => {

  for (const [name, src] of Object.entries(DEFINITIONS)) {
    const expectedPx = SCALE[src.step];
    const expectedWeight = src.weight;
    const expectedLH = src.line_height;
    const expectedLS = src.letter_spacing;

    it('should conform: ' + name + ' (step ' + src.step + ', ' + expectedPx + 'px)', () => {

      const rv = resolved.tokens[name];

      // Resolved values (platform-independent)
      assert.equal(rv.fontSize, expectedPx, 'fontSize');

      if (expectedWeight === undefined) {
        assert.equal('fontWeight' in rv, false, 'fontWeight should be absent');
      } else {
        assert.equal(rv.fontWeight, expectedWeight, 'fontWeight');
      }

      assert.equal(rv.lineHeight, expectedLH, 'lineHeight');
      assert.equal(rv.letterSpacing, expectedLS, 'letterSpacing');

      // Web emit
      const wv = web.tokens[name];
      assert.equal(wv.fontSize, (expectedPx / 16) + 'rem', 'web.fontSize');

      if (expectedWeight === undefined) {
        assert.equal('fontWeight' in wv, false, 'web.fontWeight should be absent');
      } else {
        assert.equal(wv.fontWeight, expectedWeight, 'web.fontWeight');
      }

      assert.equal(wv.lineHeight, String(expectedLH), 'web.lineHeight');
      assert.equal(wv.letterSpacing, expectedLS + 'px', 'web.letterSpacing');

      // Native emit
      const nv = native.tokens[name];
      assert.equal(nv.fontSize, expectedPx, 'native.fontSize');
      assert.equal(nv.lineHeight, Math.round(expectedPx * expectedLH), 'native.lineHeight');
      assert.equal(nv.letterSpacing, expectedLS, 'native.letterSpacing');

      if (expectedWeight === undefined) {
        assert.equal('fontWeight' in nv, false, 'native.fontWeight should be absent');
      } else {
        assert.equal(nv.fontWeight, String(expectedWeight), 'native.fontWeight');
      }

      // font_family token must survive resolve and both emits unchanged
      if (src.font_family === undefined) {
        assert.equal('fontFamily' in rv, false, 'resolved.fontFamily should be absent');
        assert.equal('fontFamily' in wv, false, 'web.fontFamily should be absent');
        assert.equal('fontFamily' in nv, false, 'native.fontFamily should be absent');
      } else {
        assert.equal(rv.fontFamily, src.font_family, 'resolved.fontFamily');
        assert.equal(wv.fontFamily, src.font_family, 'web.fontFamily');
        assert.equal(nv.fontFamily, src.font_family, 'native.fontFamily');
      }

    });
  }

});


describe('type set aliases - each resolves deep-equal to its target', () => {

  for (const [name, target] of Object.entries(ALIASES)) {

    it('should deep-equal: ' + name + ' -> ' + target, () => {

      assert.deepEqual(resolved.tokens[name], resolved.tokens[target]);
      assert.deepEqual(web.tokens[name], web.tokens[target]);
      assert.deepEqual(native.tokens[name], native.tokens[target]);

    });
  }

});
