// Ported from lab S8-failures: failure-path case matrix and throw-message
// conformance.
//
// Every case asserts two things: the engine throws, and the message starts
// with [helper-themer], which is the framework's programmer-error format.
//
// Re-keyed from camelCase to snake_case per LD13.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import loader from './loader.js';
import themerLoader from 'helper-themer';

const { Lib } = loader();
const Themer = themerLoader(Lib, {});

const PREFIX = /^TypeError: \[helper-themer\] /;


// A minimal valid template reused as the base for many cases.

function baseTemplate () {

  return {
    polarity: 'light',
    ramp: ['#ffffff', '#f4f4f4', '#e0e0e0', '#c6c6c6', '#a8a8a8', '#8d8d8d', '#6f6f6f', '#525252', '#393939', '#262626', '#161616'],
    palette: { red60: '#da1e28' },
    scales: { base_font_size: 16, miniUnit: { base: 8 }, carbonType: { base: 12 } },
    tokens: {
      background: { op: 'rampStep', args: [0] },
      textPrimary: { op: 'rampStep', args: [10] }
    },
    meta: {
      background: { group: 'color' },
      textPrimary: { group: 'color' }
    },
    contrast_rules: [['textPrimary', 'background', 4.5]]
  };

}


describe('failure matrix - structural', () => {

  it('should reject a 2-token alias cycle', () => {

    const t = baseTemplate();
    t.tokens.a = '{b}';
    t.tokens.b = '{a}';
    t.meta.a = { group: 'color' };
    t.meta.b = { group: 'color' };

    assert.throws(() => Themer.resolve(t, []), PREFIX);

  });

  it('should reject a 3-token alias cycle', () => {

    const t = baseTemplate();
    t.tokens.a = '{b}';
    t.tokens.b = '{c}';
    t.tokens.c = '{a}';
    t.meta.a = { group: 'color' };
    t.meta.b = { group: 'color' };
    t.meta.c = { group: 'color' };

    assert.throws(() => Themer.resolve(t, []), PREFIX);

  });

  it('should reject an alias to a missing token', () => {

    const t = baseTemplate();
    t.tokens.x = '{nonexistent}';
    t.meta.x = { group: 'color' };

    assert.throws(() => Themer.resolve(t, []), PREFIX);

  });

  it('should reject an unrecognized entry shape', () => {

    const t = baseTemplate();
    t.tokens.weird = { foo: 'bar' };
    t.meta.weird = { group: 'raw' };

    assert.throws(() => Themer.resolve(t, []), PREFIX);

  });

});


describe('failure matrix - scale and operation', () => {

  it('should reject an unknown scale name', () => {

    const t = baseTemplate();
    t.tokens.badScale = { scale: 'nonexistent', step: 1 };
    t.meta.badScale = { group: 'dimension' };

    assert.throws(() => Themer.resolve(t, []), PREFIX);

  });

  it('should reject an unknown operation name', () => {

    const t = baseTemplate();
    t.tokens.badOp = { op: 'nonexistent', args: [] };
    t.meta.badOp = { group: 'color' };

    assert.throws(() => Themer.resolve(t, []), PREFIX);

  });

  it('should reject an unknown palette entry', () => {

    const t = baseTemplate();
    t.tokens.badHue = { op: 'hue', args: ['blue', 99] };
    t.meta.badHue = { group: 'color' };

    assert.throws(() => Themer.resolve(t, []), PREFIX);

  });

});


describe('failure matrix - platform', () => {

  it('should reject an unknown emit platform', () => {

    const t = baseTemplate();
    const r = Themer.resolve(t, []);

    assert.throws(() => Themer.emit(r, t, 'ios'), PREFIX);

  });

  it('should substitute with null when a non-universal token has no fallback', () => {

    const t = baseTemplate();
    t.tokens.webOnly = '2vw';
    t.meta.webOnly = { group: 'raw', platforms: ['web'] };

    const r = Themer.resolve(t, []);
    const native = Themer.emit(r, t, 'native');

    assert.equal(native.tokens.webOnly, null);
    assert.equal(native.substituted.length, 1);
    assert.equal(native.substituted[0].token, 'webOnly');

  });

});


describe('failure matrix - out-of-range numerics', () => {

  it('should reject a negative miniUnit base', () => {

    const t = baseTemplate();
    t.scales.miniUnit.base = -8;
    t.tokens.sp = { scale: 'miniUnit', multiplier: 1 };
    t.meta.sp = { group: 'dimension' };

    assert.throws(() => Themer.resolve(t, []), PREFIX);

  });

  it('should reject a zero base font size', () => {

    const t = baseTemplate();
    t.scales.base_font_size = 0;

    assert.throws(() => Themer.resolve(t, []), PREFIX);

  });

  it('should reject a negative line height', () => {

    const t = baseTemplate();
    t.tokens.badType = { type_set: true, step: 1, weight: 400, line_height: -1.2, letter_spacing: 0 };
    t.meta.badType = { group: 'typeSet' };

    assert.throws(() => Themer.resolve(t, []), PREFIX);

  });

  it('should reject a motion factor below 0', () => {

    const t = baseTemplate();

    assert.throws(() => Themer.resolve(t, [{ motion_factor: -0.5 }]), PREFIX);

  });

  it('should reject a motion factor above 1', () => {

    const t = baseTemplate();

    assert.throws(() => Themer.resolve(t, [{ motion_factor: 1.5 }]), PREFIX);

  });

  it('should reject a contrast min ratio above 21', () => {

    const t = baseTemplate();
    t.contrast_rules = [['textPrimary', 'background', 25]];

    assert.throws(() => Themer.resolve(t, []), PREFIX);

  });

});


describe('failure matrix - argument shape', () => {

  it('should reject a null template', () => {

    assert.throws(() => Themer.resolve(null, []), PREFIX);

  });

  it('should reject layers that are not an array', () => {

    const t = baseTemplate();

    assert.throws(() => Themer.resolve(t, {}), PREFIX);

  });

  it('should reject a layer that is not an object', () => {

    const t = baseTemplate();

    assert.throws(() => Themer.resolve(t, ['bad-string']), PREFIX);

  });

  it('should reject a template with missing tokens', () => {

    const t = baseTemplate();
    delete t.tokens;

    assert.throws(() => Themer.resolve(t, []), PREFIX);

  });

});
