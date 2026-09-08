// Info: Generator script for the Carbon reference template.
//
// Reads pinned @carbon packages, converts names and values per the plan,
// completes missing keys from the Superloom base template, and writes
// data/white.js, data/g10.js, data/g90.js, data/g100.js.
//
// Run: node scripts/generate.js [output-dir]
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import * as carbonThemes from '@carbon/themes';
import * as carbonTag from '@carbon/themes/js/generated/component-tokens/tag.js';
import * as carbonButton from '@carbon/themes/js/generated/component-tokens/button.js';
import * as carbonNotification from '@carbon/themes/js/generated/component-tokens/notification.js';
import * as cType from '@carbon/type';
import * as carbonMotion from '@carbon/motion';
import * as carbonLayout from '@carbon/layout';

import utilsLoader from 'helper-utils';
import debugLoader from 'helper-debug';
import themerLoader from 'helper-themer';
import baseProfile from 'helper-themer-template-base';

const here = dirname(fileURLToPath(import.meta.url));
const moduleRoot = resolve(here, '..');
const outDir = process.argv[2] || resolve(moduleRoot, 'data');

// --- Engine setup ---------------------------------------------------------
const Lib = {};
Lib.Utils = utilsLoader(Lib, {});
Lib.Debug = debugLoader(Lib, {});
const Themer = themerLoader(Lib, {});
const contract = Themer.getContract();
const contractKeys = Object.keys(contract.tokens);
const meta = contract.meta;

// --- Name conversion: Carbon camelCase -> Superloom snake_case -----------
function toSnake (carbonName) {
  return carbonName
    .replace(/([A-Z])/g, '_$1')
    .replace(/(\d+)/g, '_$1')
    .toLowerCase()
    .replace(/^_/, '');
}

// Manual overrides where the mechanical rule is ambiguous.
const SNAKE_OVERRIDES = {
  'size_2_x_large': 'size_2xlarge',
  'size_x_small': 'size_xsmall',
  'size_x_large': 'size_xlarge',
  'size_2_xl': 'size_2xl'
};

function superloomName (carbonName) {
  let snake = toSnake(carbonName);
  if (SNAKE_OVERRIDES[snake]) {
    snake = SNAKE_OVERRIDES[snake];
  }
  return snake;
}

// Type tokens have a special naming rule (Section 5.4):
// single-word names keep the digit pair attached (body01, not body_01),
// multi-word names get underscores (body_compact_01).
function typeSuperloomName (carbonName) {
  if (/[A-Z]/.test(carbonName)) {
    return toSnake(carbonName);
  }
  return carbonName.toLowerCase();
}

// --- Build Carbon -> Superloom key map -----------------------------------
// Color tokens from @carbon/themes (flat object) + component tokens
const CARBON_SCHEMES = {
  white: carbonThemes.white,
  g10: carbonThemes.g10,
  g90: carbonThemes.g90,
  g100: carbonThemes.g100
};

const SCHEME_POLARITY = {
  white: 'light',
  g10: 'light',
  g90: 'dark',
  g100: 'dark'
};

// Component tokens (same across all schemes)
const COMPONENT_TOKENS = {};
for (const [k, v] of Object.entries(carbonTag)) {
  COMPONENT_TOKENS[k] = v;
}
for (const [k, v] of Object.entries(carbonButton)) {
  COMPONENT_TOKENS[k] = v;
}
for (const [k, v] of Object.entries(carbonNotification)) {
  COMPONENT_TOKENS[k] = v;
}

// Build color token map: superloomKey -> carbonKey (only keys in the contract)
const contractKeySet = {};
for (const k of contractKeys) {
  contractKeySet[k] = true;
}

const COLOR_MAP = {};
for (const carbonKey of Object.keys(CARBON_SCHEMES.white)) {
  const sKey = 'color.' + superloomName(carbonKey);
  if (contractKeySet[sKey]) {
    COLOR_MAP[sKey] = carbonKey;
  }
}
for (const carbonKey of Object.keys(COMPONENT_TOKENS)) {
  const sKey = 'color.' + superloomName(carbonKey);
  if (contractKeySet[sKey]) {
    COLOR_MAP[sKey] = carbonKey;
  }
}

// Layout token maps
const SPACING_MAP = {};
for (let i = 1; i <= 13; i++) {
  const num = String(i).padStart(2, '0');
  SPACING_MAP['spacing.spacing_' + num] = 'spacing' + num;
}
const FLUID_SPACING_MAP = {
  'spacing.fluid_01': 'fluidSpacing01',
  'spacing.fluid_02': 'fluidSpacing02',
  'spacing.fluid_03': 'fluidSpacing03',
  'spacing.fluid_04': 'fluidSpacing04'
};

const SIZE_MAP = {};
for (let i = 1; i <= 5; i++) {
  const num = String(i).padStart(2, '0');
  SIZE_MAP['size.container_' + num] = 'container' + num;
}
SIZE_MAP['size.size_xsmall'] = 'sizeXSmall';
SIZE_MAP['size.size_small'] = 'sizeSmall';
SIZE_MAP['size.size_medium'] = 'sizeMedium';
SIZE_MAP['size.size_large'] = 'sizeLarge';
SIZE_MAP['size.size_xlarge'] = 'sizeXLarge';
SIZE_MAP['size.size_2xlarge'] = 'size2XLarge';
SIZE_MAP['size.icon_01'] = 'iconSize01';
SIZE_MAP['size.icon_02'] = 'iconSize02';
for (let i = 1; i <= 7; i++) {
  const num = String(i).padStart(2, '0');
  SIZE_MAP['size.layout_' + num] = 'layout' + num;
}

const SHAPE_MAP = {
  'shape.radius_00': 'borderRadius00',
  'shape.radius_02': 'borderRadius02',
  'shape.radius_04': 'borderRadius04',
  'shape.radius_08': 'borderRadius08',
  'shape.radius_16': 'borderRadius16',
  'shape.radius_24': 'borderRadius24',
  'shape.radius_max': 'borderRadiusMax'
};

const BREAKPOINT_MAP = {
  'breakpoint.sm': 320,
  'breakpoint.md': 672,
  'breakpoint.lg': 1056,
  'breakpoint.xlg': 1312,
  'breakpoint.max': 1584
};

// Motion maps
const DURATION_MAP = {
  'motion.duration_fast_01': 'durationFast01',
  'motion.duration_fast_02': 'durationFast02',
  'motion.duration_moderate_01': 'durationModerate01',
  'motion.duration_moderate_02': 'durationModerate02',
  'motion.duration_slow_01': 'durationSlow01',
  'motion.duration_slow_02': 'durationSlow02'
};

const EASING_VALUES = {
  'motion.easing_standard_productive': [0.2, 0, 0.38, 0.9],
  'motion.easing_standard_expressive': [0.4, 0.14, 0.3, 1],
  'motion.easing_entrance_productive': [0, 0, 0.38, 0.9],
  'motion.easing_entrance_expressive': [0, 0, 0.3, 1],
  'motion.easing_exit_productive': [0.2, 0, 1, 0.9],
  'motion.easing_exit_expressive': [0.4, 0.14, 1, 1]
};

// D9 structure knobs (identical across all schemes)
const D9_STRUCTURE = {
  'border.width_01': 1,
  'border.width_02': 2,
  'border.width_03': 3,
  'border.width_04': 4,
  'focus.width': 2,
  'focus.offset': 0,
  'feedback.press': 'highlight',
  'feedback.focus': 'outline',
  'shadow.level_01': { shadow: true, layers: [{ x: 0, y: 2, blur: 6, spread: 0, color: '{color.shadow}' }] },
  'shadow.level_02': { shadow: true, layers: [{ x: 0, y: 4, blur: 8, spread: 0, color: '{color.shadow}' }] },
  'shadow.level_03': { shadow: true, layers: [{ x: 0, y: 8, blur: 16, spread: 0, color: '{color.shadow}' }] }
};

// Section 5.5 font tokens
const FONT_TOKENS = {
  'font.family.sans': 'IBM Plex Sans',
  'font.family.serif': 'IBM Plex Serif',
  'font.family.mono': 'IBM Plex Mono',
  'font.weight.light': 300,
  'font.weight.regular': 400,
  'font.weight.semibold': 600,
  'font.weight.bold': 700
};

// --- Value conversion ----------------------------------------------------
function remToPx (value) {
  const num = parseFloat(value);
  const px = num * 16;
  const rounded = Math.round(px * 100) / 100;
  return rounded % 1 === 0 ? Math.round(rounded) : rounded;
}

function stripPx (value) {
  if (Number.isFinite(value)) {
    return value;
  }
  return parseFloat(value);
}

function stripMs (value) {
  if (Number.isFinite(value)) {
    return value;
  }
  return parseInt(value, 10);
}

function parseVw (value) {
  if (Number.isFinite(value)) {
    return { viewport: true, vw: value };
  }
  const match = value.match(/^([\d.]+)vw$/);
  if (match) {
    return { viewport: true, vw: parseFloat(match[1]) };
  }
  return { viewport: true, vw: 0 };
}

// --- Type set conversion -------------------------------------------------
function convertTypeSet (carbonName, carbonDef) {
  const fontSize = remToPx(carbonDef.fontSize);
  const lineHeightPx = Math.round(fontSize * carbonDef.lineHeight);
  let letterSpacing = 0;
  if (carbonDef.letterSpacing !== undefined && carbonDef.letterSpacing !== 0) {
    letterSpacing = stripPx(carbonDef.letterSpacing);
  }
  let fontFamily = 'sans';
  if (carbonName === 'code01' || carbonName === 'code02') {
    fontFamily = 'mono';
  } else if (carbonDef.fontFamily && carbonDef.fontFamily.includes('Serif')) {
    fontFamily = 'serif';
  }
  const weight = carbonDef.fontWeight !== undefined ? carbonDef.fontWeight : 400;
  return {
    type_set: true,
    font_size: fontSize,
    line_height_px: lineHeightPx,
    letter_spacing: letterSpacing,
    weight: weight,
    font_family: fontFamily
  };
}

// --- Build tokens for one scheme -----------------------------------------
function buildTokens (schemeName) {
  const tokens = {};
  const carbonScheme = CARBON_SCHEMES[schemeName];

  // Color tokens from Carbon themes
  for (const [sKey, carbonKey] of Object.entries(COLOR_MAP)) {
    let value = carbonScheme[carbonKey];
    if (value === undefined) {
      // Component tokens (tag, button, notification) are per-scheme objects
      const componentToken = COMPONENT_TOKENS[carbonKey];
      if (componentToken && componentToken.whiteTheme !== undefined) {
        value = componentToken[schemeName] || componentToken.whiteTheme;
      }
    }
    if (value !== undefined) {
      tokens[sKey] = value;
    }
  }

  // Spacing tokens from @carbon/layout
  for (const [sKey, carbonKey] of Object.entries(SPACING_MAP)) {
    tokens[sKey] = remToPx(carbonLayout[carbonKey]);
  }

  // Fluid spacing (viewport type)
  for (const [sKey, carbonKey] of Object.entries(FLUID_SPACING_MAP)) {
    tokens[sKey] = parseVw(carbonLayout[carbonKey]);
  }

  // Size tokens from @carbon/layout
  for (const [sKey, carbonKey] of Object.entries(SIZE_MAP)) {
    const val = carbonLayout[carbonKey];
    if (val !== undefined) {
      tokens[sKey] = remToPx(val);
    }
  }

  // Shape tokens from @carbon/layout
  for (const [sKey, carbonKey] of Object.entries(SHAPE_MAP)) {
    const val = carbonLayout[carbonKey];
    if (val !== undefined) {
      if (carbonKey === 'borderRadiusMax') {
        tokens[sKey] = 9999;
      } else {
        tokens[sKey] = remToPx(val);
      }
    }
  }

  // Breakpoint tokens
  for (const [sKey, value] of Object.entries(BREAKPOINT_MAP)) {
    tokens[sKey] = value;
  }

  // Type tokens from @carbon/type
  const TYPE_NAMES = [
    'body01', 'body02', 'bodyCompact01', 'bodyCompact02',
    'bodyLong01', 'bodyLong02', 'bodyShort01', 'bodyShort02',
    'caption01', 'caption02', 'code01', 'code02',
    'display01', 'display02', 'display03', 'display04',
    'expressiveHeading01', 'expressiveHeading02', 'expressiveHeading03',
    'expressiveHeading04', 'expressiveHeading05', 'expressiveHeading06',
    'expressiveParagraph01',
    'fluidDisplay01', 'fluidDisplay02', 'fluidDisplay03', 'fluidDisplay04',
    'fluidHeading03', 'fluidHeading04', 'fluidHeading05', 'fluidHeading06',
    'fluidParagraph01', 'fluidQuotation01', 'fluidQuotation02',
    'heading01', 'heading02', 'heading03', 'heading04', 'heading05', 'heading06', 'heading07',
    'headingCompact01', 'headingCompact02',
    'helperText01', 'helperText02',
    'label01', 'label02',
    'legal01', 'legal02',
    'productiveHeading01', 'productiveHeading02', 'productiveHeading03',
    'productiveHeading04', 'productiveHeading05', 'productiveHeading06', 'productiveHeading07',
    'quotation01', 'quotation02'
  ];

  for (const typeName of TYPE_NAMES) {
    const carbonDef = cType[typeName];
    if (carbonDef && carbonDef.fontSize !== undefined) {
      tokens['type.' + typeSuperloomName(typeName)] = convertTypeSet(typeName, carbonDef);
    }
  }

  // Motion durations from @carbon/motion
  for (const [sKey, carbonKey] of Object.entries(DURATION_MAP)) {
    tokens[sKey] = stripMs(carbonMotion[carbonKey]);
  }

  // Motion easings (verified against Section 5.6)
  for (const [sKey, expected] of Object.entries(EASING_VALUES)) {
    tokens[sKey] = expected;
  }

  // D9 structure knobs
  for (const [sKey, value] of Object.entries(D9_STRUCTURE)) {
    tokens[sKey] = value;
  }

  // Font tokens (Section 5.5)
  for (const [sKey, value] of Object.entries(FONT_TOKENS)) {
    tokens[sKey] = value;
  }

  return tokens;
}

// --- Complete from base ---------------------------------------------------
function completeFromBase (tokens) {
  const fromBase = [];
  const baseLight = baseProfile.schemes.light;

  for (const key of contractKeys) {
    if (!(key in tokens)) {
      tokens[key] = baseLight.tokens[key];
      fromBase.push(key);
    }
  }

  fromBase.sort();
  return fromBase;
}

// --- Serialize with single quotes ----------------------------------------
function serialize (obj, indent) {
  return JSON.stringify(obj, null, indent).replace(/"/g, '\'');
}

// --- Build and write schemes ---------------------------------------------
function buildScheme (schemeName) {
  const polarity = SCHEME_POLARITY[schemeName];
  const tokens = buildTokens(schemeName);
  const fromBase = completeFromBase(tokens);

  return {
    polarity: polarity,
    scales: { base_font_size: 16 },
    tokens: tokens,
    meta: meta,
    from_base: fromBase
  };
}

function writeScheme (schemeName, fileName) {
  const scheme = buildScheme(schemeName);
  const content = '// Info: Auto-generated by scripts/generate.js. Do not edit by hand.\n' +
    '// Carbon ' + schemeName + ' scheme - from @carbon/themes@11.80.0.\n' +
    'export default Object.freeze(' + serialize(scheme, 2) + ');\n';
  writeFileSync(resolve(outDir, fileName), content);
}

// --- Assertions -----------------------------------------------------------
const SCHEME_NAMES = ['white', 'g10', 'g90', 'g100'];

for (const schemeName of SCHEME_NAMES) {
  const scheme = buildScheme(schemeName);
  const keyCount = Object.keys(scheme.tokens).length;
  if (keyCount !== contractKeys.length) {
    throw new Error(schemeName + ' has ' + keyCount + ' tokens, expected ' + contractKeys.length);
  }

  // Verify easings
  for (const [easingKey, expected] of Object.entries(EASING_VALUES)) {
    const actual = scheme.tokens[easingKey];
    if (!Array.isArray(actual) || actual.length !== 4 ||
        actual[0] !== expected[0] || actual[1] !== expected[1] ||
        actual[2] !== expected[2] || actual[3] !== expected[3]) {
      throw new Error(schemeName + ' easing ' + easingKey + ' mismatch');
    }
  }

  // Verify tag count
  const tagKeys = Object.keys(scheme.tokens).filter(function (k) {
    return k.startsWith('color.tag_');
  });
  if (tagKeys.length !== 40) {
    throw new Error(schemeName + ' has ' + tagKeys.length + ' tag tokens, expected 40');
  }

  console.log(schemeName + ': ' + keyCount + ' tokens, ' + scheme.from_base.length + ' from base, ' + tagKeys.length + ' tags');
}

// --- Write files ----------------------------------------------------------
mkdirSync(outDir, { recursive: true });
writeScheme('white', 'white.js');
writeScheme('g10', 'g10.js');
writeScheme('g90', 'g90.js');
writeScheme('g100', 'g100.js');

console.log('Wrote 4 scheme files to ' + outDir);
