// Info: Generator script for the Superloom base template.
//
// Computes every contract key's value per the D19 rules and writes
// data/light.js and data/dark.js.  Dev only - not published.
//
// Run: node scripts/generate.js [output-dir]
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import utilsLoader from 'helper-utils';
import debugLoader from 'helper-debug';
import themerLoader from 'helper-themer';

const here = dirname(fileURLToPath(import.meta.url));
const moduleRoot = resolve(here, '..');
const outDir = process.argv[2] || resolve(moduleRoot, 'data');

// --- Engine setup (to read the contract) ----------------------------------
const Lib = {};
Lib.Utils = utilsLoader(Lib, {});
Lib.Debug = debugLoader(Lib, {});
const Themer = themerLoader(Lib, {});
const contract = Themer.getContract();
const tokenNames = Object.keys(contract.tokens);
const meta = contract.meta;

// --- Neutral ramp ---------------------------------------------------------
const RAMP = [
  '#ffffff', '#f4f4f4', '#e0e0e0', '#c6c6c6', '#a8a8a8',
  '#8d8d8d', '#6f6f6f', '#525252', '#393939', '#262626', '#161616'
];

// --- The one hand-picked color -------------------------------------------
const INTERACTIVE = '#0f62fe';

// --- Duration computation (D19) ------------------------------------------
const DURATION_SLOTS = [
  'motion.duration_fast_01', 'motion.duration_fast_02',
  'motion.duration_fast_03', 'motion.duration_fast_04',
  'motion.duration_moderate_01', 'motion.duration_moderate_02',
  'motion.duration_moderate_03', 'motion.duration_moderate_04',
  'motion.duration_slow_01', 'motion.duration_slow_02',
  'motion.duration_slow_03', 'motion.duration_slow_04',
  'motion.duration_extra_slow_01', 'motion.duration_extra_slow_02',
  'motion.duration_extra_slow_03', 'motion.duration_extra_slow_04'
];
const DURATIONS = DURATION_SLOTS.map(function (slot, i) {
  return Math.round(70 * Math.pow(10, i / 15));
});

// --- Easings (D19) -------------------------------------------------------
const EASINGS = {
  'motion.easing_standard_productive': [0.2, 0, 0.38, 0.9],
  'motion.easing_standard_expressive': [0.4, 0.14, 0.3, 1],
  'motion.easing_entrance_productive': [0, 0, 0.38, 0.9],
  'motion.easing_entrance_expressive': [0, 0, 0.3, 1],
  'motion.easing_exit_productive': [0.2, 0, 1, 0.9],
  'motion.easing_exit_expressive': [0.4, 0.14, 1, 1],
  'motion.easing_linear': [0, 0, 1, 1]
};

// --- Springs (D19 base literals) -----------------------------------------
const SPRINGS = {
  'motion.spring_spatial_default': { spring: true, stiffness: 700, damping: 47.62, mass: 1 },
  'motion.spring_spatial_fast': { spring: true, stiffness: 1400, damping: 67.35, mass: 1 },
  'motion.spring_spatial_slow': { spring: true, stiffness: 300, damping: 31.18, mass: 1 },
  'motion.spring_effects_default': { spring: true, stiffness: 1600, damping: 80, mass: 1 },
  'motion.spring_effects_fast': { spring: true, stiffness: 3800, damping: 123.29, mass: 1 },
  'motion.spring_effects_slow': { spring: true, stiffness: 800, damping: 56.57, mass: 1 }
};

// --- Type set step assignments -------------------------------------------
// 58 type sets, step 1..58 on stepPairIncrement(base 12).
// Steps produce: 12, 14, 16, 18, 20, 24, 28, 32, 36, 42, 48, 54, 60, 68, ...
const TYPE_NAMES = [
  'body01', 'body02', 'body_compact_01', 'body_compact_02',
  'body_long_01', 'body_long_02', 'body_short_01', 'body_short_02',
  'caption01', 'caption02', 'code01', 'code02',
  'display01', 'display02', 'display03', 'display04',
  'expressive_heading_01', 'expressive_heading_02', 'expressive_heading_03',
  'expressive_heading_04', 'expressive_heading_05', 'expressive_heading_06',
  'expressive_paragraph_01',
  'fluid_display_01', 'fluid_display_02', 'fluid_display_03', 'fluid_display_04',
  'fluid_heading_03', 'fluid_heading_04', 'fluid_heading_05', 'fluid_heading_06',
  'fluid_paragraph_01', 'fluid_quotation_01', 'fluid_quotation_02',
  'heading01', 'heading02', 'heading03', 'heading04', 'heading05', 'heading06', 'heading07',
  'heading_compact_01', 'heading_compact_02',
  'helper_text_01', 'helper_text_02',
  'label01', 'label02',
  'legal01', 'legal02',
  'productive_heading_01', 'productive_heading_02', 'productive_heading_03',
  'productive_heading_04', 'productive_heading_05', 'productive_heading_06', 'productive_heading_07',
  'quotation01', 'quotation02'
];

// Heading-like names get weight 600; body/caption/code/legal/helper/label get 400.
function weightFor (name) {
  if (/heading|display|label|productive_heading|expressive_heading|fluid_heading|fluid_display/.test(name)) {
    return 600;
  }
  return 400;
}

// code01/code02 use mono; everything else uses sans.
function familyFor (name) {
  if (name === 'code01' || name === 'code02') {
    return 'mono';
  }
  return 'sans';
}

// --- Color step assignments ----------------------------------------------
// Every color token is a rampStep from the page background, except
// interactive/focus/highlight (literal #0f62fe) and the link/button
// primaries that alias interactive.
const INTERACTIVE_ALIASES = [
  'color.link_primary', 'color.link_primary_hover',
  'color.button_primary', 'color.button_primary_active', 'color.button_primary_hover'
];
const INTERACTIVE_LITERALS = [
  'color.interactive', 'color.focus', 'color.focus_inset', 'color.focus_inverse', 'color.highlight'
];

function colorStep (name) {
  // Background and its variants: step 0
  if (/^color\.background/.test(name)) {
    return 0;
  }
  // Text on colored backgrounds: step 0 (light text on dark/colored bg)
  if (/^color\.text_on_color/.test(name)) {
    return 0;
  }
  if (/^color\.text_inverse/.test(name)) {
    return 0;
  }
  // Primary text: step 10 (maximum contrast)
  if (name === 'color.text_primary') {
    return 10;
  }
  // Secondary/helper/placeholder text: step 7
  if (/^color\.text_(secondary|helper|placeholder)/.test(name)) {
    return 7;
  }
  // Disabled text: step 5
  if (/^color\.text_disabled/.test(name)) {
    return 5;
  }
  // Error text: step 10 (same as primary for visibility)
  if (/^color\.text_error/.test(name)) {
    return 10;
  }
  // Icon primary/inverse/on_color: step 10
  if (/^color\.icon_(primary|inverse|on_color)/.test(name)) {
    return 10;
  }
  // Icon secondary: step 7
  if (name === 'color.icon_secondary') {
    return 7;
  }
  // Icon interactive: alias of interactive
  if (name === 'color.icon_interactive') {
    return 10;
  }
  // Icon disabled: step 5
  if (/^color\.icon_disabled/.test(name)) {
    return 5;
  }
  // Shadow: step 10 (darkest)
  if (name === 'color.shadow') {
    return 10;
  }
  // Overlay: step 8
  if (name === 'color.overlay') {
    return 8;
  }
  // Toggle off: step 5
  if (name === 'color.toggle_off') {
    return 5;
  }
  // Skeleton: step 2
  if (/^color\.skeleton/.test(name)) {
    return 2;
  }
  // Layer backgrounds: step 0-2
  if (/^color\.layer_background/.test(name)) {
    const m = name.match(/(\d+)$/);
    return m ? parseInt(m[1], 10) - 1 : 0;
  }
  // Layer 01-03: steps 1, 2, 3
  if (/^color\.layer_\d+$/.test(name)) {
    const m = name.match(/(\d+)$/);
    return parseInt(m[1], 10);
  }
  // Layer accent: same as layer
  if (/^color\.layer_accent_\d+$/.test(name)) {
    const m = name.match(/(\d+)$/);
    return parseInt(m[1], 10);
  }
  // Layer accent active/hover: one deeper
  if (/^color\.layer_accent_(active|hover)_\d+$/.test(name)) {
    const m = name.match(/(\d+)$/);
    return parseInt(m[1], 10) + 1;
  }
  // Layer active: one deeper than layer
  if (/^color\.layer_active_\d+$/.test(name)) {
    const m = name.match(/(\d+)$/);
    return parseInt(m[1], 10) + 1;
  }
  // Layer hover: same as layer
  if (/^color\.layer_hover_\d+$/.test(name)) {
    const m = name.match(/(\d+)$/);
    return parseInt(m[1], 10);
  }
  // Layer selected: one deeper
  if (/^color\.layer_selected_\d+$/.test(name)) {
    const m = name.match(/(\d+)$/);
    return parseInt(m[1], 10) + 1;
  }
  if (name === 'color.layer_selected_disabled') {
    return 4;
  }
  if (/^color\.layer_selected_hover_\d+$/.test(name)) {
    const m = name.match(/(\d+)$/);
    return parseInt(m[1], 10) + 2;
  }
  if (name === 'color.layer_selected_inverse') {
    return 0;
  }
  // Field: same as layer
  if (/^color\.field_\d+$/.test(name)) {
    const m = name.match(/(\d+)$/);
    return parseInt(m[1], 10);
  }
  if (/^color\.field_hover_\d+$/.test(name)) {
    const m = name.match(/(\d+)$/);
    return parseInt(m[1], 10) + 1;
  }
  // Borders: step 2-4
  if (/^color\.border_subtle/.test(name)) {
    return 2;
  }
  if (/^color\.border_strong/.test(name)) {
    return 5;
  }
  if (/^color\.border_disabled/.test(name)) {
    return 3;
  }
  if (name === 'color.border_interactive') {
    return 10;
  }
  if (name === 'color.border_inverse') {
    return 0;
  }
  if (/^color\.border_tile/.test(name)) {
    return 2;
  }
  // Link (non-primary): step 7
  if (/^color\.link_(secondary|visited|inverse)/.test(name)) {
    return 7;
  }
  // Support: step 8 (dark gray for all)
  if (/^color\.support_/.test(name)) {
    return 8;
  }
  // Button (non-primary): steps 2-5
  if (/^color\.button_(danger|secondary|tertiary|disabled|separator)/.test(name)) {
    return 3;
  }
  // Notification backgrounds: step 2
  if (/^color\.notification_background/.test(name)) {
    return 2;
  }
  if (/^color\.notification_action/.test(name)) {
    return 4;
  }
  // Tag: step 2
  if (/^color\.tag_/.test(name)) {
    return 2;
  }
  // AI: step 2-3
  if (/^color\.ai_/.test(name)) {
    return 2;
  }
  // Default: step 2
  return 2;
}

// --- Build tokens object --------------------------------------------------
function buildTokens () {
  const tokens = {};

  for (const name of tokenNames) {
    const def = contract.tokens[name];
    const group = def.group;

    // --- Color tokens ---
    if (group === 'color') {
      if (INTERACTIVE_LITERALS.includes(name)) {
        tokens[name] = INTERACTIVE;
      } else if (INTERACTIVE_ALIASES.includes(name)) {
        tokens[name] = '{color.interactive}';
      } else {
        tokens[name] = { op: 'rampStep', args: [colorStep(name)] };
      }
      continue;
    }

    // --- Spacing tokens ---
    if (group === 'spacing') {
      if (/^spacing\.fluid_/.test(name)) {
        // C3 viewport tokens: Carbon's values
        const fluidMap = { 'spacing.fluid_01': 0, 'spacing.fluid_02': 2, 'spacing.fluid_03': 5, 'spacing.fluid_04': 10 };
        tokens[name] = { viewport: true, vw: fluidMap[name] };
      } else {
        // miniUnit with base 2
        const multMap = {
          'spacing.spacing_01': 1, 'spacing.spacing_02': 2, 'spacing.spacing_03': 4,
          'spacing.spacing_04': 6, 'spacing.spacing_05': 8, 'spacing.spacing_06': 12,
          'spacing.spacing_07': 16, 'spacing.spacing_08': 20, 'spacing.spacing_09': 24,
          'spacing.spacing_10': 32, 'spacing.spacing_11': 40, 'spacing.spacing_12': 48,
          'spacing.spacing_13': 80
        };
        tokens[name] = { scale: 'miniUnit', multiplier: multMap[name] };
      }
      continue;
    }

    // --- Size tokens ---
    if (group === 'size') {
      const sizeMap = {
        'size.container_01': 24, 'size.container_02': 32, 'size.container_03': 40,
        'size.container_04': 48, 'size.container_05': 64,
        'size.size_xsmall': 24, 'size.size_small': 32, 'size.size_medium': 40,
        'size.size_large': 48, 'size.size_xlarge': 64, 'size.size_2xlarge': 80,
        'size.icon_01': 16, 'size.icon_02': 20, 'size.icon_03': 24, 'size.icon_04': 32,
        'size.layout_01': 16, 'size.layout_02': 24, 'size.layout_03': 32,
        'size.layout_04': 48, 'size.layout_05': 64, 'size.layout_06': 96, 'size.layout_07': 160
      };
      tokens[name] = sizeMap[name];
      continue;
    }

    // --- Type tokens ---
    if (group === 'type') {
      const shortName = name.replace('type.', '');
      const step = TYPE_NAMES.indexOf(shortName) + 1;
      tokens[name] = {
        type_set: true,
        scale: 'stepPairIncrement',
        step: step,
        line_height: 1.43,
        letter_spacing: 0,
        weight: weightFor(shortName),
        font_family: familyFor(shortName)
      };
      continue;
    }

    // --- Font tokens ---
    if (group === 'font') {
      if (/^font\.family\./.test(name)) {
        const famMap = {
          'font.family.sans': 'IBM Plex Sans',
          'font.family.serif': 'IBM Plex Serif',
          'font.family.mono': 'IBM Plex Mono'
        };
        tokens[name] = famMap[name];
      } else if (/^font\.weight\./.test(name)) {
        const wMap = {
          'font.weight.thin': 100, 'font.weight.extralight': 200,
          'font.weight.light': 300, 'font.weight.regular': 400,
          'font.weight.medium': 500, 'font.weight.semibold': 600,
          'font.weight.bold': 700, 'font.weight.extrabold': 800,
          'font.weight.black': 900
        };
        tokens[name] = wMap[name];
      }
      continue;
    }

    // --- Motion tokens ---
    if (group === 'motion') {
      if (DURATION_SLOTS.includes(name)) {
        tokens[name] = DURATIONS[DURATION_SLOTS.indexOf(name)];
      } else if (name in EASINGS) {
        tokens[name] = EASINGS[name];
      } else if (name in SPRINGS) {
        tokens[name] = SPRINGS[name];
      }
      continue;
    }

    // --- Shape tokens ---
    if (group === 'shape') {
      const shapeMap = {
        'shape.radius_00': 0, 'shape.radius_02': 2, 'shape.radius_04': 4,
        'shape.radius_08': 8, 'shape.radius_12': 12, 'shape.radius_16': 16,
        'shape.radius_24': 24, 'shape.radius_28': 28, 'shape.radius_max': 9999
      };
      tokens[name] = shapeMap[name];
      continue;
    }

    // --- Border tokens ---
    if (group === 'border') {
      const borderMap = {
        'border.width_01': 1, 'border.width_02': 2,
        'border.width_03': 3, 'border.width_04': 4
      };
      tokens[name] = borderMap[name];
      continue;
    }

    // --- Focus tokens ---
    if (group === 'focus') {
      if (name === 'focus.width') {
        tokens[name] = 2;
      }
      if (name === 'focus.offset') {
        tokens[name] = 0;
      }
      continue;
    }

    // --- Feedback tokens ---
    if (group === 'feedback') {
      if (name === 'feedback.press') {
        tokens[name] = 'highlight';
      }
      if (name === 'feedback.focus') {
        tokens[name] = 'outline';
      }
      continue;
    }

    // --- Shadow tokens ---
    if (group === 'shadow') {
      const shadowMap = {
        'shadow.level_01': { shadow: true, layers: [{ x: 0, y: 2, blur: 4, spread: 0, color: '{color.shadow}' }] },
        'shadow.level_02': { shadow: true, layers: [{ x: 0, y: 4, blur: 8, spread: 0, color: '{color.shadow}' }] },
        'shadow.level_03': { shadow: true, layers: [{ x: 0, y: 6, blur: 12, spread: 0, color: '{color.shadow}' }] },
        'shadow.level_04': { shadow: true, layers: [{ x: 0, y: 8, blur: 16, spread: 0, color: '{color.shadow}' }] },
        'shadow.level_05': { shadow: true, layers: [{ x: 0, y: 12, blur: 24, spread: 0, color: '{color.shadow}' }] }
      };
      tokens[name] = shadowMap[name];
      continue;
    }

    // --- Breakpoint tokens ---
    if (group === 'breakpoint') {
      const bpMap = {
        'breakpoint.sm': 320, 'breakpoint.md': 672, 'breakpoint.lg': 1056,
        'breakpoint.xlg': 1312, 'breakpoint.max': 1584
      };
      tokens[name] = bpMap[name];
      continue;
    }

    // --- Grid tokens (C2) ---
    if (group === 'grid') {
      const gridMap = {
        'grid.columns_sm': 4, 'grid.columns_md': 8, 'grid.columns_lg': 16,
        'grid.columns_xlg': 16, 'grid.columns_max': 16,
        'grid.gutter': 32, 'grid.gutter_condensed': 1, 'grid.gutter_narrow': 16,
        'grid.margin_sm': 0, 'grid.margin_md': 16, 'grid.margin_lg': 16,
        'grid.margin_xlg': 16, 'grid.margin_max': 24
      };
      tokens[name] = gridMap[name];
      continue;
    }

    // --- State tokens (M3) ---
    if (group === 'state') {
      const stateMap = {
        'state.hover_opacity': 0, 'state.focus_opacity': 0,
        'state.pressed_opacity': 0, 'state.dragged_opacity': 0,
        'state.disabled_content_opacity': 1, 'state.disabled_container_opacity': 1
      };
      tokens[name] = stateMap[name];
      continue;
    }

    // --- Tint tokens (M5) ---
    if (group === 'tint') {
      tokens[name] = 0;
      continue;
    }
  }

  return tokens;
}

// --- Scales ---------------------------------------------------------------
const scales = {
  base_font_size: 16,
  miniUnit: { base: 2 },
  stepPairIncrement: { base: 12 }
};

// --- Write data files -----------------------------------------------------
function serialize (obj, indent) {
  // JSON.stringify uses double quotes; the repo's ESLint config requires single.
  // No string value in the data contains a single quote, so a global replace is safe.
  return JSON.stringify(obj, null, indent).replace(/"/g, '\'');
}

function buildScheme (polarity) {
  return {
    polarity: polarity,
    scales: scales,
    ramp: RAMP,
    palette: {},
    tokens: buildTokens(),
    meta: meta
  };
}

function writeScheme (polarity, fileName) {
  const scheme = buildScheme(polarity);
  const content = '// Info: Auto-generated by scripts/generate.js. Do not edit by hand.\n' +
    '// D19 base template - ' + polarity + ' scheme.\n' +
    'export default Object.freeze(' + serialize(scheme, 2) + ');\n';
  writeFileSync(resolve(outDir, fileName), content);
}

// --- Assertions (D19) -----------------------------------------------------
const tokens = buildTokens();

// Assert every contract key is present
for (const name of tokenNames) {
  if (!(name in tokens)) {
    throw new Error('Missing token: ' + name);
  }
}

// Assert duration sequence
for (let i = 0; i < DURATION_SLOTS.length; i++) {
  const expected = Math.round(70 * Math.pow(10, i / 15));
  if (tokens[DURATION_SLOTS[i]] !== expected) {
    throw new Error('Duration mismatch at ' + DURATION_SLOTS[i] + ': expected ' + expected + ', got ' + tokens[DURATION_SLOTS[i]]);
  }
}
if (tokens['motion.duration_fast_01'] !== 70) {
  throw new Error('duration_fast_01 must be 70');
}
if (tokens['motion.duration_extra_slow_04'] !== 700) {
  throw new Error('duration_extra_slow_04 must be 700');
}

// Assert strictly increasing durations
for (let i = 1; i < DURATION_SLOTS.length; i++) {
  if (tokens[DURATION_SLOTS[i]] <= tokens[DURATION_SLOTS[i - 1]]) {
    throw new Error('Durations not strictly increasing at index ' + i);
  }
}

// Assert feedback.focus
if (tokens['feedback.focus'] !== 'outline') {
  throw new Error('feedback.focus must be outline');
}

// Assert token count
const count = Object.keys(tokens).length;
if (count !== tokenNames.length) {
  throw new Error('Token count mismatch: expected ' + tokenNames.length + ', got ' + count);
}

console.log('Token count: ' + count);
console.log('Durations: ' + DURATIONS.join(', '));
console.log('Interactive: ' + INTERACTIVE);

// --- Write files ----------------------------------------------------------
mkdirSync(outDir, { recursive: true });
writeScheme('light', 'light.js');
writeScheme('dark', 'dark.js');

console.log('Wrote ' + resolve(outDir, 'light.js'));
console.log('Wrote ' + resolve(outDir, 'dark.js'));
