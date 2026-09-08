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

  it('should expose exactly 379 tokens', () => {
    assert.equal(Object.keys(contract.tokens).length, 379);
  });

  it('should expose exactly 15 groups', () => {
    assert.equal(Object.keys(contract.groups).length, 15);
  });

  it('should expose exactly 379 meta entries', () => {
    assert.equal(Object.keys(contract.meta).length, 379);
  });

  it('should report contract version 2', () => {
    assert.equal(contract.version, 2);
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
    spacing: 17,
    size: 22,
    type: 58,
    font: 12,
    motion: 29,
    shape: 9,
    border: 4,
    focus: 2,
    feedback: 2,
    shadow: 5,
    breakpoint: 5,
    grid: 13,
    state: 6,
    tint: 5
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

  it('should return success true when required is all 379 tokens and theme has all 379', () => {
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
        if (def.emit === 'easing') {
          theme.tokens[name] = [0.2, 0, 0.38, 0.9];
        } else if (def.emit === 'spring') {
          theme.tokens[name] = { spring: true, stiffness: 700, damping: 47.62, mass: 1 };
        } else {
          theme.tokens[name] = 70;
        }
      } else if (group.type === 'enum') {
        theme.tokens[name] = contract.tokens[name].values[0];
      } else if (group.type === 'shadow') {
        theme.tokens[name] = { shadow: true, layers: [{ x: 0, y: 2, blur: 6, spread: 0, color: '#000000' }] };
      }
      if (def.emit === 'viewport') {
        theme.tokens[name] = { viewport: true, vw: 2 };
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
    assert.equal(result.errors[0].code, 'CONTRACT_MISSING_TOKEN');
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
    assert.equal(result.errors[0].code, 'CONTRACT_UNKNOWN_TOKEN');
    assert.equal(result.errors[0].token, 'color.not_a_token');
    assert.match(result.errors[0].message, /not a token in the contract/);
  });

});


describe('validateContract - invalid color values', () => {

  it('should reject uppercase hex', () => {
    const theme = { tokens: { 'color.background': '#FFFFFF' } };
    const result = Themer.validateContract(theme, {});
    assert.equal(result.success, false);
    assert.equal(result.errors[0].code, 'CONTRACT_INVALID_VALUE');
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
    assert.equal(result.warnings[0].code, 'CONTRACT_UNSUPPORTED_TOKEN');
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
    assert.equal(result.errors[0].code, 'CONTRACT_MISSING_TOKEN');
    assert.equal(typeof result.errors[0].message, 'string');
  });

  it('should use helper-themer/contract-unknown-token for unknown tokens', () => {
    const result = Themer.validateContract({ tokens: { 'unknown.token': 1 } }, {});
    assert.equal(result.errors[0].code, 'CONTRACT_UNKNOWN_TOKEN');
  });

  it('should use helper-themer/contract-invalid-value for invalid values', () => {
    const result = Themer.validateContract({ tokens: { 'color.background': 'bad' } }, {});
    assert.equal(result.errors[0].code, 'CONTRACT_INVALID_VALUE');
  });

  it('should use helper-themer/contract-unsupported-token for unsupported warnings', () => {
    const result = Themer.validateContract({ tokens: { 'color.background': '#ffffff' } }, { supported: [] });
    assert.equal(result.warnings[0].code, 'CONTRACT_UNSUPPORTED_TOKEN');
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


describe('contract - CP1 repair', () => {

  it('should return code, token, and message on a missing token entry', () => {
    assert.deepEqual(
      Themer.validateContract({ tokens: {} }, { required: ['color.background'] }).errors[0],
      { code: 'CONTRACT_MISSING_TOKEN', token: 'color.background', message: '[helper-themer] color.background is a required contract token absent from the theme' }
    );
  });

  it('should return code CONTRACT_UNKNOWN_TOKEN on an unknown token entry', () => {
    const result = Themer.validateContract({ tokens: { 'color.not_a_token': '#ffffff' } }, {});
    assert.deepEqual(
      result.errors[0],
      { code: 'CONTRACT_UNKNOWN_TOKEN', token: 'color.not_a_token', message: '[helper-themer] color.not_a_token is not a token in the contract' }
    );
  });

  it('should return code CONTRACT_INVALID_VALUE on an invalid literal entry', () => {
    const result = Themer.validateContract({ tokens: { 'color.background': '#FFFFFF' } }, {});
    assert.deepEqual(
      result.errors[0],
      { code: 'CONTRACT_INVALID_VALUE', token: 'color.background', message: '[helper-themer] color.background is not a valid value for this token type' }
    );
  });

  it('should return code CONTRACT_UNSUPPORTED_TOKEN on a warning entry', () => {
    const result = Themer.validateContract(
      { tokens: { 'color.background': '#ffffff' } },
      { supported: [] }
    );
    assert.deepEqual(
      result.warnings[0],
      { code: 'CONTRACT_UNSUPPORTED_TOKEN', token: 'color.background', message: '[helper-themer] color.background is not supported by this component system' }
    );
  });

  it('should carry no type field on any entry', () => {
    const missingResult = Themer.validateContract({ tokens: {} }, { required: ['color.background'] });
    const unsupportedResult = Themer.validateContract(
      { tokens: { 'color.background': '#ffffff' } },
      { supported: [] }
    );
    assert.equal(Object.prototype.hasOwnProperty.call(missingResult.errors[0], 'type'), false);
    assert.equal(Object.prototype.hasOwnProperty.call(unsupportedResult.warnings[0], 'type'), false);
  });

  it('should expose contract errors as type and message objects', async () => {
    const ERRORS = (await import('helper-themer/themer.errors.js')).default;
    const kebabs = {
      CONTRACT_MISSING_TOKEN: 'missing-token',
      CONTRACT_UNKNOWN_TOKEN: 'unknown-token',
      CONTRACT_INVALID_VALUE: 'invalid-value',
      CONTRACT_UNSUPPORTED_TOKEN: 'unsupported-token'
    };
    for (const key of Object.keys(kebabs)) {
      assert.equal(ERRORS[key].type, 'helper-themer/contract-' + kebabs[key]);
      assert.equal(typeof ERRORS[key].message, 'string');
    }
  });

  it('should throw when theme is not a plain object', () => {
    assert.throws(() => Themer.validateContract(null, {}), /^TypeError: \[helper-themer\] theme must be a plain object$/);
    assert.throws(() => Themer.validateContract([], {}), /^TypeError: \[helper-themer\] theme must be a plain object$/);
  });

  it('should throw when theme.tokens is not a plain object', () => {
    assert.throws(() => Themer.validateContract({ tokens: [] }, {}), /^TypeError: \[helper-themer\] theme\.tokens must be a plain object$/);
  });

  it('should throw when options.required is not an array of strings', () => {
    assert.throws(() => Themer.validateContract({ tokens: {} }, { required: 'color.background' }), /^TypeError: \[helper-themer\] options\.required must be an array of strings$/);
    assert.throws(() => Themer.validateContract({ tokens: {} }, { required: [1] }), /^TypeError: \[helper-themer\] options\.required must be an array of strings$/);
  });

  it('should throw when options.supported is not an array of strings', () => {
    assert.throws(() => Themer.validateContract({ tokens: {} }, { supported: 'color.background' }), /^TypeError: \[helper-themer\] options\.supported must be an array of strings$/);
    assert.throws(() => Themer.validateContract({ tokens: {} }, { supported: new Set() }), /^TypeError: \[helper-themer\] options\.supported must be an array of strings$/);
  });

  it('should reject a type set missing line_height_px', () => {
    const result = Themer.validateContract({
      tokens: { 'type.body01': { type_set: true, font_size: 14, letter_spacing: 0.16, weight: 400, font_family: 'sans' } }
    }, {});
    assert.equal(result.success, false);
    assert.equal(result.errors[0].code, 'CONTRACT_INVALID_VALUE');
  });

  it('should reject a type set missing letter_spacing, weight, or font_family', () => {
    const withoutLetterSpacing = { type_set: true, font_size: 14, line_height_px: 20, weight: 400, font_family: 'sans' };
    delete withoutLetterSpacing.letter_spacing;
    const withoutWeight = { type_set: true, font_size: 14, line_height_px: 20, letter_spacing: 0.16, font_family: 'sans' };
    delete withoutWeight.weight;
    const withoutFamily = { type_set: true, font_size: 14, line_height_px: 20, letter_spacing: 0.16, weight: 400 };
    delete withoutFamily.font_family;
    for (const value of [withoutLetterSpacing, withoutWeight, withoutFamily]) {
      const result = Themer.validateContract({ tokens: { 'type.body01': value } }, {});
      assert.equal(result.success, false);
    }
  });

  it('should reject a type set that carries line_height even with line_height_px', () => {
    const result = Themer.validateContract({
      tokens: { 'type.body01': { type_set: true, font_size: 14, line_height_px: 20, line_height: 1.4, letter_spacing: 0.16, weight: 400, font_family: 'sans' } }
    }, {});
    assert.equal(result.success, false);
  });

  it('should reject a shadow layer whose color is not a color or alias', () => {
    const result = Themer.validateContract({
      tokens: { 'shadow.level_01': { shadow: true, layers: [{ x: 0, y: 2, blur: 6, spread: 0, color: 'not-a-color' }] } }
    }, {});
    assert.equal(result.success, false);
    assert.equal(result.errors[0].code, 'CONTRACT_INVALID_VALUE');
  });

  it('should accept a shadow layer rgba color', () => {
    const result = Themer.validateContract({
      tokens: { 'shadow.level_01': { shadow: true, layers: [{ x: 0, y: 2, blur: 6, spread: 0, color: 'rgba(0, 0, 0, 0.2)' }] } }
    }, {});
    assert.equal(result.success, true);
  });

  it('should reject constructor, toString, and __proto__ as operation names', () => {
    const engine = themerLoader(Lib, {});
    for (const name of ['constructor', 'toString', '__proto__']) {
      assert.throws(() => engine.buildTheme({ tokens: { x: { op: name, args: [] } } }, [], 'native'),
        /^TypeError: \[helper-themer\] tokens\.x\.op must name an operation this engine provides$/);
    }
  });

  it('should reject a ramp entry that is not a parsable color', () => {
    const engine = themerLoader(Lib, {});
    const template = { tokens: { a: '#ffffff' }, ramp: ['not-a-color', '#ffffff'] };
    assert.throws(() => engine.buildTheme(template, [], 'native'),
      /^TypeError: \[helper-themer\] template\.ramp\[0\] must be a supported numeric color$/);
    const report = engine.validateTemplate(template);
    assert.equal(report.success, false);
    assert.equal(report.errors[0], '[helper-themer] template.ramp[0] must be a supported numeric color');
  });

  it('should reject a contrast rule naming an undeclared token', () => {
    const engine = themerLoader(Lib, {});
    assert.throws(() => engine.buildTheme({ tokens: { a: '#ffffff' }, contrast_rules: [['a', 'zzz']] }, [], 'native'),
      /^TypeError: \[helper-themer\] template\.contrast_rules\[0\] must be a \[String, String, Number\?\] triple naming two declared tokens$/);
    assert.throws(() => engine.buildTheme({ tokens: { a: '#ffffff' }, contrast_rules: [['zzz', 'a']] }, [], 'native'),
      /^TypeError: \[helper-themer\] template\.contrast_rules\[0\] must be a \[String, String, Number\?\] triple naming two declared tokens$/);
  });

  it('should reject a layer whose tokens field is an array', () => {
    assert.throws(() => Themer.buildTheme({ tokens: { a: 1 } }, [{ tokens: [] }], 'native'),
      /^TypeError: \[helper-themer\] layers\[0\]\.tokens must be a plain object$/);
  });

  it('should keep two color parts with different error catalogs apart', async () => {
    const createColor = (await import('helper-themer/parts/color.js')).default;
    const CONFIG_DEFAULTS = (await import('helper-themer/themer.config.js')).default;
    const a = createColor(Lib, CONFIG_DEFAULTS, Object.freeze({ MUST_BE_COLOR: 'catalog A' }));
    const b = createColor(Lib, CONFIG_DEFAULTS, Object.freeze({ MUST_BE_COLOR: 'catalog B' }));
    assert.throws(() => a.parseHex('zzz'), /catalog A$/);
    assert.throws(() => b.parseHex('zzz'), /catalog B$/);
    assert.throws(() => a.parseHex('zzz'), /catalog A$/);
  });

  it('should keep two emit parts with different color parts apart', async () => {
    const createColor = (await import('helper-themer/parts/color.js')).default;
    const createEmit = (await import('helper-themer/parts/emit.js')).default;
    const CONFIG_DEFAULTS = (await import('helper-themer/themer.config.js')).default;
    const a = createColor(Lib, CONFIG_DEFAULTS, Object.freeze({ MUST_BE_COLOR: 'catalog A' }));
    const b = createColor(Lib, CONFIG_DEFAULTS, Object.freeze({ MUST_BE_COLOR: 'catalog B' }));
    const emitA = createEmit(Object.assign({}, Lib, { Color: a }), CONFIG_DEFAULTS, {});
    const emitB = createEmit(Object.assign({}, Lib, { Color: b }), CONFIG_DEFAULTS, {});
    const shadow = { layers: [{ x: 0, y: 1, blur: 2, spread: 0, color: 'zzz' }] };
    assert.throws(() => emitA.value(shadow, 'shadow', 'native', { token: 't', lossy: [] }), /catalog A$/);
    assert.throws(() => emitB.value(shadow, 'shadow', 'native', { token: 't', lossy: [] }), /catalog B$/);
  });

  it('should emit identical native shadow output with and without an options argument', () => {
    const template = {
      tokens: {
        cardShadow: { shadow: true, layers: [
          { x: 0, y: 1, blur: 2, spread: 0, color: '#00000033' },
          { x: 0, y: 4, blur: 8, spread: 1, color: '#0000001a', inset: true }
        ] }
      },
      meta: { cardShadow: { group: 'shadow' } }
    };
    const resolved = Themer.resolve(template, []);
    assert.deepEqual(
      Themer.emit(resolved, template, 'native').tokens,
      Themer.emit(resolved, template, 'native', {}).tokens
    );
  });

  it('should emit every layer, spread, and inset as one boxShadow string on native', () => {
    const engine = themerLoader(Lib, {});
    const template = {
      tokens: {
        cardShadow: { shadow: true, layers: [
          { x: 0, y: 1, blur: 2, spread: 0, color: '#00000033' },
          { x: 0, y: 4, blur: 8, spread: 1, color: '#0000001a', inset: true }
        ] }
      },
      meta: { cardShadow: { group: 'shadow' } }
    };
    const result = engine.buildTheme(template, [], 'native');
    assert.deepEqual(result.tokens.cardShadow, { boxShadow: '0px 1px 2px #00000033, inset 0px 4px 8px 1px #0000001a' });
    assert.deepEqual(result.lossy, []);
  });

  it('should emit the same shadow list as a CSS string on web', () => {
    const engine = themerLoader(Lib, {});
    const template = {
      tokens: {
        cardShadow: { shadow: true, layers: [
          { x: 0, y: 1, blur: 2, spread: 0, color: '#00000033' },
          { x: 0, y: 4, blur: 8, spread: 1, color: '#0000001a', inset: true }
        ] }
      },
      meta: { cardShadow: { group: 'shadow' } }
    };
    const result = engine.buildTheme(template, [], 'web');
    assert.equal(result.tokens.cardShadow, '0px 1px 2px #00000033, inset 0px 4px 8px 1px #0000001a');
  });

  it('should not accept a shadow_mode option', () => {
    assert.throws(() => Themer.buildTheme({ tokens: { a: 1 } }, [], 'native', { shadow_mode: 'anything' }),
      /^TypeError: \[helper-themer\] options\.shadow_mode must be one of: contrast, min_contrast_ratio, motion_factor$/);
  });

  it('should reject a non-boolean inset on a shadow layer', () => {
    const engine = themerLoader(Lib, {});
    const template = {
      tokens: {
        cardShadow: { shadow: true, layers: [{ x: 0, y: 1, blur: 2, spread: 0, color: '#00000033', inset: 'yes' }] }
      },
      meta: { cardShadow: { group: 'shadow' } }
    };
    assert.throws(() => engine.buildTheme(template, [], 'native'),
      /^TypeError: \[helper-themer\] tokens\.cardShadow\.layers\[0\]\.inset must be true or false$/);
  });

  it('should reject a non-boolean inset in a contract shadow value', () => {
    const result = Themer.validateContract({
      tokens: { 'shadow.level_01': { shadow: true, layers: [{ x: 0, y: 2, blur: 6, spread: 0, color: '#000000', inset: 'yes' }] } }
    }, {});
    assert.equal(result.success, false);
    assert.equal(result.errors[0].code, 'CONTRACT_INVALID_VALUE');
  });

});


describe('contract v2 - C2 grid group', () => {

  it('should have 13 grid tokens in the grid group', () => {
    const gridTokens = tokenNames.filter(function (n) { return contract.tokens[n].group === 'grid'; });
    assert.equal(gridTokens.length, 13);
  });

  it('should set tier structure and emit raw for the grid group', () => {
    assert.equal(contract.groups.grid.tier, 'structure');
    assert.equal(contract.groups.grid.emit, 'raw');
  });

});

describe('contract v2 - C3 viewport value type', () => {

  it('should have 4 spacing.fluid tokens with emit viewport', () => {
    const fluidTokens = tokenNames.filter(function (n) { return contract.tokens[n].emit === 'viewport'; });
    assert.equal(fluidTokens.length, 4);
    assert.deepEqual(fluidTokens, ['spacing.fluid_01', 'spacing.fluid_02', 'spacing.fluid_03', 'spacing.fluid_04']);
  });

  it('should reject a bare number on a viewport token', () => {
    const result = Themer.validateContract({ tokens: { 'spacing.fluid_02': 16 } }, {});
    assert.equal(result.success, false);
    assert.equal(result.errors[0].code, 'CONTRACT_INVALID_VALUE');
  });

  it('should reject negative vw', () => {
    const result = Themer.validateContract({ tokens: { 'spacing.fluid_02': { viewport: true, vw: -1 } } }, {});
    assert.equal(result.success, false);
  });

  it('should reject an extra key', () => {
    const result = Themer.validateContract({ tokens: { 'spacing.fluid_02': { viewport: true, vw: 2, extra: 1 } } }, {});
    assert.equal(result.success, false);
  });

  it('should accept a valid viewport object', () => {
    const result = Themer.validateContract({ tokens: { 'spacing.fluid_02': { viewport: true, vw: 2 } } }, {});
    assert.equal(result.success, true);
  });

  it('should emit 2vw on web', () => {
    const engine = themerLoader(Lib, {});
    const template = {
      tokens: { 'spacing.fluid_02': { viewport: true, vw: 2 } },
      meta: { 'spacing.fluid_02': { group: 'viewport' } }
    };
    const result = engine.buildTheme(template, [], 'web');
    assert.equal(result.tokens['spacing.fluid_02'], '2vw');
  });

  it('should emit the object unchanged on native', () => {
    const engine = themerLoader(Lib, {});
    const vp = { viewport: true, vw: 2 };
    const template = {
      tokens: { 'spacing.fluid_02': vp },
      meta: { 'spacing.fluid_02': { group: 'viewport' } }
    };
    const result = engine.buildTheme(template, [], 'native');
    assert.deepEqual(result.tokens['spacing.fluid_02'], vp);
  });

});

describe('contract v2 - C4 type-set breakpoints', () => {

  it('should accept a type set with breakpoints', () => {
    const result = Themer.validateContract({
      tokens: { 'type.body01': { type_set: true, font_size: 14, line_height_px: 20, letter_spacing: 0, weight: 400, font_family: 'sans', breakpoints: { md: { font_size: 16, line_height_px: 22, letter_spacing: 0, weight: 400, font_family: 'sans' } } } }
    }, {});
    assert.equal(result.success, true);
  });

  it('should reject nested breakpoints', () => {
    const result = Themer.validateContract({
      tokens: { 'type.body01': { type_set: true, font_size: 14, line_height_px: 20, letter_spacing: 0, weight: 400, font_family: 'sans', breakpoints: { md: { font_size: 16, line_height_px: 22, letter_spacing: 0, weight: 400, font_family: 'sans', breakpoints: {} } } } }
    }, {});
    assert.equal(result.success, false);
  });

});

describe('contract v2 - C5 icon sizes', () => {

  it('should have size.icon_03 and size.icon_04', () => {
    assert.equal(contract.tokens['size.icon_03'].group, 'size');
    assert.equal(contract.tokens['size.icon_04'].group, 'size');
  });

});

describe('contract v2 - C14 border width rename', () => {

  it('should have border.width_03 and border.width_04', () => {
    assert.ok(contract.tokens['border.width_03']);
    assert.ok(contract.tokens['border.width_04']);
  });

  it('should report contract version 2', () => {
    assert.equal(contract.version, 2);
  });

});

describe('contract v2 - M3 state group with range', () => {

  it('should have 6 state tokens', () => {
    const stateTokens = tokenNames.filter(function (n) { return contract.tokens[n].group === 'state'; });
    assert.equal(stateTokens.length, 6);
  });

  it('should declare range [0, 1] on the state group', () => {
    assert.deepEqual(contract.groups.state.range, [0, 1]);
  });

  it('should reject state.hover_opacity 1.5', () => {
    const result = Themer.validateContract({ tokens: { 'state.hover_opacity': 1.5 } }, {});
    assert.equal(result.success, false);
    assert.equal(result.errors[0].code, 'CONTRACT_INVALID_VALUE');
  });

  it('should reject tint.level_01 -0.1', () => {
    const result = Themer.validateContract({ tokens: { 'tint.level_01': -0.1 } }, {});
    assert.equal(result.success, false);
    assert.equal(result.errors[0].code, 'CONTRACT_INVALID_VALUE');
  });

  it('should accept 0 and 1 for state and tint tokens', () => {
    const r1 = Themer.validateContract({ tokens: { 'state.hover_opacity': 0 } }, {});
    const r2 = Themer.validateContract({ tokens: { 'state.hover_opacity': 1 } }, {});
    assert.equal(r1.success, true);
    assert.equal(r2.success, true);
  });

});

describe('contract v2 - M4 shadow levels 4 and 5', () => {

  it('should have shadow.level_04 and shadow.level_05', () => {
    assert.ok(contract.tokens['shadow.level_04']);
    assert.ok(contract.tokens['shadow.level_05']);
  });

});

describe('contract v2 - M5 tint group with range', () => {

  it('should have 5 tint tokens', () => {
    const tintTokens = tokenNames.filter(function (n) { return contract.tokens[n].group === 'tint'; });
    assert.equal(tintTokens.length, 5);
  });

  it('should declare range [0, 1] on the tint group', () => {
    assert.deepEqual(contract.groups.tint.range, [0, 1]);
  });

});

describe('contract v2 - M6 radii 12 and 28', () => {

  it('should have shape.radius_12 and shape.radius_28', () => {
    assert.ok(contract.tokens['shape.radius_12']);
    assert.ok(contract.tokens['shape.radius_28']);
  });

});

describe('contract v2 - M8 full weight scale', () => {

  it('should have 12 font tokens (3 families + 9 weights)', () => {
    const fontTokens = tokenNames.filter(function (n) { return contract.tokens[n].group === 'font'; });
    assert.equal(fontTokens.length, 12);
  });

  it('should have font.weight.thin through black', () => {
    for (const w of ['thin', 'extralight', 'medium', 'extrabold', 'black']) {
      assert.ok(contract.tokens['font.weight.' + w], 'missing font.weight.' + w);
    }
  });

});

describe('contract v2 - F1 feedback.focus enum', () => {

  it('should declare values for feedback.focus', () => {
    assert.deepEqual(contract.tokens['feedback.focus'].values, ['outline', 'inset', 'underline']);
  });

  it('should reject a value not in the declared values list', () => {
    const result = Themer.validateContract({ tokens: { 'feedback.focus': 'ring' } }, {});
    assert.equal(result.success, false);
  });

  it('should accept outline', () => {
    const result = Themer.validateContract({ tokens: { 'feedback.focus': 'outline' } }, {});
    assert.equal(result.success, true);
  });

});

describe('contract v2 - M9 duration slots', () => {

  it('should have 10 new duration tokens', () => {
    const newDurations = ['motion.duration_fast_03', 'motion.duration_fast_04', 'motion.duration_moderate_03', 'motion.duration_moderate_04', 'motion.duration_slow_03', 'motion.duration_slow_04', 'motion.duration_extra_slow_01', 'motion.duration_extra_slow_02', 'motion.duration_extra_slow_03', 'motion.duration_extra_slow_04'];
    for (const d of newDurations) {
      assert.ok(contract.tokens[d], 'missing ' + d);
    }
  });

});

describe('contract v2 - M9b easing_linear', () => {

  it('should have motion.easing_linear with emit easing', () => {
    assert.equal(contract.tokens['motion.easing_linear'].emit, 'easing');
  });

});

describe('contract v2 - M10 spring value type', () => {

  it('should have 6 spring tokens with emit spring', () => {
    const springTokens = tokenNames.filter(function (n) { return contract.tokens[n].emit === 'spring'; });
    assert.equal(springTokens.length, 6);
    assert.deepEqual(springTokens, ['motion.spring_spatial_default', 'motion.spring_spatial_fast', 'motion.spring_spatial_slow', 'motion.spring_effects_default', 'motion.spring_effects_fast', 'motion.spring_effects_slow']);
  });

  it('should reject a spring with stiffness 0', () => {
    const result = Themer.validateContract({ tokens: { 'motion.spring_spatial_default': { spring: true, stiffness: 0, damping: 47.62, mass: 1 } } }, {});
    assert.equal(result.success, false);
  });

  it('should reject a spring with a missing mass', () => {
    const result = Themer.validateContract({ tokens: { 'motion.spring_spatial_default': { spring: true, stiffness: 700, damping: 47.62 } } }, {});
    assert.equal(result.success, false);
  });

  it('should reject a spring with an extra key', () => {
    const result = Themer.validateContract({ tokens: { 'motion.spring_spatial_default': { spring: true, stiffness: 700, damping: 47.62, mass: 1, extra: 1 } } }, {});
    assert.equal(result.success, false);
  });

  it('should reject a spring passed as an array', () => {
    const result = Themer.validateContract({ tokens: { 'motion.spring_spatial_default': [0.2, 0, 0.38, 0.9] } }, {});
    assert.equal(result.success, false);
  });

  it('should accept a valid spring object', () => {
    const result = Themer.validateContract({ tokens: { 'motion.spring_spatial_default': { spring: true, stiffness: 700, damping: 47.62, mass: 1 } } }, {});
    assert.equal(result.success, true);
  });

  it('should reject a spring object on a duration token', () => {
    const result = Themer.validateContract({ tokens: { 'motion.duration_fast_01': { spring: true, stiffness: 700, damping: 47.62, mass: 1 } } }, {});
    assert.equal(result.success, false);
  });

  it('should emit the spring object unchanged on web', () => {
    const engine = themerLoader(Lib, {});
    const spring = { spring: true, stiffness: 700, damping: 47.62, mass: 1 };
    const template = {
      tokens: { 'motion.spring_spatial_default': spring },
      meta: { 'motion.spring_spatial_default': { group: 'spring' } }
    };
    const result = engine.buildTheme(template, [], 'web');
    assert.deepEqual(result.tokens['motion.spring_spatial_default'], spring);
  });

  it('should emit the spring object unchanged on native', () => {
    const engine = themerLoader(Lib, {});
    const spring = { spring: true, stiffness: 700, damping: 47.62, mass: 1 };
    const template = {
      tokens: { 'motion.spring_spatial_default': spring },
      meta: { 'motion.spring_spatial_default': { group: 'spring' } }
    };
    const result = engine.buildTheme(template, [], 'native');
    assert.deepEqual(result.tokens['motion.spring_spatial_default'], spring);
  });

});

describe('contract v2 - M11 segments value type', () => {

  it('should accept a segments object on an easing token', () => {
    const result = Themer.validateContract({
      tokens: { 'motion.easing_standard_expressive': { segments: true, curves: [[0.5, [0.05, 0.7, 0.1, 1]], [1, [0.3, 0, 0.8, 0.15]]] } }
    }, {});
    assert.equal(result.success, true);
  });

  it('should reject empty curves', () => {
    const result = Themer.validateContract({
      tokens: { 'motion.easing_standard_expressive': { segments: true, curves: [] } }
    }, {});
    assert.equal(result.success, false);
  });

  it('should reject non-increasing t', () => {
    const result = Themer.validateContract({
      tokens: { 'motion.easing_standard_expressive': { segments: true, curves: [[0.5, [0.05, 0.7, 0.1, 1]], [0.5, [0.3, 0, 0.8, 0.15]]] } }
    }, {});
    assert.equal(result.success, false);
  });

  it('should reject t outside 0..1', () => {
    const result = Themer.validateContract({
      tokens: { 'motion.easing_standard_expressive': { segments: true, curves: [[1.5, [0.05, 0.7, 0.1, 1]]] } }
    }, {});
    assert.equal(result.success, false);
  });

  it('should reject an inner array of length 3', () => {
    const result = Themer.validateContract({
      tokens: { 'motion.easing_standard_expressive': { segments: true, curves: [[0.5, [0.05, 0.7, 0.1]]] } }
    }, {});
    assert.equal(result.success, false);
  });

  it('should emit the segments object unchanged on web', () => {
    const engine = themerLoader(Lib, {});
    const segments = { segments: true, curves: [[0.5, [0.05, 0.7, 0.1, 1]], [1, [0.3, 0, 0.8, 0.15]]] };
    const template = {
      tokens: { 'motion.easing_standard_expressive': segments },
      meta: { 'motion.easing_standard_expressive': { group: 'easing' } }
    };
    const result = engine.buildTheme(template, [], 'web');
    assert.deepEqual(result.tokens['motion.easing_standard_expressive'], segments);
  });

  it('should emit the segments object unchanged on native', () => {
    const engine = themerLoader(Lib, {});
    const segments = { segments: true, curves: [[0.5, [0.05, 0.7, 0.1, 1]], [1, [0.3, 0, 0.8, 0.15]]] };
    const template = {
      tokens: { 'motion.easing_standard_expressive': segments },
      meta: { 'motion.easing_standard_expressive': { group: 'easing' } }
    };
    const result = engine.buildTheme(template, [], 'native');
    assert.deepEqual(result.tokens['motion.easing_standard_expressive'], segments);
  });

});
