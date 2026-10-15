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
      'anatomy.label': 'above',
      'icon.close': { icon: true, viewBox: '0 0 32 32', paths: [{ d: 'M24 9.4L22.6 8 16 14.6 9.4 8 8 9.4l6.6 6.6L8 22.6 9.4 24l6.6-6.6 6.6 6.6 1.4-1.4-6.6-6.6L24 9.4z' }] },
      'shadow.level_01': { shadow: true, layers: [{ x: 0, y: 2, blur: 6, spread: 0, color: '{color.shadow}' }] },
      'breakpoint.sm': 320,
      'stacking.modal': 9000
    }
  };
}


describe('contract registry - structure', () => {

  it('should expose exactly 1217 tokens', () => {
    assert.equal(Object.keys(contract.tokens).length, 1217);
  });

  it('should expose exactly 19 groups', () => {
    assert.equal(Object.keys(contract.groups).length, 19);
  });

  it('should expose exactly 1217 meta entries', () => {
    assert.equal(Object.keys(contract.meta).length, 1217);
  });

  it('should report contract version 8', () => {
    assert.equal(contract.version, 8);
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
    color: 631,
    spacing: 17,
    size: 22,
    type: 86,
    font: 12,
    motion: 33,
    shape: 9,
    border: 4,
    focus: 2,
    feedback: 3,
    shadow: 49,
    breakpoint: 5,
    grid: 13,
    state: 6,
    tint: 5,
    stacking: 5,
    anatomy: 20,
    icon: 86,
    control: 209
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

  it('should set tier structure for shape, border, focus, motion, feedback, shadow, breakpoint, stacking', () => {
    assert.equal(contract.groups.shape.tier, 'structure');
    assert.equal(contract.groups.border.tier, 'structure');
    assert.equal(contract.groups.focus.tier, 'structure');
    assert.equal(contract.groups.motion.tier, 'structure');
    assert.equal(contract.groups.feedback.tier, 'structure');
    assert.equal(contract.groups.shadow.tier, 'structure');
    assert.equal(contract.groups.breakpoint.tier, 'structure');
    assert.equal(contract.groups.stacking.tier, 'structure');
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

  it('should set emit raw for font, feedback, breakpoint, stacking groups', () => {
    assert.equal(contract.groups.font.emit, 'raw');
    assert.equal(contract.groups.feedback.emit, 'raw');
    assert.equal(contract.groups.breakpoint.emit, 'raw');
    assert.equal(contract.groups.stacking.emit, 'raw');
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

  it('should declare values for feedback.focus_trigger', () => {
    assert.deepEqual(contract.tokens['feedback.focus_trigger'].values, ['any', 'keyboard']);
  });

  it('should declare values for feedback.field', () => {
    assert.deepEqual(contract.tokens['feedback.field'].values, ['underline', 'outline']);
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

  it('should return success true when required is all 995 tokens and theme has all 995', () => {
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
      } else if (group.type === 'icon') {
        theme.tokens[name] = { icon: true, viewBox: '0 0 32 32', paths: [{ d: 'M0 0h32v32H0z' }] };
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

  it('should report contract version 8', () => {
    assert.equal(contract.version, 8);
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

describe('contract v3 - stacking group', () => {

  it('should expose five raw numeric structure tokens', () => {
    const stackingTokens = tokenNames.filter(function (name) {
      return contract.tokens[name].group === 'stacking';
    });

    assert.deepEqual(stackingTokens, [
      'stacking.dropdown',
      'stacking.modal',
      'stacking.header',
      'stacking.overlay',
      'stacking.floating'
    ]);
    assert.deepEqual(contract.groups.stacking, {
      tier: 'structure',
      type: 'number',
      emit: 'raw'
    });
  });

});


describe('contract v5 - control group and role tokens', () => {

  it('should expose eleven dimension structure tokens for per-component geometry', () => {
    const controlTokens = tokenNames.filter(function (name) {
      return contract.tokens[name].group === 'control' && contract.tokens[name].grid !== true;
    });

    assert.deepEqual(controlTokens, [
      'control.button_height',
      'control.button_radius',
      'control.button_padding_start',
      'control.button_padding_end',
      'control.button_icon_size',
      'control.field_height',
      'control.field_radius',
      'control.field_icon_size',
      'control.checkbox_size',
      'control.checkbox_border',
      'control.option_height'
    ]);
    assert.deepEqual(contract.groups.control, { tier: 'structure', type: 'number', emit: 'dimension' });
    for (const name of controlTokens) {
      assert.deepEqual(contract.meta[name], { group: 'dimension' });
    }
  });

  it('should expose the two role type sets and the eight role colors', () => {
    assert.deepEqual(contract.tokens['type.button_label'], { group: 'type' });
    assert.deepEqual(contract.tokens['type.field_label_raised'], { group: 'type' });
    for (const leaf of ['button_tonal', 'button_tonal_active', 'button_tonal_hover', 'text_on_button_tonal', 'button_elevated', 'button_elevated_active', 'button_elevated_hover', 'control_checked']) {
      assert.deepEqual(contract.tokens['color.' + leaf], { group: 'color' });
    }
  });

  it('should emit a control token as a number on native and a rem string on web', () => {
    const built = Themer.buildTheme({ tokens: { 'control.button_height': 40 }, meta: { 'control.button_height': { group: 'dimension' } } }, [], 'native');
    assert.equal(built.tokens['control.button_height'], 40);
    const web = Themer.buildTheme({ tokens: { 'control.button_height': 40 }, meta: { 'control.button_height': { group: 'dimension' } } }, [], 'web');
    assert.equal(web.tokens['control.button_height'], '2.5rem');
  });

});


describe('contract v4 - anatomy group', () => {

  it('should expose twenty enum structure tokens with their literal value lists', () => {
    const anatomyTokens = tokenNames.filter(function (name) {
      return contract.tokens[name].group === 'anatomy';
    });

    assert.deepEqual(anatomyTokens, [
      'anatomy.label',
      'anatomy.switch_handle',
      'anatomy.status_marker',
      'anatomy.dialog_actions',
      'anatomy.button_label',
      'anatomy.field_counter',
      'anatomy.switch_state_text',
      'anatomy.switch_edge',
      'anatomy.progress_indeterminate',
      'anatomy.tab_indicator',
      'anatomy.dialog_close',
      'anatomy.dialog_label',
      'anatomy.list_selected_mark',
      'anatomy.menu_icon_seat',
      'anatomy.field_counter_format',
      'anatomy.loading_motion',
      'anatomy.tag_close',
      'anatomy.tag_selected_mark',
      'anatomy.tag_interactive_outline',
      'anatomy.field_action'
    ]);
    assert.deepEqual(contract.groups.anatomy, { tier: 'structure', type: 'enum', emit: 'raw' });
    assert.deepEqual(contract.tokens['anatomy.label'].values, ['above', 'floating']);
    assert.deepEqual(contract.tokens['anatomy.switch_handle'].values, ['fixed', 'grows']);
    assert.deepEqual(contract.tokens['anatomy.status_marker'].values, ['bar_icon', 'plain']);
    assert.deepEqual(contract.tokens['anatomy.dialog_actions'].values, ['stretched', 'trailing']);
    assert.equal(contract.tokens['anatomy.caret'], undefined);
    assert.equal(contract.tokens['anatomy.slider_handle'], undefined);
    assert.deepEqual(contract.tokens['anatomy.field_action'].values, ['square', 'icon_button']);
    assert.deepEqual(contract.tokens['anatomy.button_label'].values, ['top', 'center']);
    assert.deepEqual(contract.tokens['anatomy.field_counter'].values, ['label', 'message']);
    assert.deepEqual(contract.tokens['anatomy.switch_state_text'].values, ['shown', 'hidden']);
    assert.deepEqual(contract.tokens['anatomy.switch_edge'].values, ['border', 'skin']);
    assert.deepEqual(contract.tokens['anatomy.progress_indeterminate'].values, ['sweep', 'travel']);
    assert.deepEqual(contract.tokens['anatomy.tab_indicator'].values, ['full', 'content']);
    assert.deepEqual(contract.tokens['anatomy.dialog_close'].values, ['shown', 'hidden']);
    assert.deepEqual(contract.tokens['anatomy.dialog_label'].values, ['shown', 'hidden']);
    assert.deepEqual(contract.tokens['anatomy.list_selected_mark'].values, ['shown', 'hidden']);
    assert.deepEqual(contract.tokens['anatomy.menu_icon_seat'].values, ['shared', 'item']);
    assert.deepEqual(contract.tokens['anatomy.field_counter_format'].values, ['tight', 'spaced']);
    assert.deepEqual(contract.tokens['anatomy.loading_motion'].values, ['spin', 'arc']);
    assert.deepEqual(contract.tokens['anatomy.tag_close'].values, ['circle', 'inset']);
    assert.deepEqual(contract.tokens['anatomy.tag_selected_mark'].values, ['shown', 'hidden']);
    assert.deepEqual(contract.tokens['anatomy.tag_interactive_outline'].values, ['border', 'inset']);
  });

  it('should accept every listed value and reject an unlisted one', () => {
    for (const name of ['anatomy.label', 'anatomy.switch_handle', 'anatomy.status_marker', 'anatomy.dialog_actions', 'anatomy.field_action', 'anatomy.button_label', 'anatomy.field_counter', 'anatomy.switch_state_text', 'anatomy.switch_edge', 'anatomy.progress_indeterminate', 'anatomy.tab_indicator', 'anatomy.dialog_close', 'anatomy.dialog_label', 'anatomy.list_selected_mark', 'anatomy.menu_icon_seat', 'anatomy.field_counter_format', 'anatomy.loading_motion', 'anatomy.tag_close', 'anatomy.tag_selected_mark', 'anatomy.tag_interactive_outline']) {
      for (const value of contract.tokens[name].values) {
        assert.equal(Themer.validateContract({ tokens: { [name]: value } }, {}).success, true, name + ' ' + value);
      }
      const rejected = Themer.validateContract({ tokens: { [name]: 'carbon' } }, {});
      assert.equal(rejected.success, false, name);
      assert.equal(rejected.errors[0].code, 'CONTRACT_INVALID_VALUE');
    }
  });

  it('should emit an anatomy value unchanged on both platforms', () => {
    const engine = themerLoader(Lib, {});
    const template = { tokens: { 'anatomy.label': 'floating' }, meta: { 'anatomy.label': { group: 'raw' } } };
    assert.equal(engine.buildTheme(template, [], 'web').tokens['anatomy.label'], 'floating');
    assert.equal(engine.buildTheme(template, [], 'native').tokens['anatomy.label'], 'floating');
  });

});


describe('contract v4 - icon group', () => {

  const iconTokens = tokenNames.filter(function (name) {
    return contract.tokens[name].group === 'icon';
  });
  const valid = { icon: true, viewBox: '0 0 32 32', paths: [{ d: 'M0 0h32v32H0z' }] };
  const check = function (value) {
    return Themer.validateContract({ tokens: { 'icon.close': value } }, {});
  };

  it('should expose 86 value-tier icon tokens in alphabetical order with raw emission', () => {
    assert.equal(iconTokens.length, 86);
    assert.deepEqual(iconTokens, iconTokens.slice().sort());
    assert.deepEqual(contract.groups.icon, { tier: 'value', type: 'icon', emit: 'raw' });
    assert.equal(contract.meta['icon.close'].group, 'raw');
    for (const name of ['icon.close', 'icon.chevron_down', 'icon.warning', 'icon.checkmark', 'icon.add', 'icon.invalid', 'icon.dropdown_indicator', 'icon.checked_indicator', 'icon.mixed_indicator', 'icon.selected_indicator', 'icon.switch_checked_indicator', 'icon.save', 'icon.visibility_on', 'icon.visibility_off', 'icon.subtract']) {
      assert.ok(contract.tokens[name], 'missing ' + name);
    }
  });

  it('should accept a minimal icon literal', () => {
    assert.deepEqual(check(valid), { success: true, errors: [], warnings: [] });
  });

  it('should accept fillRule and size variants', () => {
    const value = {
      icon: true,
      viewBox: '0 -960 960 960',
      paths: [{ d: 'M0 0h1', fillRule: 'evenodd' }, { d: 'M1 1h1' }],
      sizes: { '16': { viewBox: '0 0 16 16', paths: [{ d: 'M0 0h16' }] }, '20': { viewBox: '0 0 32 32', paths: [{ d: 'M0 0h20', fillRule: 'nonzero' }] } }
    };
    assert.equal(check(value).success, true);
  });

  it('should reject an icon without the icon marker', () => {
    assert.equal(check({ viewBox: '0 0 32 32', paths: [{ d: 'M0 0h1' }] }).success, false);
  });

  it('should reject a path with a missing d', () => {
    assert.equal(check({ icon: true, viewBox: '0 0 32 32', paths: [{}] }).success, false);
  });

  it('should reject a path with an empty d', () => {
    assert.equal(check({ icon: true, viewBox: '0 0 32 32', paths: [{ d: '' }] }).success, false);
  });

  it('should reject an empty paths list', () => {
    assert.equal(check({ icon: true, viewBox: '0 0 32 32', paths: [] }).success, false);
  });

  it('should reject a malformed viewBox', () => {
    for (const viewBox of ['0 0 32', '0 0 32 32 0', 'a b c d', '0 0 0 32', '0 0 32 -1', 32]) {
      assert.equal(check({ icon: true, viewBox: viewBox, paths: [{ d: 'M0 0h1' }] }).success, false, String(viewBox));
    }
  });

  it('should reject an unknown fillRule', () => {
    assert.equal(check({ icon: true, viewBox: '0 0 32 32', paths: [{ d: 'M0 0h1', fillRule: 'inherit' }] }).success, false);
  });

  it('should reject extra keys on the icon and on a path', () => {
    assert.equal(check({ icon: true, viewBox: '0 0 32 32', paths: [{ d: 'M0 0h1' }], fill: '#000000' }).success, false);
    assert.equal(check({ icon: true, viewBox: '0 0 32 32', paths: [{ d: 'M0 0h1', stroke: 1 }] }).success, false);
  });

  it('should reject a sizes map with a non-integer key, a bare path list, a missing viewBox, or extra keys', () => {
    const variant = { viewBox: '0 0 16 16', paths: [{ d: 'M0 0h1' }] };
    assert.equal(check({ icon: true, viewBox: '0 0 32 32', paths: [{ d: 'M0 0h1' }], sizes: { small: variant } }).success, false);
    assert.equal(check({ icon: true, viewBox: '0 0 32 32', paths: [{ d: 'M0 0h1' }], sizes: { '16': [{ d: 'M0 0h1' }] } }).success, false);
    assert.equal(check({ icon: true, viewBox: '0 0 32 32', paths: [{ d: 'M0 0h1' }], sizes: { '16': { paths: [{ d: 'M0 0h1' }] } } }).success, false);
    assert.equal(check({ icon: true, viewBox: '0 0 32 32', paths: [{ d: 'M0 0h1' }], sizes: { '16': { viewBox: '0 0 16 16', paths: [] } } }).success, false);
    assert.equal(check({ icon: true, viewBox: '0 0 32 32', paths: [{ d: 'M0 0h1' }], sizes: { '16': { viewBox: '0 0 16 16', paths: [{ d: 'M0 0h1' }], width: 16 } } }).success, false);
    assert.equal(check({ icon: true, viewBox: '0 0 32 32', paths: [{ d: 'M0 0h1' }], sizes: [] }).success, false);
  });

  it('should reject an icon literal on a non-icon token and report CONTRACT_INVALID_VALUE', () => {
    const result = Themer.validateContract({ tokens: { 'shape.radius_04': valid } }, {});
    assert.equal(result.success, false);
    assert.equal(result.errors[0].code, 'CONTRACT_INVALID_VALUE');
    assert.equal(check({ icon: true, viewBox: '0 0 32 32', paths: [{}] }).errors[0].code, 'CONTRACT_INVALID_VALUE');
  });

  it('should resolve an icon literal and emit it unchanged on both platforms', () => {
    const engine = themerLoader(Lib, {});
    const template = { tokens: { 'icon.close': valid }, meta: { 'icon.close': { group: 'raw' } } };
    assert.deepEqual(engine.buildTheme(template, [], 'web').tokens['icon.close'], valid);
    assert.deepEqual(engine.buildTheme(template, [], 'native').tokens['icon.close'], valid);
  });

  it('should let a sparse layer replace one icon and leave the rest to the template', () => {
    const engine = themerLoader(Lib, {});
    const brand = { icon: true, viewBox: '0 0 24 24', paths: [{ d: 'M0 0h24v24H0z' }] };
    const template = {
      tokens: { 'icon.close': valid, 'icon.add': valid },
      meta: { 'icon.close': { group: 'raw' }, 'icon.add': { group: 'raw' } }
    };
    const built = engine.buildTheme(template, [{ name: 'brand', polarity: 'light', tokens: { 'icon.close': brand } }], 'native');
    assert.deepEqual(built.tokens['icon.close'], brand);
    assert.deepEqual(built.tokens['icon.add'], valid);
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

describe('contract v5 amendment - feedback.focus removed', () => {

  it('should not declare feedback.focus: the grid draws each family\'s focus ring', () => {
    assert.equal(contract.tokens['feedback.focus'], undefined);
    assert.ok(contract.tokens['control.button_focus_offset']);
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


// Helper: a built theme whose roles all read, to break one rule at a time
function readableTheme () {
  const tokens = {
    'color.background': '#ffffff', 'color.layer_01': '#f4f4f4', 'color.field_01': '#f4f4f4',
    'color.background_inverse': '#161616', 'color.background_selected': 'rgba(141, 141, 141, 0.2)',
    'color.text_primary': '#161616', 'color.text_secondary': '#525252', 'color.text_helper': '#525252',
    'color.text_error': '#b91c1c', 'color.text_inverse': '#ffffff', 'color.text_on_color': '#ffffff',
    'color.text_on_button_tonal': '#161616', 'color.text_disabled': '#8d8d8d',
    'color.link_primary': '#0f62fe', 'color.interactive': '#0f62fe', 'color.focus': '#0f62fe',
    'color.button_primary': '#0f62fe', 'color.button_secondary': '#393939', 'color.button_tertiary': '#0f62fe',
    'color.button_danger_primary': '#b91c1c', 'color.button_danger_secondary': '#b91c1c',
    'color.button_tonal': '#f4f4f4', 'color.button_elevated': '#f4f4f4', 'color.button_disabled': '#c6c6c6',
    'color.icon_primary': '#161616', 'color.icon_on_color': '#ffffff', 'color.icon_disabled': '#8d8d8d', 'color.icon_inverse': '#ffffff',
    'color.support_error': '#b91c1c', 'color.border_strong_01': '#8d8d8d', 'color.border_interactive': '#0f62fe'
  };
  for (const level of ['01', '02', '03', '04', '05']) {
    tokens['shadow.level_' + level] = { boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.3)' };
  }
  // The role grid: every kind's label reads on its fill; disabled differs from enabled
  for (const kind of ['primary', 'secondary', 'tertiary', 'ghost', 'danger', 'danger_tertiary', 'danger_ghost', 'tonal', 'elevated']) {
    for (const state of ['', '_hover', '_active', '_focus']) {
      tokens['color.button_' + kind + '_container' + state] = '#0f62fe';
      tokens['color.button_' + kind + '_label' + state] = '#ffffff';
    }
    tokens['color.button_' + kind + '_container_selected'] = 'rgba(141, 141, 141, 0.2)';
    tokens['color.button_' + kind + '_label_selected'] = '#161616';
    tokens['color.button_' + kind + '_container_disabled'] = '#c6c6c6';
    tokens['color.button_' + kind + '_label_disabled'] = '#8d8d8d';
  }
  Object.assign(tokens, {
    'color.field_container': '#f4f4f4', 'color.field_value': '#161616', 'color.field_value_disabled': '#8d8d8d',
    'color.field_helper': '#525252', 'color.field_message_invalid': '#b91c1c', 'color.field_outline': '#8d8d8d',
    'color.field_indicator': '#161616', 'color.selection_outline': '#161616', 'color.selection_outline_disabled': '#8d8d8d',
    'color.selection_mark': '#ffffff', 'color.selection_container': '#161616', 'color.selection_container_disabled': '#8d8d8d',
    'color.selection_label': '#161616'
  });
  // The v7 roles: link and loading labels on the page, the selectable tag's
  // rest and selected pairs, the skeleton's two surfaces
  Object.assign(tokens, {
    'color.link_label': '#0f62fe', 'color.link_label_hover': '#0043ce', 'color.link_label_visited': '#8a3ffc',
    'color.progress_step_label': '#161616', 'color.inline_loading_label': '#525252',
    'color.tag_selectable_container': '#e0e0e0', 'color.tag_selectable_label': '#161616',
    'color.tag_selectable_container_selected': '#161616', 'color.tag_selectable_label_selected': '#ffffff',
    'color.skeleton_shimmer': '#c6c6c6', 'color.skeleton_container': '#e0e0e0'
  });
  // The icon button members: a selected pair that differs from the
  // toggle's unselected face
  for (const kind of ['primary', 'secondary', 'ghost', 'tertiary']) {
    tokens['color.icon_button_' + kind + '_container_selected'] = 'rgba(141, 141, 141, 0.2)';
    tokens['color.icon_button_' + kind + '_icon_selected'] = '#161616';
    tokens['color.icon_button_' + kind + '_container_unselected'] = '#e0e0e0';
    tokens['color.icon_button_' + kind + '_icon_unselected'] = '#393939';
    if (kind === 'ghost' || kind === 'tertiary') {
      tokens['color.icon_button_' + kind + '_icon'] = '#0f62fe';
    }
  }
  return { tokens: tokens };
}


describe('auditRoles', () => {

  it('should throw TypeError when the theme or its tokens is not a plain object', () => {
    assert.throws(() => Themer.auditRoles(null), TypeError);
    assert.throws(() => Themer.auditRoles({ tokens: [] }), TypeError);
  });

  it('should pass a theme whose roles all read, differ where they must and lift with translucent shadows', () => {
    const result = Themer.auditRoles(readableTheme());
    assert.deepEqual(result, { success: true, findings: [] });
  });

  it('should report a content role that does not reach its minimum on its surface, with the ratio', () => {
    const theme = readableTheme();
    theme.tokens['color.button_danger_primary'] = '#c6c6c6';
    const result = Themer.auditRoles(theme);
    assert.equal(result.success, false);
    const contrast = result.findings.filter((f) => f.rule === 'contrast');
    assert.deepEqual(contrast[0], { rule: 'contrast', tokens: ['color.text_on_color', 'color.button_danger_primary'], ratio: 1.71, minimum: 4.5 });
  });

  it('should composite a translucent surface over the background before measuring', () => {
    const theme = readableTheme();
    theme.tokens['color.background_selected'] = 'rgba(0, 0, 0, 0.9)';
    const result = Themer.auditRoles(theme);
    const finding = result.findings.find((f) => f.rule === 'contrast' && f.tokens[1] === 'color.background_selected');
    assert.equal(finding.tokens[0], 'color.text_primary');
    assert.ok(finding.ratio < 1.5);
  });

  it('should report two roles with different meanings that share one value', () => {
    const theme = readableTheme();
    theme.tokens['color.text_error'] = '#161616';
    const result = Themer.auditRoles(theme);
    assert.deepEqual(result.findings.filter((f) => f.rule === 'distinct'), [
      { rule: 'distinct', tokens: ['color.text_error', 'color.text_primary'], value: '#161616' }
    ]);
  });

  it('should report an opaque shadow layer and a shadow with no color', () => {
    const theme = readableTheme();
    theme.tokens['shadow.level_01'] = { boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.3), 0px 1px 3px 1px #000000' };
    theme.tokens['shadow.level_02'] = { boxShadow: '' };
    const result = Themer.auditRoles(theme);
    assert.deepEqual(result.findings.filter((f) => f.rule === 'shadow').map((f) => f.tokens[0]), ['shadow.level_01', 'shadow.level_02']);
  });

  it('should report a role the theme lacks once and skip the rules that need it', () => {
    const theme = readableTheme();
    delete theme.tokens['color.button_tonal'];
    delete theme.tokens['shadow.level_05'];
    const result = Themer.auditRoles(theme);
    assert.deepEqual(result.findings, [
      { rule: 'missing', tokens: ['color.button_tonal'] },
      { rule: 'missing', tokens: ['shadow.level_05'] }
    ]);
  });

  it('should report a button kind whose selected cells paint exactly as its rest cells', () => {
    const theme = readableTheme();
    theme.tokens['color.button_primary_container_selected'] = '#0f62fe';
    theme.tokens['color.button_primary_label_selected'] = '#ffffff';
    const result = Themer.auditRoles(theme);
    assert.deepEqual(result.findings.filter((f) => f.rule === 'distinct'), [
      { rule: 'distinct', tokens: ['color.button_primary_container_selected', 'color.button_primary_label_selected', 'color.button_primary_container', 'color.button_primary_label'], value: ['#0f62fe', '#ffffff'] }
    ]);
  });

  it('should pass a button kind whose selected pair differs in one cell only', () => {
    const theme = readableTheme();
    theme.tokens['color.button_primary_container_selected'] = '#0f62fe';
    const result = Themer.auditRoles(theme);
    assert.deepEqual(result.findings.filter((f) => f.rule === 'distinct'), []);
  });

  it('should report an icon button whose selected cells paint exactly as its unselected cells', () => {
    const theme = readableTheme();
    theme.tokens['color.icon_button_primary_container_selected'] = '#e0e0e0';
    theme.tokens['color.icon_button_primary_icon_selected'] = '#393939';
    theme.tokens['color.icon_button_ghost_container_selected'] = '#e0e0e0';
    theme.tokens['color.icon_button_ghost_icon_selected'] = '#393939';
    const result = Themer.auditRoles(theme);
    assert.deepEqual(result.findings.filter((f) => f.rule === 'distinct'), [
      { rule: 'distinct', tokens: ['color.icon_button_primary_container_selected', 'color.icon_button_primary_icon_selected', 'color.icon_button_primary_container_unselected', 'color.icon_button_primary_icon_unselected'], value: ['#e0e0e0', '#393939'] },
      { rule: 'distinct', tokens: ['color.icon_button_ghost_container_selected', 'color.icon_button_ghost_icon_selected', 'color.icon_button_ghost_container_unselected', 'color.icon_button_ghost_icon_unselected'], value: ['#e0e0e0', '#393939'] }
    ]);
  });

  it('should pass an icon button whose selected pair equals the button\'s rest pair', () => {
    const theme = readableTheme();
    theme.tokens['color.icon_button_primary_container_selected'] = '#0f62fe';
    theme.tokens['color.icon_button_primary_icon_selected'] = '#ffffff';
    assert.deepEqual(Themer.auditRoles(theme).findings.filter((f) => f.rule === 'distinct'), []);
  });

});


describe('auditRoles - highlight press feedback', () => {

  // A theme whose hover and active fills differ from their rest fills
  function highlightTheme (press) {
    const theme = readableTheme();
    Object.assign(theme.tokens, {
      'feedback.press': press,
      'color.background_hover': '#f4f4f4', 'color.background_active': '#c6c6c6',
      'color.button_primary_hover': '#0050e6', 'color.button_primary_active': '#002d9c',
      'color.button_secondary_hover': '#474747', 'color.button_danger_hover': '#a2191f',
      'color.button_tertiary_hover': '#0050e6', 'color.button_tonal_hover': '#e0e0e0'
    });
    return theme;
  }

  it('should pass a highlight theme whose hover and active fills step away from their rest fills', () => {
    assert.deepEqual(Themer.auditRoles(highlightTheme('highlight')).findings, []);
  });

  it('should report a hover fill equal to its rest fill when the theme shows press by swapping fills', () => {
    const theme = highlightTheme('highlight');
    theme.tokens['color.background_hover'] = '#ffffff';
    assert.deepEqual(Themer.auditRoles(theme).findings, [
      { rule: 'distinct', tokens: ['color.background_hover', 'color.background'], value: '#ffffff' }
    ]);
  });

  it('should not apply the fill rules when the theme shows press with a state layer', () => {
    const theme = highlightTheme('ripple');
    theme.tokens['color.background_hover'] = '#ffffff';
    assert.deepEqual(Themer.auditRoles(theme).findings, []);
  });

  it('should report a selected surface equal to the page under every press mode', () => {
    const theme = highlightTheme('ripple');
    theme.tokens['color.background_selected'] = '#ffffff';
    assert.deepEqual(Themer.auditRoles(theme).findings, [
      { rule: 'distinct', tokens: ['color.background_selected', 'color.background'], value: '#ffffff' }
    ]);
  });

});


describe('contract v5 amendment - the role grid', () => {

  const gridNames = tokenNames.filter(function (name) {
    return contract.tokens[name].grid === true;
  });

  it('should expose the grid by group and mark each cell', () => {
    assert.deepEqual(Object.keys(contract.grid), ['color', 'control', 'type', 'shadow', 'motion']);
    assert.equal(gridNames.length, 705);
    for (const group of Object.keys(contract.grid)) {
      for (const cell of contract.grid[group]) {
        assert.equal(contract.tokens[group + '.' + cell].group, group, group + '.' + cell);
      }
    }
  });

  it('should give every button kind the same fill, label, border and elevation cells', () => {
    const kinds = ['primary', 'secondary', 'tertiary', 'ghost', 'danger', 'danger_tertiary', 'danger_ghost', 'tonal', 'elevated'];
    for (const kind of kinds) {
      for (const state of ['', '_hover', '_active', '_focus', '_disabled', '_selected']) {
        assert.ok(contract.tokens['color.button_' + kind + '_container' + state], kind + ' container' + state);
        assert.ok(contract.tokens['color.button_' + kind + '_label' + state], kind + ' label' + state);
      }
      for (const state of ['', '_hover', '_active', '_disabled']) {
        assert.ok(contract.tokens['color.button_' + kind + '_border' + state], kind + ' border' + state);
        assert.ok(contract.tokens['shadow.button_' + kind + state], kind + ' elevation' + state);
      }
    }
  });

  it('should validate grid cells by their group', () => {
    assert.equal(Themer.validateContract({ tokens: { 'color.field_outline_disabled': 'rgba(29, 27, 32, 0.12)' } }, {}).success, true);
    assert.equal(Themer.validateContract({ tokens: { 'control.field_focus_offset': -2 } }, {}).success, true);
    assert.equal(Themer.validateContract({ tokens: { 'color.field_outline': 'outline' } }, {}).success, false);
  });

});


describe('contract v6 - the anchor families\' cells', () => {

  // Each family -> its cell names per group (the census's classified list)
  const FAMILIES = {
    color: {
      list: ['container', 'item_label', 'item_label_hover', 'item_label_selected', 'item_label_disabled', 'item_container_hover', 'item_container_active', 'item_container_selected', 'item_container_selected_hover', 'item_divider'],
      menu: ['item_danger_container_hover', 'item_danger_label', 'item_danger_label_hover', 'divider', 'item_icon', 'item_icon_hover', 'item_icon_disabled', 'item_shortcut', 'item_shortcut_hover'],
      text_area: ['container_hover', 'outline_disabled'],
      radio: ['outline_selected', 'outline_selected_hover', 'outline_selected_active', 'outline_selected_focus'],
      switch: ['outline', 'outline_hover', 'outline_focus', 'outline_active', 'outline_disabled', 'track', 'track_hover', 'track_focus', 'track_active', 'track_disabled', 'track_selected', 'track_selected_hover', 'track_selected_focus', 'track_selected_active', 'track_selected_disabled', 'handle', 'handle_hover', 'handle_focus', 'handle_active', 'handle_disabled', 'handle_selected', 'handle_selected_hover', 'handle_selected_focus', 'handle_selected_active', 'handle_selected_disabled', 'mark', 'mark_disabled', 'layer_hover', 'layer_active', 'layer_selected_hover', 'layer_selected_active', 'focus_ring'],
      tag: ['container', 'container_disabled', 'label', 'label_disabled', 'outline', 'outline_disabled', 'icon', 'icon_disabled'],
      progress: ['track', 'indicator', 'indicator_success', 'indicator_error'],
      tooltip: ['container', 'label'],
      tab: ['container', 'divider', 'track', 'track_hover', 'track_disabled', 'indicator', 'label', 'label_hover', 'label_selected', 'label_selected_hover', 'label_disabled', 'layer_hover', 'layer_active', 'layer_selected_hover', 'layer_selected_active', 'focus_ring', 'contained_container', 'contained_container_hover', 'contained_container_selected', 'contained_separator'],
      dialog: ['scrim', 'container', 'border', 'heading', 'body'],
      notification: ['container', 'text', 'close_icon', 'action', 'marker_error', 'marker_success', 'marker_info', 'marker_warning'],
      icon_button: ['ghost_icon', 'ghost_icon_hover', 'ghost_icon_active', 'ghost_icon_focus', 'ghost_icon_disabled', 'ghost_icon_selected', 'tertiary_icon', 'tertiary_icon_hover', 'tertiary_icon_active', 'tertiary_icon_focus', 'tertiary_icon_disabled', 'tertiary_icon_selected', 'primary_container_selected', 'secondary_container_selected', 'ghost_container_selected', 'tertiary_container_selected', 'primary_icon_selected', 'secondary_icon_selected']
    },
    control: {
      list: ['item_height', 'item_padding_inline', 'item_divider_width', 'padding_block', 'radius'],
      menu: ['padding_block', 'item_height', 'divider_width', 'icon_size', 'min_width', 'icon_min_width', 'item_gap'],
      radio: ['size', 'border', 'dot_size', 'focus_offset'],
      switch: ['track_width', 'track_height', 'outline_width', 'handle_size', 'handle_size_selected', 'handle_size_pressed', 'focus_width', 'focus_offset'],
      tag: ['height', 'radius', 'padding_inline', 'padding_icon', 'outline_width', 'icon_size'],
      progress: ['height', 'radius'],
      tooltip: ['padding_block', 'padding_inline', 'radius', 'caret_width', 'caret_height', 'offset', 'max_width', 'compact_padding_block', 'compact_caret_width', 'compact_caret_height', 'compact_offset'],
      tab: ['height', 'padding_inline', 'divider_width', 'track_width', 'indicator_width', 'indicator_radius', 'focus_width', 'focus_offset', 'contained_height', 'contained_padding_block', 'item_gap'],
      dialog: ['border_width', 'radius', 'min_width', 'max_width', 'padding_inline', 'padding_top', 'header_gap', 'body_padding_top', 'body_padding_bottom', 'actions_height', 'actions_gap', 'actions_padding', 'close_icon_size', 'header_space', 'min_height'],
      notification: ['width', 'radius', 'marker_width', 'icon_size'],
      icon_button: ['size', 'icon_size']
    },
    type: {
      list: ['item'],
      menu: ['item_shortcut'],
      text_area: ['value'],
      tag: ['label'],
      tooltip: ['label', 'compact_label'],
      tab: ['label', 'label_selected'],
      dialog: ['heading', 'body'],
      notification: ['title', 'body']
    },
    shadow: {
      list: [''],
      dialog: [''],
      notification: ['']
    }
  };

  it('should expose every cell of the eight new families and the member cells', () => {
    for (const group of Object.keys(FAMILIES)) {
      for (const family of Object.keys(FAMILIES[group])) {
        for (const leaf of FAMILIES[group][family]) {
          const cell = leaf === '' ? family : family + '_' + leaf;
          const name = group + '.' + cell;
          assert.ok(contract.tokens[name], 'missing ' + name);
          assert.equal(contract.tokens[name].grid, true, name + ' not a grid cell');
        }
      }
    }
  });

  it('should keep the v5 families\' cells and add the v6 cells to the grid', () => {
    for (const name of ['color.field_container', 'color.button_primary_label_hover', 'color.selection_container', 'control.field_outline_width', 'type.field_value', 'shadow.button_primary_hover']) {
      assert.equal(contract.tokens[name].grid, true, name);
    }
    assert.equal(contract.grid.color.includes('list_item_container_selected'), true);
    assert.equal(contract.grid.control.includes('dialog_close_icon_size'), true);
    assert.equal(contract.grid.type.includes('notification_title'), true);
    assert.equal(contract.grid.shadow.includes('dialog'), true);
  });

});


describe('contract v7 - the remaining atom families\' cells', () => {

  // Each family -> its cell names per group, in the request table's order
  const FAMILIES = {
    color: {
      button_set: ['separator', 'separator_disabled', 'separator_stacked_disabled'],
      divider: [''],
      link: ['label', 'label_hover', 'label_active', 'label_visited', 'label_disabled', 'focus_ring'],
      loading: ['indicator', 'track', 'scrim'],
      inline_loading: ['label', 'success', 'error'],
      saving: ['error_icon'],
      progress_step: ['icon', 'icon_incomplete', 'icon_disabled', 'icon_invalid', 'line', 'line_complete', 'label', 'label_hover', 'label_focus', 'label_disabled', 'secondary_label'],
      skeleton: ['container', 'shimmer'],
      tag_close: ['container_hover', 'focus_ring'],
      tag_dismissible: ['label'],
      tag_interactive: ['layer_active', 'outline', 'outline_disabled'],
      tag: ['focus_ring'],
      tag_selectable: ['container', 'container_hover', 'container_selected', 'container_selected_disabled', 'container_selected_hover', 'label', 'label_selected', 'label_selected_disabled', 'outline']
    },
    control: {
      button_set: ['item_max_width', 'gap', 'fluid_min_width', 'fluid_max_width', 'fluid_ghost_padding_start'],
      button_skeleton: ['width'],
      combo_button: ['min_width', 'max_width'],
      divider: ['width', 'inset'],
      link: ['focus_width', 'icon_gap', 'icon_size', 'icon_size_large'],
      loading: ['size', 'size_small', 'stroke_width', 'stroke_width_small', 'arc', 'arc_small'],
      inline_loading: ['gap'],
      saving: ['icon_gap'],
      progress_step: ['width', 'min_width', 'vertical_min_height', 'icon_gap', 'icon_top', 'line_width', 'label_max_width', 'label_max_width_vertical', 'label_gap', 'skeleton_label_width', 'skeleton_label_height'],
      skeleton: ['radius', 'placeholder_size', 'text_height', 'text_gap', 'heading_height'],
      tag_skeleton: ['width'],
      tag_close: ['gap', 'icon_size', 'inset'],
      tag_interactive: ['outline_width'],
      tag: ['focus_width', 'focus_offset', 'height_small'],
      tag_selectable: ['outline_width_selected']
    },
    type: {
      link: ['label', 'label_small', 'label_large'],
      inline_loading: ['label'],
      saving: ['label'],
      progress_step: ['label', 'secondary_label']
    },
    shadow: {
    },
    motion: {
      loading: ['rotation', 'arc_cycle', 'arc_easing'],
      skeleton: ['cycle']
    }
  };

  it('should expose every v7 cell in its group, marked a grid cell', () => {
    for (const group of Object.keys(FAMILIES)) {
      for (const family of Object.keys(FAMILIES[group])) {
        for (const leaf of FAMILIES[group][family]) {
          const cell = leaf === '' ? family : family + '_' + leaf;
          const name = group + '.' + cell;
          assert.ok(contract.tokens[name], 'missing ' + name);
          assert.equal(contract.tokens[name].group, group, name + ' not in group ' + group);
          assert.equal(contract.tokens[name].grid, true, name + ' not a grid cell');
        }
      }
    }
  });

  it('should add the motion group to the grid and emit its cells as durations, the arc easing as an easing', () => {
    assert.deepEqual(contract.grid.motion, ['loading_rotation', 'loading_arc_cycle', 'loading_arc_easing', 'skeleton_cycle']);
    assert.deepEqual(contract.meta['motion.loading_rotation'], { group: 'duration' });
    assert.deepEqual(contract.meta['motion.loading_arc_easing'], { group: 'easing' });
    const engine = themerLoader(Lib, {});
    const template = {
      tokens: { 'motion.loading_rotation': 690 },
      meta: { 'motion.loading_rotation': { group: 'duration' } }
    };
    assert.equal(engine.buildTheme(template, [], 'native').tokens['motion.loading_rotation'], 690);
  });

  it('should answer the four new anatomy enums with their value lists', () => {
    assert.deepEqual(contract.tokens['anatomy.loading_motion'].values, ['spin', 'arc']);
    assert.deepEqual(contract.tokens['anatomy.tag_close'].values, ['circle', 'inset']);
    assert.deepEqual(contract.tokens['anatomy.tag_selected_mark'].values, ['shown', 'hidden']);
    assert.deepEqual(contract.tokens['anatomy.tag_interactive_outline'].values, ['border', 'inset']);
  });

  it('should carry the save icon token', () => {
    assert.deepEqual(contract.tokens['icon.save'], { group: 'icon' });
  });

  it('should audit the v7 role pairs: link contrast, shimmer distinctness, the selectable tag pair', () => {
    const theme = readableTheme();
    theme.tokens['color.link_label'] = '#8d8d8d';
    let result = Themer.auditRoles(theme);
    assert.equal(result.findings.some(function (f) {
      return f.rule === 'contrast' && f.tokens[0] === 'color.link_label' && f.tokens[1] === 'color.background';
    }), true, 'link_label on background not audited');
    theme.tokens['color.link_label'] = '#0f62fe';
    theme.tokens['color.skeleton_shimmer'] = '#e0e0e0';
    result = Themer.auditRoles(theme);
    assert.deepEqual(result.findings.filter(function (f) {
      return f.rule === 'distinct' && f.tokens[0] === 'color.skeleton_shimmer';
    }), [
      { rule: 'distinct', tokens: ['color.skeleton_shimmer', 'color.skeleton_container'], value: '#e0e0e0' }
    ]);
    theme.tokens['color.skeleton_shimmer'] = '#c6c6c6';
    theme.tokens['color.tag_selectable_container_selected'] = '#e0e0e0';
    theme.tokens['color.tag_selectable_label_selected'] = '#161616';
    result = Themer.auditRoles(theme);
    assert.equal(result.findings.some(function (f) {
      return f.rule === 'distinct' && f.tokens[0] === 'color.tag_selectable_container_selected';
    }), true, 'selected tag pair not audited');
  });

});



describe('contract v8 - the milestone 4 cells', () => {

  // Each family -> its cell names per group, in the census's order
  const FAMILIES = {
    color: {
      field_action: ['container_hover', 'container_active'],
      password_toggle: ['container_hover', 'container_active'],
      number_input: ['divider'],
      slider: ['range_label', 'track', 'track_filled', 'track_filled_focus', 'handle', 'handle_focus', 'handle_gap_focus', 'state_layer_hover', 'state_layer_focus', 'state_layer_active', 'disabled', 'track_disabled'],
      select: ['group_label'],
      popover: ['container', 'label', 'border'],
      definition_term: ['underline', 'underline_hover'],
      toggletip: ['icon', 'icon_active'],
      link_label_inverse: ['', '_hover'],
      focus_ring_inverse: [''],
      fab_surface: ['container', 'icon', 'layer_hover', 'layer_active'],
      fab_primary: ['container', 'icon', 'layer_hover', 'layer_active'],
      fab_secondary: ['container', 'icon', 'layer_hover', 'layer_active'],
      fab_tertiary: ['container', 'icon', 'layer_hover', 'layer_active']
    },
    control: {
      field_action: ['inset', 'size', 'gap'],
      field_skeleton: ['label_width', 'label_height'],
      time_picker: ['input_width', 'input_width_invalid', 'select_gap'],
      number_input: ['divider_height'],
      checkbox_group: ['gap'],
      radio_group: ['gap_horizontal', 'gap_vertical'],
      selection_skeleton: ['label_width'],
      toggle_skeleton: ['bar_width', 'bar_height'],
      slider: ['gap', 'padding_block', 'min_width', 'max_width', 'track_height', 'track_radius', 'tick_height', 'handle_size', 'handle_size_active', 'state_layer_size', 'input_width', 'input_width_invalid', 'skeleton_range_width', 'skeleton_range_height'],
      multi_select: ['checkbox_inset'],
      popover: ['radius', 'caret_width', 'caret_height', 'offset'],
      definition_tooltip: ['max_width', 'padding_block', 'padding_inline'],
      toggletip: ['offset', 'max_width'],
      fab: ['size', 'size_small', 'size_large', 'icon_size', 'icon_size_large', 'radius', 'radius_small', 'radius_large', 'extended_padding', 'label_gap'],
      tag_set: ['gap']
    },
    type: {
      time_picker: ['value'],
      slider: ['range_label'],
      select: ['group_label'],
      fab: ['label']
    },
    shadow: {
      slider: ['handle'],
      popover: [''],
      fab: ['', '_hover']
    }
  };

  const EXTRA = {
    color: ['field_leading_icon', 'search_icon_disabled']
  };

  it('should expose every v8 cell in its group, marked a grid cell', () => {
    for (const group of Object.keys(FAMILIES)) {
      for (const family of Object.keys(FAMILIES[group])) {
        for (const leaf of FAMILIES[group][family]) {
          const cell = leaf === '' ? family : leaf.charAt(0) === '_' ? family + leaf : family + '_' + leaf;
          const name = group + '.' + cell;
          assert.ok(contract.tokens[name], 'missing ' + name);
          assert.equal(contract.tokens[name].group, group, name + ' not in group ' + group);
          assert.equal(contract.tokens[name].grid, true, name + ' not a grid cell');
        }
      }
    }
    for (const group of Object.keys(EXTRA)) {
      for (const cell of EXTRA[group]) {
        const name = group + '.' + cell;
        assert.ok(contract.tokens[name], 'missing ' + name);
        assert.equal(contract.tokens[name].grid, true, name + ' not a grid cell');
      }
    }
  });

  it('should have removed the quick action kind and the view and landing cells', () => {
    for (const name of [
      'color.button_quick_action_container', 'color.button_quick_action_label', 'color.button_quick_action_border',
      'shadow.button_quick_action', 'control.button_quick_action_focus_gap_width',
      'color.view_background', 'color.view_navigation_background',
      'color.landing_banner', 'control.landing_banner_height', 'control.landing_banner_min_window_height',
      'control.landing_company_image_width', 'control.landing_company_image_height', 'control.landing_product_image_size',
      'type.landing_title', 'anatomy.slider_handle'
    ]) {
      assert.equal(contract.tokens[name], undefined, name + ' should be gone');
    }
  });

  it('should carry the new icon token', () => {
    assert.deepEqual(contract.tokens['icon.visibility_on'], { group: 'icon' });
  });

});


describe('contract v8 - leveled tokens', () => {

  // The contract marks the layered-surface sets, in set order
  it('should declare the fifteen leveled sets in set order', () => {
    assert.deepEqual(contract.leveled, {
      layer: ['layer_01', 'layer_02', 'layer_03'],
      layer_active: ['layer_active_01', 'layer_active_02', 'layer_active_03'],
      layer_background: ['layer_background_01', 'layer_background_02', 'layer_background_03'],
      layer_hover: ['layer_hover_01', 'layer_hover_02', 'layer_hover_03'],
      layer_selected: ['layer_selected_01', 'layer_selected_02', 'layer_selected_03'],
      layer_selected_hover: ['layer_selected_hover_01', 'layer_selected_hover_02', 'layer_selected_hover_03'],
      layer_accent: ['layer_accent_01', 'layer_accent_02', 'layer_accent_03'],
      layer_accent_hover: ['layer_accent_hover_01', 'layer_accent_hover_02', 'layer_accent_hover_03'],
      layer_accent_active: ['layer_accent_active_01', 'layer_accent_active_02', 'layer_accent_active_03'],
      field: ['field_01', 'field_02', 'field_03'],
      field_hover: ['field_hover_01', 'field_hover_02', 'field_hover_03'],
      border_subtle: ['border_subtle_00', 'border_subtle_01', 'border_subtle_02', 'border_subtle_03'],
      border_subtle_selected: ['border_subtle_selected_01', 'border_subtle_selected_02', 'border_subtle_selected_03'],
      border_strong: ['border_strong_01', 'border_strong_02', 'border_strong_03'],
      border_tile: ['border_tile_01', 'border_tile_02', 'border_tile_03']
    });
    for (const members of Object.values(contract.leveled)) {
      for (const member of members) {
        assert.ok(contract.tokens['color.' + member], 'leveled member not a token: ' + member);
      }
    }
  });

  // A template whose leveled members carry distinct literals, so an
  // alias's level value names the shifted member it re-resolved to
  const leveledTemplate = function (extra) {
    return {
      tokens: Object.assign({
        'color.field_01': '#010101',
        'color.field_02': '#020202',
        'color.field_03': '#030303',
        'color.layer_01': '#0a0a0a',
        'color.layer_02': '#0b0b0b',
        'color.layer_03': '#0c0c0c',
        'color.border_subtle_00': '#100000',
        'color.border_subtle_01': '#110000',
        'color.border_subtle_02': '#120000',
        'color.border_subtle_03': '#130000'
      }, extra)
    };
  };

  it('should read an alias to field_01 at levels 2 and 3 as field_02 and field_03', () => {
    const theme = Themer.buildTheme(leveledTemplate({ 'color.f': '{color.field_01}' }), [], 'web');
    assert.equal(theme.tokens['color.f'], '#010101');
    assert.equal(theme.levels[2]['color.f'], '#020202');
    assert.equal(theme.levels[3]['color.f'], '#030303');
  });

  it('should read an alias to border_subtle_00 at levels 2 and 3 as _01 and _02', () => {
    const theme = Themer.buildTheme(leveledTemplate({ 'color.b': '{color.border_subtle_00}' }), [], 'web');
    assert.equal(theme.tokens['color.b'], '#100000');
    assert.equal(theme.levels[2]['color.b'], '#110000');
    assert.equal(theme.levels[3]['color.b'], '#120000');
  });

  it('should leave a literal out of levels', () => {
    const theme = Themer.buildTheme(leveledTemplate({ 'color.f': '#010101' }), [], 'web');
    assert.equal('color.f' in theme.levels[2], false);
    assert.equal('color.f' in theme.levels[3], false);
    assert.equal('color.field_01' in theme.levels[2], false);
  });

  it('should move a two-step alias chain by its leveled member', () => {
    const theme = Themer.buildTheme(leveledTemplate({
      'color.a': '{color.b}',
      'color.b': '{color.field_01}'
    }), [], 'web');
    assert.equal(theme.tokens['color.a'], '#010101');
    assert.equal(theme.levels[2]['color.a'], '#020202');
    assert.equal(theme.levels[3]['color.a'], '#030303');
  });

  it('should cap the shift at the last member of each set', () => {
    const theme = Themer.buildTheme(leveledTemplate({
      'color.l': '{color.layer_03}',
      'color.b': '{color.border_subtle_03}'
    }), [], 'web');
    assert.equal(theme.levels[2]['color.l'], '#0c0c0c');
    assert.equal(theme.levels[3]['color.l'], '#0c0c0c');
    assert.equal(theme.levels[2]['color.b'], '#130000');
    assert.equal(theme.levels[3]['color.b'], '#130000');
  });

  // Levels read the effective authored value: the template's tokens with
  // every layer's pins applied in order, the last pin winning

  it('should drop a leveled read when a layer pins the role to a literal', () => {
    const theme = Themer.buildTheme(leveledTemplate({ 'color.f': '{color.field_01}' }),
      [{ name: 'brand', tokens: { 'color.f': '#ff0000' } }], 'web');
    assert.equal(theme.tokens['color.f'], '#ff0000');
    assert.equal('color.f' in theme.levels[2], false);
    assert.equal('color.f' in theme.levels[3], false);
  });

  it('should shift from the member a layer redirects the role to', () => {
    const theme = Themer.buildTheme(leveledTemplate({ 'color.f': '{color.field_01}' }),
      [{ name: 'brand', tokens: { 'color.f': '{color.field_02}' } }], 'web');
    assert.equal(theme.tokens['color.f'], '#020202');
    assert.equal(theme.levels[2]['color.f'], '#030303');
    assert.equal(theme.levels[3]['color.f'], '#030303');
  });

  it('should add a leveled read when a layer pins a literal role to an alias', () => {
    const theme = Themer.buildTheme(leveledTemplate({ 'color.f': '#909090' }),
      [{ name: 'brand', tokens: { 'color.f': '{color.field_01}' } }], 'web');
    assert.equal(theme.tokens['color.f'], '#010101');
    assert.equal(theme.levels[2]['color.f'], '#020202');
    assert.equal(theme.levels[3]['color.f'], '#030303');
  });

  it('should stop a chain at an intermediate member a layer pins to a literal', () => {
    const theme = Themer.buildTheme(leveledTemplate({
      'color.a': '{color.b}',
      'color.b': '{color.field_01}'
    }), [{ name: 'brand', tokens: { 'color.b': '#ff0000' } }], 'web');
    assert.equal(theme.tokens['color.a'], '#ff0000');
    assert.equal('color.a' in theme.levels[2], false);
    assert.equal('color.a' in theme.levels[3], false);
    assert.equal('color.b' in theme.levels[2], false);
    assert.equal('color.b' in theme.levels[3], false);
  });

  it('should let the last layer pin win, alias or literal', () => {
    const literal_last = Themer.buildTheme(leveledTemplate({ 'color.f': '{color.field_01}' }),
      [{ name: 'a', tokens: { 'color.f': '{color.field_02}' } }, { name: 'b', tokens: { 'color.f': '#ff0000' } }], 'web');
    assert.equal(literal_last.tokens['color.f'], '#ff0000');
    assert.equal('color.f' in literal_last.levels[2], false);
    assert.equal('color.f' in literal_last.levels[3], false);
    const alias_last = Themer.buildTheme(leveledTemplate({ 'color.f': '{color.field_01}' }),
      [{ name: 'a', tokens: { 'color.f': '#ff0000' } }, { name: 'b', tokens: { 'color.f': '{color.field_02}' } }], 'web');
    assert.equal(alias_last.tokens['color.f'], '#020202');
    assert.equal(alias_last.levels[2]['color.f'], '#030303');
    assert.equal(alias_last.levels[3]['color.f'], '#030303');
  });

  it('should emit a shifted member pinned to a literal as that literal', () => {
    const theme = Themer.buildTheme(leveledTemplate({ 'color.f': '{color.field_01}' }),
      [{ name: 'brand', tokens: { 'color.field_02': '#00ff00' } }], 'web');
    assert.equal(theme.tokens['color.f'], '#010101');
    assert.equal(theme.levels[2]['color.f'], '#00ff00');
    assert.equal(theme.levels[3]['color.f'], '#030303');
  });

  it('should not mutate the template or the layers it reads', () => {
    const template = leveledTemplate({ 'color.f': '{color.field_01}' });
    const layers = [{ name: 'brand', tokens: { 'color.f': '{color.field_02}' } }];
    const template_json = JSON.stringify(template);
    const layers_json = JSON.stringify(layers);
    Themer.buildTheme(template, layers, 'web');
    assert.equal(JSON.stringify(template), template_json);
    assert.equal(JSON.stringify(layers), layers_json);
  });

});
