// Info: Generator script for the Superloom default template.
//
// Computes every contract key's value per the D19 rules and writes
// data/light.js and data/dark.js.  Dev only - not published.
//
// Anatomy enums take the plainest value. Icon literals come from the pinned
// @carbon/icons package through scripts/icons-carbon.js, named by the
// committed snapshot scripts/icon-map.json (see scripts/sync-icon-map.js).
//
// Run: node scripts/generate.js [output-dir]
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import utilsLoader from 'helper-utils';
import debugLoader from 'helper-debug';
import themerLoader from 'helper-themer';
import buildCarbonIcons from './icons-carbon.js';

import buildGridRecipe from './grid-recipe.js';
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
// The role grid (v5 amendment): every cell answered by this template's recipe
const GRID_RECIPE = buildGridRecipe(contract.grid);

// --- Icons (v4) -----------------------------------------------------------
// The default template carries Carbon's glyphs until the Superloom set exists.
const iconMap = JSON.parse(readFileSync(resolve(here, 'icon-map.json'), 'utf8'));
const carbonIcons = buildCarbonIcons(iconMap.icons);
const ICONS = carbonIcons.tokens;
const PROVENANCE = {
  icons: {
    package: '@carbon/icons',
    version: carbonIcons.version,
    map_source: iconMap.source,
    map_sha256: iconMap.source_sha256
  }
};

// --- Anatomy (v4): the plainest value of every enum ----------------------
const ANATOMY = {
  'anatomy.label': 'above',
  'anatomy.switch_handle': 'fixed',
  'anatomy.status_marker': 'bar_icon',
  'anatomy.dialog_actions': 'stretched',
  'anatomy.slider_handle': 'round',
  // A tall button keeps its label where the default height puts it
  'anatomy.button_label': 'top',
  // v6: the primary reference's anatomy, as the default draws it
  'anatomy.field_counter': 'label',
  'anatomy.switch_state_text': 'shown',
  'anatomy.progress_indeterminate': 'sweep',
  'anatomy.tab_indicator': 'full',
  'anatomy.dialog_close': 'shown'
};

// --- Neutral ramp ---------------------------------------------------------
const RAMP = [
  '#ffffff', '#f4f4f4', '#e0e0e0', '#c6c6c6', '#a8a8a8',
  '#8d8d8d', '#6f6f6f', '#525252', '#393939', '#262626', '#161616'
];

// --- The hand-picked colors ----------------------------------------------
// A neutral ramp can say "lighter" and "darker"; it cannot say "interactive"
// or "error". These four hues are the template's own, not a design
// system's: one for everything a user can act on, three for what the
// system is telling the user. Each reads at 4.5:1 or better on white and on
// the first layer step, and carries white text at 5:1 or better.
const INTERACTIVE = '#0f62fe';
const SEMANTIC = {
  error: '#b91c1c',
  success: '#15803d',
  warning: '#b45309'
};
// A shadow is black at a third, in both polarities; an opaque shadow is a ring
const SHADOW = 'rgba(0, 0, 0, 0.3)';

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

// --- Type set font sizes and line heights --------------------------------
// 58 type sets with explicit font_size and line_height_px values. The default
// template uses the same type metrics as the Carbon reference to ensure the
// neutral profile renders at readable sizes. The previous step-based
// assignment used alphabetical order, which placed headings at steps 35-58
// and produced font sizes of 392px+.
const TYPE_METRICS = {
  'body01': { font_size: 14, line_height_px: 20 },
  'body02': { font_size: 16, line_height_px: 24 },
  'body_compact_01': { font_size: 14, line_height_px: 18 },
  'body_compact_02': { font_size: 16, line_height_px: 22 },
  'body_long_01': { font_size: 14, line_height_px: 20 },
  'body_long_02': { font_size: 16, line_height_px: 24 },
  'body_short_01': { font_size: 14, line_height_px: 18 },
  'body_short_02': { font_size: 16, line_height_px: 22 },
  'caption01': { font_size: 12, line_height_px: 16 },
  'caption02': { font_size: 14, line_height_px: 18 },
  'code01': { font_size: 12, line_height_px: 16 },
  'code02': { font_size: 14, line_height_px: 20 },
  'display01': { font_size: 42, line_height_px: 50 },
  'display02': { font_size: 42, line_height_px: 50 },
  'display03': { font_size: 42, line_height_px: 50 },
  'display04': { font_size: 42, line_height_px: 50 },
  'expressive_heading_01': { font_size: 14, line_height_px: 18 },
  'expressive_heading_02': { font_size: 16, line_height_px: 24 },
  'expressive_heading_03': { font_size: 20, line_height_px: 28 },
  'expressive_heading_04': { font_size: 28, line_height_px: 36 },
  'expressive_heading_05': { font_size: 32, line_height_px: 40 },
  'expressive_heading_06': { font_size: 32, line_height_px: 40 },
  'expressive_paragraph_01': { font_size: 24, line_height_px: 32 },
  'fluid_display_01': { font_size: 42, line_height_px: 50 },
  'fluid_display_02': { font_size: 42, line_height_px: 50 },
  'fluid_display_03': { font_size: 42, line_height_px: 50 },
  'fluid_display_04': { font_size: 42, line_height_px: 50 },
  'fluid_heading_03': { font_size: 20, line_height_px: 28 },
  'fluid_heading_04': { font_size: 28, line_height_px: 36 },
  'fluid_heading_05': { font_size: 32, line_height_px: 40 },
  'fluid_heading_06': { font_size: 32, line_height_px: 40 },
  'fluid_paragraph_01': { font_size: 24, line_height_px: 32 },
  'fluid_quotation_01': { font_size: 20, line_height_px: 26 },
  'fluid_quotation_02': { font_size: 32, line_height_px: 40 },
  'heading01': { font_size: 14, line_height_px: 20 },
  'heading02': { font_size: 16, line_height_px: 24 },
  'heading03': { font_size: 20, line_height_px: 28 },
  'heading04': { font_size: 28, line_height_px: 36 },
  'heading05': { font_size: 32, line_height_px: 40 },
  'heading06': { font_size: 42, line_height_px: 50 },
  'heading07': { font_size: 54, line_height_px: 65 },
  'heading_compact_01': { font_size: 14, line_height_px: 18 },
  'heading_compact_02': { font_size: 16, line_height_px: 22 },
  'helper_text_01': { font_size: 12, line_height_px: 16 },
  'helper_text_02': { font_size: 14, line_height_px: 18 },
  'label01': { font_size: 12, line_height_px: 16 },
  'label02': { font_size: 14, line_height_px: 18 },
  'legal01': { font_size: 12, line_height_px: 16 },
  'legal02': { font_size: 14, line_height_px: 18 },
  'productive_heading_01': { font_size: 14, line_height_px: 18 },
  'productive_heading_02': { font_size: 16, line_height_px: 22 },
  'productive_heading_03': { font_size: 20, line_height_px: 28 },
  'productive_heading_04': { font_size: 28, line_height_px: 36 },
  'productive_heading_05': { font_size: 32, line_height_px: 40 },
  'productive_heading_06': { font_size: 42, line_height_px: 50 },
  'productive_heading_07': { font_size: 54, line_height_px: 65 },
  'quotation01': { font_size: 20, line_height_px: 26 },
  'quotation02': { font_size: 32, line_height_px: 40 },
  // Role sets (v5): a button label reads like compact body text; a raised field label like a label
  'button_label': { font_size: 14, line_height_px: 18 },
  'field_label_raised': { font_size: 12, line_height_px: 16 }
};

// Heading-like names get weight 600; body/caption/code/legal/helper/label get 400.
function weightFor (name) {
  if (name === 'button_label') {
    return 400;
  }
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
// Every color token is a rampStep from the page background, except the
// hand-picked hues, the roles that alias them, the roles that must not flip
// with polarity (text and icons on a colored fill are white on both; the
// shadow is black on both; a filled secondary or danger button keeps its
// full hue on both so its white label reads), and the hover and active
// fills, which mix a hue toward the primary text so they step toward the
// reader's polarity. A hue drawn as text or an icon on the dark page is a
// tint: the hue mixed half way to the primary text (white there), which
// reads at 4.5:1 or better on the dark page and its layers; on the light
// page the full hue reads and the role aliases it.
const COLOR_LITERALS = {
  'color.interactive': INTERACTIVE,
  'color.focus': INTERACTIVE,
  'color.focus_inset': INTERACTIVE,
  'color.focus_inverse': INTERACTIVE,
  'color.highlight': INTERACTIVE,
  'color.text_on_color': '#ffffff',
  'color.icon_on_color': '#ffffff',
  'color.shadow': SHADOW,
  'color.button_secondary': RAMP[8],
  'color.button_secondary_hover': RAMP[9],
  'color.button_secondary_active': RAMP[7],
  'color.button_danger_primary': SEMANTIC.error
};
const COLOR_ALIASES = {
  'color.button_primary': '{color.interactive}',
  'color.text_error': '{color.support_error}',
  'color.button_danger_secondary': '{color.support_error}',
  'color.support_caution_major': '{color.support_warning}',
  'color.support_caution_minor': '{color.support_warning}',
  'color.support_caution_undefined': '{color.support_info}'
};
const COLOR_MIXES = {
  'color.button_primary_hover': { op: 'mix', args: ['color.interactive', 'color.text_primary', 85] },
  'color.button_primary_active': { op: 'mix', args: ['color.interactive', 'color.text_primary', 70] },
  'color.button_tertiary_hover': { op: 'mix', args: ['color.interactive', 'color.text_primary', 85] },
  'color.button_tertiary_active': { op: 'mix', args: ['color.interactive', 'color.text_primary', 70] },
  'color.button_danger_hover': { op: 'mix', args: ['color.button_danger_primary', 'color.text_primary', 85] },
  'color.button_danger_active': { op: 'mix', args: ['color.button_danger_primary', 'color.text_primary', 70] }
};
// Hues drawn as text, border or icon read as the full hue on the light page
// and as a tint on the dark page: a mix operand must be a token, so the
// support role that holds the full hue flips with polarity (`support_*` on
// light, `support_*_inverse` on dark, each the other's half mix toward the
// page or the primary text).
const HUE_ROLES = {
  light: {
    'color.link_primary': '{color.interactive}',
    'color.link_primary_hover': { op: 'mix', args: ['color.interactive', 'color.text_primary', 60] },
    'color.button_tertiary': '{color.interactive}',
    'color.support_info': '{color.interactive}',
    'color.support_error': '{color.button_danger_primary}',
    'color.support_success': SEMANTIC.success,
    'color.support_warning': SEMANTIC.warning,
    'color.support_info_inverse': { op: 'mix', args: ['color.interactive', 'color.background', 50] },
    'color.support_error_inverse': { op: 'mix', args: ['color.button_danger_primary', 'color.background', 50] },
    'color.support_success_inverse': { op: 'mix', args: ['color.support_success', 'color.background', 50] },
    'color.support_warning_inverse': { op: 'mix', args: ['color.support_warning', 'color.background', 50] }
  },
  dark: {
    'color.link_primary': { op: 'mix', args: ['color.interactive', 'color.text_primary', 50] },
    'color.link_primary_hover': { op: 'mix', args: ['color.interactive', 'color.text_primary', 30] },
    // Hover and press darken a filled kind in both polarities, so white text keeps reading on it; the
    // outlined kind's fill lightens in the dark scheme, where its label turns to the inverse text
    'color.button_primary_hover': { op: 'mix', args: ['color.interactive', 'color.background', 85] },
    'color.button_primary_active': { op: 'mix', args: ['color.interactive', 'color.background', 70] },
    'color.button_danger_hover': { op: 'mix', args: ['color.button_danger_primary', 'color.background', 85] },
    'color.button_danger_active': { op: 'mix', args: ['color.button_danger_primary', 'color.background', 70] },
    'color.button_tertiary': { op: 'mix', args: ['color.interactive', 'color.text_primary', 50] },
    'color.support_info': { op: 'mix', args: ['color.interactive', 'color.text_primary', 50] },
    'color.support_error': { op: 'mix', args: ['color.button_danger_primary', 'color.text_primary', 50] },
    'color.support_success': { op: 'mix', args: ['color.support_success_inverse', 'color.text_primary', 50] },
    'color.support_warning': { op: 'mix', args: ['color.support_warning_inverse', 'color.text_primary', 50] },
    'color.support_info_inverse': '{color.interactive}',
    'color.support_error_inverse': '{color.button_danger_primary}',
    'color.support_success_inverse': SEMANTIC.success,
    'color.support_warning_inverse': SEMANTIC.warning
  }
};

function colorStep (name) {
  // Inverse background: the far end of the ramp, its hover one step back
  if (name === 'color.background_inverse') {
    return 10;
  }
  if (name === 'color.background_inverse_hover') {
    return 9;
  }
  // Background state fills step away from the page (the press feedback is
  // highlight, so the fill is what shows hover, press and selection)
  if (name === 'color.background_hover') {
    return 1;
  }
  if (name === 'color.background_selected') {
    return 2;
  }
  if (name === 'color.background_active' || name === 'color.background_selected_hover') {
    return 3;
  }
  // Background and its other variants: step 0
  if (/^color\.background/.test(name)) {
    return 0;
  }
  // Disabled text on a colored fill: step 0 (the fill is the disabled gray)
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
  // Icon primary: step 10; icon inverse and on-color sit on a dark or colored fill: step 0
  if (name === 'color.icon_primary') {
    return 10;
  }
  if (/^color\.icon_(inverse|on_color)/.test(name)) {
    return 0;
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
  // Role fills (v5): tonal and elevated rest on the first layer step, hover and active one deeper
  if (name === 'color.button_tonal' || name === 'color.button_elevated' || name === 'color.button_elevated_hover') {
    return 1;
  }
  if (/^color\.button_(tonal_hover|tonal_active|elevated_active)$/.test(name)) {
    return 2;
  }
  if (name === 'color.text_on_button_tonal' || name === 'color.control_checked') {
    return 10;
  }
  // Disabled fill and separator: step 3
  if (/^color\.button_(disabled|separator)/.test(name)) {
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
function buildTokens (polarity) {
  const tokens = {};

  for (const name of tokenNames) {
    const def = contract.tokens[name];
    const group = def.group;

    // --- Role grid cells (v5 amendment) ---
    if (GRID_RECIPE[name] !== undefined) {
      tokens[name] = GRID_RECIPE[name];
      continue;
    }

    // --- Color tokens ---
    if (group === 'color') {
      if (name in COLOR_LITERALS) {
        tokens[name] = COLOR_LITERALS[name];
      } else if (name in HUE_ROLES[polarity]) {
        tokens[name] = HUE_ROLES[polarity][name];
      } else if (name in COLOR_ALIASES) {
        tokens[name] = COLOR_ALIASES[name];
      } else if (name in COLOR_MIXES) {
        tokens[name] = COLOR_MIXES[name];
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
      const metrics = TYPE_METRICS[shortName];
      tokens[name] = {
        type_set: true,
        font_size: metrics.font_size,
        line_height_px: metrics.line_height_px,
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

    // --- Anatomy tokens (v4) ---
    if (group === 'anatomy') {
      tokens[name] = ANATOMY[name];
      continue;
    }

    // --- Icon tokens (v4) ---
    if (group === 'icon') {
      tokens[name] = ICONS[name];
      continue;
    }

    // --- Control tokens (v5): the neutral template states the primary reference's control geometry ---
    if (group === 'control') {
      const controlMap = {
        'control.button_height': 48, 'control.button_radius': 0,
        'control.button_padding_start': 16, 'control.button_padding_end': 64, 'control.button_icon_size': 16,
        'control.field_height': 40, 'control.field_radius': 0, 'control.field_icon_size': 16,
        'control.checkbox_size': 16, 'control.checkbox_border': 1,
        'control.option_height': 40
      };
      tokens[name] = controlMap[name];
      continue;
    }

    // --- Feedback tokens ---
    if (group === 'feedback') {
      if (name === 'feedback.press') {
        tokens[name] = 'highlight';
      }
      if (name === 'feedback.field') {
        tokens[name] = 'underline';
      }
      if (name === 'feedback.focus_trigger') {
        tokens[name] = 'any';
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

    // --- Stacking tokens (v3) ---
    // Named surface order. Carbon publishes this exact scale as its z-index
    // utility map; the same order is the default template's value so templates whose
    // design system does not publish one inherit a defined answer.
    if (group === 'stacking') {
      const stackingMap = {
        'stacking.dropdown': 9100, 'stacking.modal': 9000,
        'stacking.header': 8000, 'stacking.overlay': 6000,
        'stacking.floating': 6000
      };
      tokens[name] = stackingMap[name];
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
    tokens: buildTokens(polarity),
    meta: meta,
    provenance: PROVENANCE
  };
}

function writeScheme (polarity, fileName) {
  const scheme = buildScheme(polarity);
  const content = '// Info: Auto-generated by scripts/generate.js. Do not edit by hand.\n' +
    '// D19 default template - ' + polarity + ' scheme.\n' +
    'export default Object.freeze(' + serialize(scheme, 2) + ');\n';
  writeFileSync(resolve(outDir, fileName), content);
}

// --- Assertions (D19) -----------------------------------------------------
const tokens = buildTokens('light');

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

// Assert feedback.field
if (tokens['feedback.field'] !== 'underline') {
  throw new Error('feedback.field must be underline');
}

// Assert every anatomy, icon and control token has a value the contract accepts
for (const name of tokenNames) {
  const group = contract.tokens[name].group;
  if ((group === 'anatomy' || group === 'icon' || group === 'control') && tokens[name] === undefined) {
    throw new Error('No value for ' + name);
  }
}
const v4Tokens = {};
for (const name of tokenNames) {
  const group = contract.tokens[name].group;
  if (group === 'anatomy' || group === 'icon') {
    v4Tokens[name] = tokens[name];
  }
}
const v4Check = Themer.validateContract({ tokens: v4Tokens }, {});
if (!v4Check.success) {
  const failing = [];
  for (const entry of v4Check.errors) {
    failing.push(entry.token);
  }
  throw new Error('Invalid v4 values: ' + failing.join(', '));
}

// Assert token count
const count = Object.keys(tokens).length;
if (count !== tokenNames.length) {
  throw new Error('Token count mismatch: expected ' + tokenNames.length + ', got ' + count);
}

console.log('Token count: ' + count);
console.log('Durations: ' + DURATIONS.join(', '));
console.log('Interactive: ' + INTERACTIVE + '; semantic: ' + JSON.stringify(SEMANTIC));
console.log('Icons: ' + Object.keys(ICONS).length + ' from @carbon/icons@' + carbonIcons.version);

// --- Write files ----------------------------------------------------------
mkdirSync(outDir, { recursive: true });
writeScheme('light', 'light.js');
writeScheme('dark', 'dark.js');

console.log('Wrote ' + resolve(outDir, 'light.js'));
console.log('Wrote ' + resolve(outDir, 'dark.js'));
