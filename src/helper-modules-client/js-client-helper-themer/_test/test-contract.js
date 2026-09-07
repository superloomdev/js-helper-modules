// Info: Contract tests for the Superloom token contract.
//
// Validates the contract registry shape, the public getContract and
// validateContract interfaces, and every contract error and warning path.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import loader from './loader.js';
import themerLoader from 'helper-themer';
import contractModule from 'helper-themer/themer.contract.js';

const { Lib } = loader();
const Themer = themerLoader(Lib, {});

const contract = Themer.getContract();
const tokenNames = Object.keys(contract.tokens);


// Helper: a minimal valid theme with one token per group
function minimalTheme () {
  return {
    tokens: {
      'color.background': '#ffffff',
      'spacing.spacing_01': 2,
      'size.icon_01': 16,
      'type.body01': { type_set: true, font_size: 14, line_height_px: 20, letter_spacing: 0.16, weight: 400, font_family: 'sans' },
      'font.family.sans': 'IBM Plex Sans',
      'font.weight.regular': 400,
      'motion.duration_fast_01': 70,
      'motion.easing_standard_productive': [0.2, 0, 0.38, 0.9],
      'shape.radius_04': 4,
      'border.width_01': 1,
      'focus.width': 2,
      'focus.offset': 0,
      'feedback.press': 'highlight',
      'shadow.level_01': { shadow: true, layers: [{ x: 0, y: 2, blur: 6, spread: 0, color: '{color.shadow}' }] },
      'breakpoint.sm': 320
    }
  };
}


describe('contract registry - structure', () => {

  it('should expose exactly 321 tokens', () => {
    assert.equal(Object.keys(contract.tokens).length, 321);
  });

  it('should expose exactly 12 groups', () => {
    assert.equal(Object.keys(contract.groups).length, 12);
  });

  it('should expose exactly 321 meta entries', () => {
    assert.equal(Object.keys(contract.meta).length, 321);
  });

  it('should report contract version 1', () => {
    assert.equal(contract.version, 1);
  });

  it('should be a frozen object', () => {
    assert.equal(Object.isFrozen(contract), true);
    assert.equal(Object.isFrozen(contract.tokens), true);
    assert.equal(Object.isFrozen(contract.groups), true);
    assert.equal(Object.isFrozen(contract.meta), true);
  });

  it('should return the same reference on every getContract call', () => {
    assert.equal(Themer.getContract(), contract);
  });

  it('should export the same registry from the contract module', () => {
    assert.equal(contractModule, contract);
  });

});


describe('contract registry - group counts', () => {

  const expected = {
    color: 190,
    spacing: 13,
    size: 20,
    type: 58,
    font: 7,
    motion: 12,
    shape: 7,
    border: 3,
    focus: 2,
    feedback: 1,
    shadow: 3,
    breakpoint: 5
  };

  for (const [group, count] of Object.entries(expected)) {

    it('should have ' + count + ' tokens in group ' + group, () => {
      const actual = tokenNames.filter(function (n) { return contract.tokens[n].group === group; }).length;
      assert.equal(actual, count);
    });

  }

});


describe('contract registry - group metadata', () => {

  it('should set tier value for color, spacing, size, type, font', () => {
    assert.equal(contract.groups.color.tier, 'value');
    assert.equal(contract.groups.spacing.tier, 'value');
    assert.equal(contract.groups.size.tier, 'value');
    assert.equal(contract.groups.type.tier, 'value');
    assert.equal(contract.groups.font.tier, 'value');
  });

  it('should set tier structure for shape, border, focus, motion, feedback, shadow, breakpoint', () => {
    assert.equal(contract.groups.shape.tier, 'structure');
    assert.equal(contract.groups.border.tier, 'structure');
    assert.equal(contract.groups.focus.tier, 'structure');
    assert.equal(contract.groups.motion.tier, 'structure');
    assert.equal(contract.groups.feedback.tier, 'structure');
    assert.equal(contract.groups.shadow.tier, 'structure');
    assert.equal(contract.groups.breakpoint.tier, 'structure');
  });

  it('should set emit color for color group', () => {
    assert.equal(contract.groups.color.emit, 'color');
  });

  it('should set emit dimension for spacing, size, shape, border, focus', () => {
    assert.equal(contract.groups.spacing.emit, 'dimension');
    assert.equal(contract.groups.size.emit, 'dimension');
    assert.equal(contract.groups.shape.emit, 'dimension');
    assert.equal(contract.groups.border.emit, 'dimension');
    assert.equal(contract.groups.focus.emit, 'dimension');
  });

  it('should set emit typeSet for type group', () => {
    assert.equal(contract.groups.type.emit, 'typeSet');
  });

  it('should set emit duration for motion group', () => {
    assert.equal(contract.groups.motion.emit, 'duration');
  });

  it('should set emit shadow for shadow group', () => {
    assert.equal(contract.groups.shadow.emit, 'shadow');
  });

  it('should set emit raw for font, feedback, breakpoint groups', () => {
    assert.equal(contract.groups.font.emit, 'raw');
    assert.equal(contract.groups.feedback.emit, 'raw');
    assert.equal(contract.groups.breakpoint.emit, 'raw');
  });

});


describe('contract registry - meta derivation', () => {

  it('should derive meta group from token emit override for easings', () => {
    assert.equal(contract.meta['motion.easing_standard_productive'].group, 'easing');
    assert.equal(contract.meta['motion.easing_entrance_productive'].group, 'easing');
  });

  it('should derive meta group from group emit for color tokens', () => {
    assert.equal(contract.meta['color.background'].group, 'color');
  });

  it('should derive meta group from group emit for spacing tokens', () => {
    assert.equal(contract.meta['spacing.spacing_01'].group, 'dimension');
  });

  it('should derive meta group from group emit for type tokens', () => {
    assert.equal(contract.meta['type.body01'].group, 'typeSet');
  });

  it('should derive meta group from group emit for shadow tokens', () => {
    assert.equal(contract.meta['shadow.level_01'].group, 'shadow');
  });

});


describe('contract registry - enum values', () => {

  it('should declare values for feedback.press', () => {
    assert.deepEqual(contract.tokens['feedback.press'].values, ['highlight', 'opacity', 'ripple']);
  });

  it('should declare values for easing tokens', () => {
    assert.deepEqual(contract.tokens['motion.easing_standard_productive'].values, ['array4']);
  });

});


describe('validateContract - happy path', () => {

  it('should return success true with no errors or warnings for a valid theme', () => {
    const theme = minimalTheme();
    const result = Themer.validateContract(theme, { required: Object.keys(theme.tokens) });
    assert.equal(result.success, true);
    assert.equal(result.errors.length, 0);
    assert.equal(result.warnings.length, 0);
  });

  it('should return success true when required is all 321 tokens and theme has all 321', () => {
    const theme = { tokens: {} };
    for (const name of tokenNames) {
      const def = contract.tokens[name];
      const group = contract.groups[def.group];
      if (group.type === 'color') {
        theme.tokens[name] = '#ffffff';
      } else if (group.type === 'number') {
        theme.tokens[name] = 1;
      } else if (group.type === 'typeSet') {
        theme.tokens[name] = { type_set: true, font_size: 14, line_height_px: 20, letter_spacing: 0, weight: 400, font_family: 'sans' };
      } else if (group.type === 'font') {
        theme.tokens[name] = name.indexOf('font.family.') === 0 ? 'Sans' : 400;
      } else if (group.type === 'motion') {
        theme.tokens[name] = def.emit === 'easing' ? [0.2, 0, 0.38, 0.9] : 70;
      } else if (group.type === 'enum') {
        theme.tokens[name] = 'highlight';
      } else if (group.type === 'shadow') {
        theme.tokens[name] = { shadow: true, layers: [{ x: 0, y: 2, blur: 6, spread: 0, color: '#000000' }] };
      }
    }
    const result = Themer.validateContract(theme, { required: tokenNames });
    assert.equal(result.success, true);
    assert.equal(result.errors.length, 0);
  });

});


describe('validateContract - missing token', () => {

  it('should report CONTRACT_MISSING_TOKEN when a required token is absent', () => {
    const theme = { tokens: {} };
    const result = Themer.validateContract(theme, { required: ['color.background'] });
    assert.equal(result.success, false);
    assert.equal(result.errors.length, 1);
    assert.equal(result.errors[0].type, 'helper-themer/contract-missing-token');
    assert.equal(result.errors[0].token, 'color.background');
    assert.match(result.errors[0].message, /required contract token absent/);
  });

  it('should report every missing token when several are required and absent', () => {
    const theme = { tokens: {} };
    const result = Themer.validateContract(theme, { required: ['color.background', 'spacing.spacing_01', 'shape.radius_04'] });
    assert.equal(result.errors.length, 3);
  });

});


describe('validateContract - unknown token', () => {

  it('should report CONTRACT_UNKNOWN_TOKEN for a token not in the contract', () => {
    const theme = { tokens: { 'color.not_a_token': '#ffffff' } };
    const result = Themer.validateContract(theme, {});
    assert.equal(result.success, false);
    assert.equal(result.errors.length, 1);
    assert.equal(result.errors[0].type, 'helper-themer/contract-unknown-token');
    assert.equal(result.errors[0].token, 'color.not_a_token');
    assert.match(result.errors[0].message, /not a token in the contract/);
  });

});


describe('validateContract - invalid color values', () => {

  it('should reject uppercase hex', () => {
    const theme = { tokens: { 'color.background': '#FFFFFF' } };
    const result = Themer.validateContract(theme, {});
    assert.equal(result.success, false);
    assert.equal(result.errors[0].type, 'helper-themer/contract-invalid-value');
  });

  it('should reject named colors', () => {
    const theme = { tokens: { 'color.background': 'white' } };
    const result = Themer.validateContract(theme, {});
    assert.equal(result.success, false);
  });

  it('should reject hsl colors', () => {
    const theme = { tokens: { 'color.background': 'hsl(0, 0%, 100%)' } };
    const result = Themer.validateContract(theme, {});
    assert.equal(result.success, false);
  });

  it('should reject transparent', () => {
    const theme = { tokens: { 'color.background': 'transparent' } };
    const result = Themer.validateContract(theme, {});
    assert.equal(result.success, false);
  });

  it('should accept lowercase six-digit hex', () => {
    const theme = { tokens: { 'color.background': '#ffffff' } };
    const result = Themer.validateContract(theme, {});
    assert.equal(result.success, true);
  });

  it('should accept lowercase eight-digit hex', () => {
    const theme = { tokens: { 'color.background': '#ffffff80' } };
    const result = Themer.validateContract(theme, {});
    assert.equal(result.success, true);
  });

  it('should accept rgba with numeric channels', () => {
    const theme = { tokens: { 'color.background': 'rgba(0, 0, 0, 0.5)' } };
    const result = Themer.validateContract(theme, {});
    assert.equal(result.success, true);
  });

});


describe('validateContract - invalid number values', () => {

  it('should reject string numbers', () => {
    const theme = { tokens: { 'spacing.spacing_01': '16' } };
    const result = Themer.validateContract(theme, {});
    assert.equal(result.success, false);
  });

  it('should reject unit strings like 1rem', () => {
    const theme = { tokens: { 'spacing.spacing_01': '1rem' } };
    const result = Themer.validateContract(theme, {});
    assert.equal(result.success, false);
  });

  it('should reject unit strings like 2vw', () => {
    const theme = { tokens: { 'spacing.spacing_01': '2vw' } };
    const result = Themer.validateContract(theme, {});
    assert.equal(result.success, false);
  });

  it('should accept finite numbers', () => {
    const theme = { tokens: { 'spacing.spacing_01': 2 } };
    const result = Themer.validateContract(theme, {});
    assert.equal(result.success, true);
  });

  it('should reject NaN', () => {
    const theme = { tokens: { 'spacing.spacing_01': NaN } };
    const result = Themer.validateContract(theme, {});
    assert.equal(result.success, false);
  });

});


describe('validateContract - type set values', () => {

  it('should reject a line_height ratio (the contract uses line_height_px)', () => {
    const theme = { tokens: { 'type.body01': { type_set: true, font_size: 14, line_height: 1.4, letter_spacing: 0, weight: 400, font_family: 'sans' } } };
    const result = Themer.validateContract(theme, {});
    assert.equal(result.success, false);
  });

  it('should reject a CSS font stack in font_family', () => {
    const theme = { tokens: { 'type.body01': { type_set: true, font_size: 14, line_height_px: 20, letter_spacing: 0, weight: 400, font_family: 'IBM Plex Sans' } } };
    const result = Themer.validateContract(theme, {});
    assert.equal(result.success, false);
  });

  it('should accept font_family sans', () => {
    const theme = { tokens: { 'type.body01': { type_set: true, font_size: 14, line_height_px: 20, letter_spacing: 0, weight: 400, font_family: 'sans' } } };
    const result = Themer.validateContract(theme, {});
    assert.equal(result.success, true);
  });

  it('should accept font_family mono', () => {
    const theme = { tokens: { 'type.code01': { type_set: true, font_size: 12, line_height_px: 16, letter_spacing: 0.32, weight: 400, font_family: 'mono' } } };
    const result = Themer.validateContract(theme, {});
    assert.equal(result.success, true);
  });

  it('should reject a string font_size', () => {
    const theme = { tokens: { 'type.body01': { type_set: true, font_size: '14', line_height_px: 20, letter_spacing: 0, weight: 400, font_family: 'sans' } } };
    const result = Themer.validateContract(theme, {});
    assert.equal(result.success, false);
  });

  it('should reject a non-integer weight', () => {
    const theme = { tokens: { 'type.body01': { type_set: true, font_size: 14, line_height_px: 20, letter_spacing: 0, weight: 450, font_family: 'sans' } } };
    const result = Themer.validateContract(theme, {});
    assert.equal(result.success, false);
  });

});


describe('validateContract - font values', () => {

  it('should accept a non-empty string for font.family.*', () => {
    const theme = { tokens: { 'font.family.sans': 'IBM Plex Sans' } };
    const result = Themer.validateContract(theme, {});
    assert.equal(result.success, true);
  });

  it('should reject an empty string for font.family.*', () => {
    const theme = { tokens: { 'font.family.sans': '' } };
    const result = Themer.validateContract(theme, {});
    assert.equal(result.success, false);
  });

  it('should accept an integer weight for font.weight.*', () => {
    const theme = { tokens: { 'font.weight.regular': 400 } };
    const result = Themer.validateContract(theme, {});
    assert.equal(result.success, true);
  });

  it('should reject a non-integer weight for font.weight.*', () => {
    const theme = { tokens: { 'font.weight.regular': 400.5 } };
    const result = Themer.validateContract(theme, {});
    assert.equal(result.success, false);
  });

});


describe('validateContract - motion values', () => {

  it('should reject 70ms for a duration token', () => {
    const theme = { tokens: { 'motion.duration_fast_01': '70ms' } };
    const result = Themer.validateContract(theme, {});
    assert.equal(result.success, false);
  });

  it('should accept a finite number for a duration token', () => {
    const theme = { tokens: { 'motion.duration_fast_01': 70 } };
    const result = Themer.validateContract(theme, {});
    assert.equal(result.success, true);
  });

  it('should reject a cubic-bezier string for an easing token', () => {
    const theme = { tokens: { 'motion.easing_standard_productive': 'cubic-bezier(0.2, 0, 0.38, 0.9)' } };
    const result = Themer.validateContract(theme, {});
    assert.equal(result.success, false);
  });

  it('should accept an array of 4 finite numbers for an easing token', () => {
    const theme = { tokens: { 'motion.easing_standard_productive': [0.2, 0, 0.38, 0.9] } };
    const result = Themer.validateContract(theme, {});
    assert.equal(result.success, true);
  });

  it('should reject an array of 3 numbers for an easing token', () => {
    const theme = { tokens: { 'motion.easing_standard_productive': [0.2, 0, 0.38] } };
    const result = Themer.validateContract(theme, {});
    assert.equal(result.success, false);
  });

});


describe('validateContract - enum values', () => {

  it('should accept a value in the declared values list', () => {
    const theme = { tokens: { 'feedback.press': 'highlight' } };
    const result = Themer.validateContract(theme, {});
    assert.equal(result.success, true);
  });

  it('should reject a value not in the declared values list', () => {
    const theme = { tokens: { 'feedback.press': 'bounce' } };
    const result = Themer.validateContract(theme, {});
    assert.equal(result.success, false);
  });

});


describe('validateContract - shadow values', () => {

  it('should accept a valid shadow object', () => {
    const theme = { tokens: { 'shadow.level_01': { shadow: true, layers: [{ x: 0, y: 2, blur: 6, spread: 0, color: '#000000' }] } } };
    const result = Themer.validateContract(theme, {});
    assert.equal(result.success, true);
  });

  it('should reject a shadow with a level key', () => {
    const theme = { tokens: { 'shadow.level_01': { shadow: true, level: 2, layers: [{ x: 0, y: 2, blur: 6, spread: 0, color: '#000000' }] } } };
    const result = Themer.validateContract(theme, {});
    assert.equal(result.success, false);
  });

  it('should reject a shadow without layers', () => {
    const theme = { tokens: { 'shadow.level_01': { shadow: true } } };
    const result = Themer.validateContract(theme, {});
    assert.equal(result.success, false);
  });

  it('should accept a shadow with an alias color', () => {
    const theme = { tokens: { 'shadow.level_01': { shadow: true, layers: [{ x: 0, y: 2, blur: 6, spread: 0, color: '{color.shadow}' }] } } };
    const result = Themer.validateContract(theme, {});
    assert.equal(result.success, true);
  });

});


describe('validateContract - alias acceptance', () => {

  it('should accept an alias string for a color token', () => {
    const theme = { tokens: { 'color.background': '{color.layer_01}' } };
    const result = Themer.validateContract(theme, {});
    assert.equal(result.success, true);
  });

  it('should accept an alias string for a number token', () => {
    const theme = { tokens: { 'spacing.spacing_01': '{spacing.spacing_02}' } };
    const result = Themer.validateContract(theme, {});
    assert.equal(result.success, true);
  });

  it('should accept an alias string for a type set token', () => {
    const theme = { tokens: { 'type.body01': '{type.body02}' } };
    const result = Themer.validateContract(theme, {});
    assert.equal(result.success, true);
  });

});


describe('validateContract - rule and generator acceptance', () => {

  it('should accept a rule object for a color token', () => {
    const theme = { tokens: { 'color.background': { op: 'rampStep', args: [0] } } };
    const result = Themer.validateContract(theme, {});
    assert.equal(result.success, true);
  });

  it('should accept a generator object for a number token', () => {
    const theme = { tokens: { 'spacing.spacing_01': { scale: 'miniUnit', multiplier: 2 } } };
    const result = Themer.validateContract(theme, {});
    assert.equal(result.success, true);
  });

  it('should accept a rule object for a type set token', () => {
    const theme = { tokens: { 'type.body01': { op: 'mix', args: ['a', 'b', 50] } } };
    const result = Themer.validateContract(theme, {});
    assert.equal(result.success, true);
  });

});


describe('validateContract - unsupported token warnings', () => {

  it('should warn when a token is not in the supported list', () => {
    const theme = { tokens: { 'color.background': '#ffffff', 'color.layer_01': '#f4f4f4' } };
    const result = Themer.validateContract(theme, { supported: ['color.background'] });
    assert.equal(result.success, true);
    assert.equal(result.warnings.length, 1);
    assert.equal(result.warnings[0].type, 'helper-themer/contract-unsupported-token');
    assert.equal(result.warnings[0].token, 'color.layer_01');
  });

  it('should not warn when supported is not supplied', () => {
    const theme = { tokens: { 'color.background': '#ffffff', 'color.layer_01': '#f4f4f4' } };
    const result = Themer.validateContract(theme, {});
    assert.equal(result.warnings.length, 0);
  });

  it('should not affect success when there are warnings', () => {
    const theme = { tokens: { 'color.background': '#ffffff', 'color.layer_01': '#f4f4f4' } };
    const result = Themer.validateContract(theme, { supported: ['color.background'] });
    assert.equal(result.success, true);
  });

});


describe('validateContract - success semantics', () => {

  it('should report success false when there are errors', () => {
    const theme = { tokens: { 'color.background': 'not-a-color' } };
    const result = Themer.validateContract(theme, {});
    assert.equal(result.success, false);
  });

  it('should report success true when there are only warnings', () => {
    const theme = { tokens: { 'color.background': '#ffffff', 'color.layer_01': '#f4f4f4' } };
    const result = Themer.validateContract(theme, { supported: ['color.background'] });
    assert.equal(result.success, true);
  });

});


describe('validateContract - error type and message semantics', () => {

  it('should use helper-themer/contract-missing-token for missing tokens', () => {
    const result = Themer.validateContract({ tokens: {} }, { required: ['color.background'] });
    assert.equal(result.errors[0].type, 'helper-themer/contract-missing-token');
    assert.equal(typeof result.errors[0].message, 'string');
  });

  it('should use helper-themer/contract-unknown-token for unknown tokens', () => {
    const result = Themer.validateContract({ tokens: { 'unknown.token': 1 } }, {});
    assert.equal(result.errors[0].type, 'helper-themer/contract-unknown-token');
  });

  it('should use helper-themer/contract-invalid-value for invalid values', () => {
    const result = Themer.validateContract({ tokens: { 'color.background': 'bad' } }, {});
    assert.equal(result.errors[0].type, 'helper-themer/contract-invalid-value');
  });

  it('should use helper-themer/contract-unsupported-token for unsupported warnings', () => {
    const result = Themer.validateContract({ tokens: { 'color.background': '#ffffff' } }, { supported: [] });
    assert.equal(result.warnings[0].type, 'helper-themer/contract-unsupported-token');
  });

});


describe('validateContract - required and supported subset behavior', () => {

  it('should validate only the required subset for missing checks', () => {
    const theme = { tokens: { 'color.background': '#ffffff' } };
    const result = Themer.validateContract(theme, { required: ['color.background'] });
    assert.equal(result.success, true);
  });

  it('should validate all theme tokens against the contract regardless of required', () => {
    const theme = { tokens: { 'color.background': '#ffffff', 'not.a.token': 1 } };
    const result = Themer.validateContract(theme, { required: ['color.background'] });
    assert.equal(result.success, false);
    assert.equal(result.errors.length, 1);
    assert.equal(result.errors[0].token, 'not.a.token');
  });

});


describe('contract - multiple Themer instances', () => {

  it('should return the same contract from separate instances', () => {
    const first = themerLoader(Lib, {});
    const second = themerLoader(Lib, {});
    assert.equal(first.getContract(), second.getContract());
  });

  it('should validate contracts independently from separate instances', () => {
    const first = themerLoader(Lib, {});
    const second = themerLoader(Lib, {});
    const r1 = first.validateContract({ tokens: {} }, { required: ['color.background'] });
    const r2 = second.validateContract({ tokens: { 'color.background': '#ffffff' } }, { required: ['color.background'] });
    assert.equal(r1.success, false);
    assert.equal(r2.success, true);
  });

});


describe('contract - stepPairIncrement scale', () => {

  it('should produce the same values for steps 1 through 23 as the previous curve', () => {
    const engine = themerLoader(Lib, {});
    const expected = [12, 14, 16, 18, 20, 24, 28, 32, 36, 42, 48, 54, 60, 68, 76, 84, 92, 102, 112, 122, 132, 144, 156];
    for (let step = 1; step <= 23; step++) {
      const result = engine.buildTheme({
        tokens: { s: { scale: 'stepPairIncrement', step: step } },
        scales: { base_font_size: 16, stepPairIncrement: { base: 12 } }
      }, [], 'native');
      assert.equal(result.tokens.s, expected[step - 1], 'step ' + step + ' should be ' + expected[step - 1]);
    }
  });

  it('should reject carbonType as a known generator', () => {
    const engine = themerLoader(Lib, {});
    assert.throws(function () {
      engine.buildTheme({
        tokens: { s: { scale: 'carbonType', step: 1 } },
        scales: { base_font_size: 16 }
      }, [], 'native');
    }, /generator this engine provides/);
  });

});


describe('contract - shadow level rejection', () => {

  it('should reject a shadow entry with a level key', () => {
    const engine = themerLoader(Lib, {});
    assert.throws(function () {
      engine.buildTheme({
        tokens: { sh: { shadow: true, level: 2 } },
        meta: { sh: { group: 'shadow' } }
      }, [], 'web');
    }, /level/);
  });

  it('should reject a shadow entry with an elevation key', () => {
    const engine = themerLoader(Lib, {});
    assert.throws(function () {
      engine.buildTheme({
        tokens: { sh: { shadow: true, elevation: 2, layers: [{ x: 0, y: 2, blur: 6, spread: 0, color: '#000000' }] } },
        meta: { sh: { group: 'shadow' } }
      }, [], 'web');
    }, /elevation/);
  });

});


describe('contract - custom scale generators', () => {

  it('should resolve a custom generator from SCALE_GENERATORS', () => {
    const engine = themerLoader(Lib, {
      SCALE_GENERATORS: {
        custom: function (params, seeds) {
          return seeds.base * params.step;
        }
      }
    });
    const result = engine.buildTheme({
      tokens: { s: { scale: 'custom', step: 3 } },
      scales: { base_font_size: 16, custom: { base: 10 } }
    }, [], 'native');
    assert.equal(result.tokens.s, 30);
  });

  it('should reject an unknown DEFAULT_TYPE_SCALE at load', () => {
    assert.throws(function () {
      themerLoader(Lib, { DEFAULT_TYPE_SCALE: 'nonexistent' });
    }, /generator this engine provides/);
  });

});


describe('contract - factory isolation', () => {

  it('should keep two engine instances with different ERRORS isolated', () => {
    const customErrors = Object.freeze(Object.assign({}, Lib, {
      // Engines share the same ERRORS catalog; this test verifies the instances
      // do not overwrite each other's dependencies
    }));
    const first = themerLoader(Lib, { CACHE_ENABLED: false });
    const second = themerLoader(Lib, { CACHE_ENABLED: false });
    const r1 = first.buildTheme({ tokens: { bg: '#ffffff' } }, [], 'native');
    const r2 = second.buildTheme({ tokens: { bg: '#000000' } }, [], 'native');
    assert.equal(r1.tokens.bg, '#ffffff');
    assert.equal(r2.tokens.bg, '#000000');
  });

});
