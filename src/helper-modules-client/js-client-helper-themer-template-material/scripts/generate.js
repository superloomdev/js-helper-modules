// Info: Generator script for the Material 3 reference template.
//
// Reads pinned @material packages, generates six color schemes via
// material-color-utilities, parses SCSS token files for type, motion,
// shape, state, and elevation values, maps them through data/mapping.js
// to Superloom contract keys, completes from the base template, and
// writes six scheme data files.
//
// Run: node scripts/generate.js [output-dir]
import { writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { SchemeTonalSpot, Hct, hexFromArgb } from '@material/material-color-utilities';

import utilsLoader from 'helper-utils';
import debugLoader from 'helper-debug';
import themerLoader from 'helper-themer';
import baseProfile from 'helper-themer-template-base';
import mapping from '../data/mapping.js';

const here = dirname(fileURLToPath(import.meta.url));
const moduleRoot = resolve(here, '..');
const outDir = process.argv[2] || resolve(moduleRoot, 'data');
const scssDir = resolve(moduleRoot, 'node_modules/@material/web/tokens/versions/v0_192');

// --- Engine setup ---------------------------------------------------------
const Lib = {};
Lib.Utils = utilsLoader(Lib, {});
Lib.Debug = debugLoader(Lib, {});
const Themer = themerLoader(Lib, {});
const contract = Themer.getContract();
const contractKeys = Object.keys(contract.tokens);
const meta = contract.meta;
const contractKeySet = {};
for (const k of contractKeys) {
  contractKeySet[k] = true;
}

// --- SCSS parsing helpers -------------------------------------------------
function parseTypeScale () {
  const content = readFileSync(resolve(scssDir, '_md-sys-typescale.scss'), 'utf8');
  const lines = content.split('\n');
  const roles = {};
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/'([a-z-]+)-(size|line-height|tracking|weight|font)':/);
    if (m) {
      const role = m[1];
      const prop = m[2];
      if (!roles[role]) {
        roles[role] = {};
      }
      // Find value in surrounding lines
      for (let j = i; j < Math.min(i + 10, lines.length); j++) {
        // Match rem values (e.g. 0.875rem, 1.25rem, 3.5625rem, 0rem)
        const remMatch = lines[j].match(/(\d+\.\d+rem|\d+rem)/);
        // Match map.get typeface references (e.g. weight-regular, plain, brand)
        const mapMatch = lines[j].match(/map\.get\(.+?'md-ref-typeface'.+?'([a-z-]+)'\)/);
        if (mapMatch) {
          roles[role][prop] = mapMatch[1];
          break;
        }
        if (remMatch) {
          roles[role][prop] = remMatch[1];
          break;
        }
      }
    }
  }
  return roles;
}

// --- Value conversion ----------------------------------------------------
function remToPx (value) {
  const num = parseFloat(value);
  const px = num * 16;
  const rounded = Math.round(px * 100) / 100;
  return rounded % 1 === 0 ? Math.round(rounded) : rounded;
}

// --- Type set conversion -------------------------------------------------
const TYPEFACE_WEIGHTS = {
  'weight-regular': 400,
  'weight-medium': 500,
  'weight-bold': 700
};

function convertTypeSet (role, def) {
  const fontSize = remToPx(def.size);
  const lineHeightPx = remToPx(def['line-height']);
  let letterSpacing = 0;
  if (def.tracking && def.tracking !== '0rem') {
    letterSpacing = remToPx(def.tracking);
    letterSpacing = Math.round(letterSpacing * 100) / 100;
  }
  // def.weight is a resolved typeface key like 'weight-regular', 'weight-medium'
  const weight = TYPEFACE_WEIGHTS[def.weight] || 400;
  // Both 'plain' and 'brand' map to 'sans' (both are Roboto at this pin)
  const fontFamily = 'sans';
  return {
    type_set: true,
    font_size: fontSize,
    line_height_px: lineHeightPx,
    letter_spacing: letterSpacing,
    weight: weight,
    font_family: fontFamily
  };
}

// --- Color scheme generation ----------------------------------------------
const SEED_COLOR = 0xff6750a4;
const seed = Hct.fromInt(SEED_COLOR);

const SCHEMES = {
  light: { scheme: new SchemeTonalSpot(seed, false, 0.0), polarity: 'light' },
  dark: { scheme: new SchemeTonalSpot(seed, true, 0.0), polarity: 'dark' },
  light_medium_contrast: { scheme: new SchemeTonalSpot(seed, false, 0.5), polarity: 'light' },
  light_high_contrast: { scheme: new SchemeTonalSpot(seed, false, 1.0), polarity: 'light' },
  dark_medium_contrast: { scheme: new SchemeTonalSpot(seed, true, 0.5), polarity: 'dark' },
  dark_high_contrast: { scheme: new SchemeTonalSpot(seed, true, 1.0), polarity: 'dark' }
};

// Material color property name -> camelCase for scheme property access
function materialToCamel (materialName) {
  return materialName.replace(/_([a-z])/g, function (match, c) {
    return c.toUpperCase();
  });
}

// --- Structure knobs (from plan C2.2) ------------------------------------
const SHAPE_VALUES = {
  'shape.radius_00': 0,
  'shape.radius_04': 4,
  'shape.radius_08': 8,
  'shape.radius_12': 12,
  'shape.radius_16': 16,
  'shape.radius_28': 28,
  'shape.radius_max': 9999
};

const STATE_VALUES = {
  'state.hover_opacity': 0.08,
  'state.focus_opacity': 0.12,
  'state.pressed_opacity': 0.12,
  'state.dragged_opacity': 0.16,
  'state.disabled_container_opacity': 0.12,
  'state.disabled_content_opacity': 0.38
};

const TINT_VALUES = {
  'tint.level_01': 0.05,
  'tint.level_02': 0.08,
  'tint.level_03': 0.11,
  'tint.level_04': 0.12,
  'tint.level_05': 0.14
};

// Elevation shadow recipes (from Material 3 spec, two-layer shadows)
const ELEVATION_SHADOWS = {
  'shadow.level_01': { shadow: true, layers: [
    { x: 0, y: 1, blur: 2, spread: 0, color: '{color.shadow}' },
    { x: 0, y: 1, blur: 3, spread: 1, color: '{color.shadow}' }
  ] },
  'shadow.level_02': { shadow: true, layers: [
    { x: 0, y: 1, blur: 2, spread: 0, color: '{color.shadow}' },
    { x: 0, y: 2, blur: 6, spread: 2, color: '{color.shadow}' }
  ] },
  'shadow.level_03': { shadow: true, layers: [
    { x: 0, y: 1, blur: 3, spread: 0, color: '{color.shadow}' },
    { x: 0, y: 4, blur: 8, spread: 3, color: '{color.shadow}' }
  ] },
  'shadow.level_04': { shadow: true, layers: [
    { x: 0, y: 2, blur: 3, spread: 0, color: '{color.shadow}' },
    { x: 0, y: 6, blur: 10, spread: 4, color: '{color.shadow}' }
  ] },
  'shadow.level_05': { shadow: true, layers: [
    { x: 0, y: 4, blur: 4, spread: 0, color: '{color.shadow}' },
    { x: 0, y: 8, blur: 12, spread: 6, color: '{color.shadow}' }
  ] }
};

// Material easings (from plan C2.2)
const EASING_VALUES = {
  'motion.easing_standard_productive': [0.2, 0, 0, 1],
  'motion.easing_standard_expressive': [0.2, 0, 0, 1],
  'motion.easing_entrance_productive': [0.3, 0, 1, 1],
  'motion.easing_exit_productive': [0, 0, 0, 1],
  'motion.easing_entrance_expressive': [0.3, 0, 0.8, 0.15],
  'motion.easing_exit_expressive': [0.05, 0.7, 0.1, 1],
  'motion.easing_linear': [0, 0, 1, 1]
};

// Material durations (from plan C2.2)
const DURATION_VALUES = {
  'motion.duration_fast_01': 50,
  'motion.duration_fast_02': 100,
  'motion.duration_fast_03': 150,
  'motion.duration_fast_04': 200,
  'motion.duration_moderate_01': 250,
  'motion.duration_moderate_02': 300,
  'motion.duration_moderate_03': 350,
  'motion.duration_moderate_04': 400,
  'motion.duration_slow_01': 450,
  'motion.duration_slow_02': 500,
  'motion.duration_slow_03': 550,
  'motion.duration_slow_04': 600,
  'motion.duration_extra_slow_01': 700,
  'motion.duration_extra_slow_02': 800,
  'motion.duration_extra_slow_03': 900,
  'motion.duration_extra_slow_04': 1000
};

// Material expressive springs (from D19, source: ExpressiveMotionTokens.kt)
const SPRING_VALUES = {
  'motion.spring_spatial_default': { spring: true, stiffness: 380, damping: 31.19, mass: 1 },
  'motion.spring_spatial_fast': { spring: true, stiffness: 800, damping: 33.94, mass: 1 },
  'motion.spring_spatial_slow': { spring: true, stiffness: 200, damping: 22.63, mass: 1 },
  'motion.spring_effects_default': { spring: true, stiffness: 1600, damping: 80, mass: 1 },
  'motion.spring_effects_fast': { spring: true, stiffness: 3800, damping: 123.29, mass: 1 },
  'motion.spring_effects_slow': { spring: true, stiffness: 800, damping: 56.57, mass: 1 }
};

// Font tokens (Section 5.5, Material uses Roboto)
const FONT_TOKENS = {
  'font.family.sans': 'Roboto',
  'font.family.serif': 'Roboto',
  'font.family.mono': 'Roboto Mono',
  'font.weight.light': 300,
  'font.weight.regular': 400,
  'font.weight.semibold': 600,
  'font.weight.bold': 700
};

// D9 structure knobs (same as Carbon for border, focus, feedback)
const STRUCTURE_KNOBS = {
  'border.width_01': 1,
  'border.width_02': 2,
  'border.width_03': 3,
  'border.width_04': 4,
  'focus.width': 2,
  'focus.offset': 0,
  'feedback.press': 'ripple',
  'feedback.focus': 'outline'
};

// Breakpoints (Material has its own, but we use Carbon's for consistency)
const BREAKPOINT_VALUES = {
  'breakpoint.sm': 320,
  'breakpoint.md': 672,
  'breakpoint.lg': 1056,
  'breakpoint.xlg': 1312,
  'breakpoint.max': 1584
};

// Grid values (from Section 14.5 C2, Material column)
const GRID_VALUES = {
  'grid.columns_sm': 4,
  'grid.columns_md': 8,
  'grid.columns_lg': 12,
  'grid.columns_xlg': 12,
  'grid.columns_max': 12,
  'grid.gutter': 16,
  'grid.gutter_condensed': 8,
  'grid.gutter_narrow': 16,
  'grid.margin_sm': 16,
  'grid.margin_md': 24,
  'grid.margin_lg': 24,
  'grid.margin_xlg': 24,
  'grid.margin_max': 24
};

// Size values (Material icon defaults)
const SIZE_VALUES = {
  'size.icon_01': 16,
  'size.icon_02': 20,
  'size.icon_03': 24,
  'size.icon_04': 32
};

// --- Build tokens for one scheme -----------------------------------------
function buildTokens (schemeName) {
  const tokens = {};
  const schemeData = SCHEMES[schemeName];
  const scheme = schemeData.scheme;

  // Color tokens from material-color-utilities
  for (const [materialName, superloomKey] of Object.entries(mapping.color)) {
    if (!contractKeySet[superloomKey]) {
      continue;
    }
    const camelName = materialToCamel(materialName);
    const argb = scheme[camelName];
    if (argb !== undefined) {
      const hex = hexFromArgb(argb);
      tokens[superloomKey] = hex;
    }
  }

  // Type tokens from SCSS
  const typeRoles = parseTypeScale();
  for (const [materialName, superloomKey] of Object.entries(mapping.type)) {
    if (!contractKeySet[superloomKey]) {
      continue;
    }
    // Mapping uses underscores, SCSS uses hyphens
    const scssName = materialName.replace(/_/g, '-');
    const def = typeRoles[scssName];
    if (def && def.size) {
      tokens[superloomKey] = convertTypeSet(materialName, def);
    }
  }

  // Motion durations
  for (const [sKey, value] of Object.entries(DURATION_VALUES)) {
    tokens[sKey] = value;
  }

  // Motion easings
  for (const [sKey, value] of Object.entries(EASING_VALUES)) {
    tokens[sKey] = value;
  }

  // Motion springs (from D19, ExpressiveMotionTokens)
  for (const [sKey, value] of Object.entries(SPRING_VALUES)) {
    tokens[sKey] = value;
  }

  // Shape tokens
  for (const [sKey, value] of Object.entries(SHAPE_VALUES)) {
    tokens[sKey] = value;
  }

  // State tokens
  for (const [sKey, value] of Object.entries(STATE_VALUES)) {
    tokens[sKey] = value;
  }

  // Tint tokens
  for (const [sKey, value] of Object.entries(TINT_VALUES)) {
    tokens[sKey] = value;
  }

  // Shadow / elevation tokens
  for (const [sKey, value] of Object.entries(ELEVATION_SHADOWS)) {
    tokens[sKey] = value;
  }

  // Structure knobs
  for (const [sKey, value] of Object.entries(STRUCTURE_KNOBS)) {
    tokens[sKey] = value;
  }

  // Font tokens
  for (const [sKey, value] of Object.entries(FONT_TOKENS)) {
    tokens[sKey] = value;
  }

  // Breakpoints
  for (const [sKey, value] of Object.entries(BREAKPOINT_VALUES)) {
    tokens[sKey] = value;
  }

  // Grid values
  for (const [sKey, value] of Object.entries(GRID_VALUES)) {
    tokens[sKey] = value;
  }

  // Size values (icon sizes)
  for (const [sKey, value] of Object.entries(SIZE_VALUES)) {
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
  const polarity = SCHEMES[schemeName].polarity;
  const tokens = buildTokens(schemeName);
  const fromBase = completeFromBase(tokens);

  return {
    polarity: polarity,
    scales: {
      base_font_size: 16,
      miniUnit: { base: 2 },
      stepPairIncrement: { base: 12 }
    },
    tokens: tokens,
    meta: meta,
    from_base: fromBase
  };
}

function writeScheme (schemeName, fileName) {
  const scheme = buildScheme(schemeName);
  const content = '// Info: Auto-generated by scripts/generate.js. Do not edit by hand.\n' +
    '// Material ' + schemeName + ' scheme - from @material/web@2.5.0.\n' +
    'export default Object.freeze(' + serialize(scheme, 2) + ');\n';
  writeFileSync(resolve(outDir, fileName), content);
}

// --- Assertions -----------------------------------------------------------
const SCHEME_NAMES = ['light', 'dark', 'light_medium_contrast', 'light_high_contrast', 'dark_medium_contrast', 'dark_high_contrast'];
const SCHEME_FILES = {
  light: 'light.js',
  dark: 'dark.js',
  light_medium_contrast: 'light_medium_contrast.js',
  light_high_contrast: 'light_high_contrast.js',
  dark_medium_contrast: 'dark_medium_contrast.js',
  dark_high_contrast: 'dark_high_contrast.js'
};

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

  console.log(schemeName + ': ' + keyCount + ' tokens, ' + scheme.from_base.length + ' from base');
}

// --- Write files ----------------------------------------------------------
mkdirSync(outDir, { recursive: true });
for (const [schemeName, fileName] of Object.entries(SCHEME_FILES)) {
  writeScheme(schemeName, fileName);
}

console.log('Wrote 6 scheme files to ' + outDir);
