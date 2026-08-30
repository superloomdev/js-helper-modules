// Ported from lab S3-resolver: Carbon conformance, sparsity, and generativity.
//
// Proves the resolution chain reproduces the four Carbon themes exactly,
// as sparse overlays of literals over rule-derived defaults.
//
// Re-keyed from camelCase to snake_case per LD13. Lab's internal functions
// (contrastRatio) and performance measurements are omitted.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import loader from './loader.js';
import themerLoader from 'helper-themer';
import inventory from './fixtures/carbon-inventory.json' with { type: 'json' };

const { Lib } = loader();
const Themer = themerLoader(Lib, {});
const THEMES = ['white', 'g10', 'g90', 'g100'];
const PRODUCT_GROUPS = ['syntax', 'ai', 'chat'];

const palette = inventory.palette;


// Build the neutral ramp

const BASE_RAMP_NAMES = ['white', 'gray10', 'gray20', 'gray30', 'gray40', 'gray50', 'gray60', 'gray70', 'gray80', 'gray90', 'gray100'];
const ramp = BASE_RAMP_NAMES.map(function (n) { return palette[n].toLowerCase(); });
const rampIndex = {};
ramp.forEach(function (hex, i) { rampIndex[hex] = i; });

// Hover variants map back onto their base step for rule authoring
const hoverToBase = {};
BASE_RAMP_NAMES.forEach(function (n, i) {
  if (palette[n + 'Hover']) {
    hoverToBase[palette[n + 'Hover'].toLowerCase()] = i;
  }
});

// hex -> palette name, for identifying hue families
const nameByHex = {};
for (const [name, hex] of Object.entries(palette)) {
  const h = hex.toLowerCase();
  if (!nameByHex[h]) {
    nameByHex[h] = name;
  }
}

const generalTokens = Object.keys(inventory.resolved.white)
  .filter(function (k) { return !PRODUCT_GROUPS.includes(k.split('.')[0]); })
  .sort();


// Author a default rule for every token, using the white theme as reference

const REFERENCE = 'white';
const referenceAnchor = rampIndex[inventory.resolved[REFERENCE]['background'].hex.toLowerCase()];

const templateTokens = {};

for (const token of generalTokens) {
  const hex = inventory.resolved[REFERENCE][token].hex.toLowerCase();

  if (rampIndex[hex] !== undefined) {
    templateTokens[token] = { op: 'rampStep', args: [rampIndex[hex] - referenceAnchor] };
    continue;
  }

  if (hoverToBase[hex] !== undefined) {
    templateTokens[token] = { op: 'rampStep', args: [hoverToBase[hex] - referenceAnchor] };
    continue;
  }

  const paletteName = nameByHex[hex];
  const match = paletteName && paletteName.match(/^([a-z]+)(\d+)$/);
  if (match) {
    templateTokens[token] = { op: 'hue', args: [match[1], Number(match[2])] };
    continue;
  }

  templateTokens[token] = hex;
}

const CONTRAST_RULES = [
  ['text.primary', 'background', 4.5],
  ['text.secondary', 'background', 4.5],
  ['text.helper', 'background', 4.5],
  ['text.error', 'background', 4.5],
  ['text.primary', 'layer.01', 4.5],
  ['text.secondary', 'layer.01', 4.5],
  ['border.strong.01', 'background', 3.0],
  ['border.interactive', 'background', 3.0],
  ['link.primary', 'background', 4.5],
  ['icon.primary', 'background', 3.0]
];

const template = {
  tokens: templateTokens,
  ramp: ramp,
  palette: palette,
  polarity: 'light',
  contrast_rules: CONTRAST_RULES
};


// Build and verify each Carbon theme

const builtThemes = {};

for (const themeName of THEMES) {
  const polarity = inventory.schemes[themeName];

  // First pass: resolve with nothing pinned except the background anchor
  const anchor = {
    name: themeName + '-anchor',
    polarity: polarity,
    tokens: { background: inventory.resolved[themeName]['background'].hex.toLowerCase() }
  };
  const firstPass = Themer.resolve(template, [anchor]);

  // Pin only the tokens the rules got wrong
  const pins = {};
  for (const token of generalTokens) {
    const want = inventory.resolved[themeName][token].hex.toLowerCase();
    if (firstPass.tokens[token] !== want) {
      pins[token] = want;
    }
  }

  const themeLayer = {
    name: themeName,
    polarity: polarity,
    tokens: Object.assign({ background: inventory.resolved[themeName]['background'].hex.toLowerCase() }, pins)
  };

  builtThemes[themeName] = { layer: themeLayer };
}


describe('Carbon conformance - reproduce each theme exactly', () => {

  for (const themeName of THEMES) {

    it('should reproduce the ' + themeName + ' theme with zero mismatches', () => {

      const final = Themer.resolve(template, [builtThemes[themeName].layer]);

      let mismatches = 0;
      for (const token of generalTokens) {
        if (final.tokens[token] !== inventory.resolved[themeName][token].hex.toLowerCase()) {
          mismatches++;
        }
      }

      assert.equal(mismatches, 0, themeName + ' has ' + mismatches + ' mismatched tokens');

    });

  }

});


describe('Carbon conformance - sparsity', () => {

  for (const themeName of THEMES) {

    it('should derive at least one token from rules for ' + themeName, () => {

      const pinnedCount = Object.keys(builtThemes[themeName].layer.tokens).length;

      assert.ok(pinnedCount < generalTokens.length,
        themeName + ' pins ' + pinnedCount + ' of ' + generalTokens.length + ' tokens, none derived');

    });

  }

});


describe('Carbon conformance - generativity (white-label case)', () => {

  const brandLight = {
    name: 'acme-light',
    polarity: 'light',
    tokens: {
      background: '#ffffff',
      'border.interactive': '#7c3aed',
      'link.primary': '#7c3aed',
      'focus': '#7c3aed'
    }
  };

  const brandDark = {
    name: 'acme-dark',
    polarity: 'dark',
    tokens: {
      background: '#161616',
      'border.interactive': '#a78bfa',
      'link.primary': '#a78bfa',
      'focus': '#a78bfa'
    }
  };

  it('should produce all tokens from 4 pins for acme-light', () => {

    const result = Themer.resolve(template, [brandLight]);
    const produced = Object.keys(result.tokens).length;

    assert.equal(produced, generalTokens.length);

  });

  it('should produce all tokens from 4 pins for acme-dark', () => {

    const result = Themer.resolve(template, [brandDark]);
    const produced = Object.keys(result.tokens).length;

    assert.equal(produced, generalTokens.length);

  });

  it('should resolve the pinned brand color for acme-light', () => {

    const result = Themer.resolve(template, [brandLight]);

    assert.equal(result.tokens['link.primary'], '#7c3aed');
    assert.equal(result.tokens['border.interactive'], '#7c3aed');
    assert.equal(result.tokens['focus'], '#7c3aed');

  });

  it('should resolve the pinned brand color for acme-dark', () => {

    const result = Themer.resolve(template, [brandDark]);

    assert.equal(result.tokens['link.primary'], '#a78bfa');
    assert.equal(result.tokens['border.interactive'], '#a78bfa');
    assert.equal(result.tokens['focus'], '#a78bfa');

  });

});


describe('Carbon conformance - alias support', () => {

  it('should retarget a family through an alias', () => {

    const aliasTheme = {
      name: 'alias-demo',
      polarity: 'light',
      tokens: {
        background: '#ffffff',
        'link.primary': '#7c3aed',
        'border.interactive': '{link.primary}',
        'focus': '{link.primary}'
      }
    };

    const result = Themer.resolve(template, [aliasTheme]);

    assert.equal(result.tokens['link.primary'], '#7c3aed');
    assert.equal(result.tokens['border.interactive'], '#7c3aed');
    assert.equal(result.tokens['focus'], '#7c3aed');

  });

  it('should reject an alias cycle', () => {

    assert.throws(
      () => Themer.resolve(template, [{
        name: 'cycle',
        polarity: 'light',
        tokens: { 'focus': '{link.primary}', 'link.primary': '{focus}' }
      }]),
      /\[helper-themer\]/
    );

  });

});
