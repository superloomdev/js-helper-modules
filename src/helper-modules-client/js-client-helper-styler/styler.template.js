// Info: The DEFAULT template — the opinionated layer built on the engine.
// It declares WHICH tokens exist and HOW each is derived, as pure data. The
// engine (styler.js) interprets this against a scheme's values. Authoring a new
// template = copying this shape and changing the labels / rules; the engine
// never changes.
//
// Three sections, each with `defaults` (the complete fallback values a scheme
// fills in) plus a derivation description:
//   color.swatches      - { ref } copies a value; { operation, args } runs a ColorOp
//   dimension.scales    - modular (ratio) or linear (unit) named scales
//   font.roles          - ordered family roles (each falls back to the prior)
//
// Compatibility: Node.js 18+ and React Native (Hermes). Pure data, no logic.
'use strict';


module.exports = {

  // ~~~~~~~~~~~~~~~~~~~~ Color ~~~~~~~~~~~~~~~~~~~~
  color: {

    // Complete fallback color values. A theme overrides any of these.
    defaults: {
      primary: '#4F46E5',
      textPrimary: '#111827',
      backgroundPrimary: '#FFFFFF',
      success: '#16A34A',
      danger: '#DC2626',
      warning: '#D97706',
      info: '#2563EB'
    },

    // Each swatch is derived from the values above via ref or a named ColorOp.
    // String args resolve to value keys; numbers are literal weights (0-100).
    swatches: {

      // Brand / action
      APP_PRIMARY: { ref: 'primary' },
      APP_PRIMARY_HOVERED: { operation: 'pseudoHover', args: ['primary'] },
      APP_PRIMARY_PRESSED: { operation: 'pseudoPress', args: ['primary'] },
      APP_PRIMARY_DISABLED: { operation: 'disabled', args: ['primary'] },
      APP_PRIMARY_SUBTLE: { operation: 'mix', args: ['primary', 'backgroundPrimary', 12] },

      // Text tiers
      TEXT_PRIMARY: { ref: 'textPrimary' },
      TEXT_SECONDARY: { operation: 'mix', args: ['textPrimary', 'backgroundPrimary', 62] },
      TEXT_MUTED: { operation: 'mix', args: ['textPrimary', 'backgroundPrimary', 40] },
      TEXT_ON_PRIMARY: { operation: 'contrast', args: ['primary'] },

      // Surfaces
      BACKGROUND_PRIMARY: { ref: 'backgroundPrimary' },
      BACKGROUND_SECONDARY: { operation: 'mix', args: ['textPrimary', 'backgroundPrimary', 4] },
      SURFACE: { ref: 'backgroundPrimary' },
      BORDER: { operation: 'mix', args: ['textPrimary', 'backgroundPrimary', 14] },

      // Status + subtle backgrounds
      STATUS_SUCCESS: { ref: 'success' },
      STATUS_SUCCESS_SUBTLE: { operation: 'mix', args: ['success', 'backgroundPrimary', 12] },
      STATUS_DANGER: { ref: 'danger' },
      STATUS_DANGER_SUBTLE: { operation: 'mix', args: ['danger', 'backgroundPrimary', 12] },
      STATUS_WARNING: { ref: 'warning' },
      STATUS_WARNING_SUBTLE: { operation: 'mix', args: ['warning', 'backgroundPrimary', 12] },
      STATUS_INFO: { ref: 'info' },
      STATUS_INFO_SUBTLE: { operation: 'mix', args: ['info', 'backgroundPrimary', 12] }

    }
  },

  // ~~~~~~~~~~~~~~~~~~~~ Dimension ~~~~~~~~~~~~~~~~~~~~
  dimension: {

    defaults: {
      fontBase: 16,
      fontRatio: 1.2,
      spaceUnit: 4,
      radiusUnit: 4,
      lineHeightRatio: 1.45
    },

    scales: {
      // Typography: modular scale around fontBase using fontRatio.
      fontSize: {
        type: 'modular', base: 'fontBase', ratio: 'fontRatio',
        steps: { xs: -2, sm: -1, md: 0, lg: 1, xl: 2, xxl: 3 }
      },
      // Spacing: multiples of spaceUnit.
      space: {
        type: 'linear', unit: 'spaceUnit',
        steps: { none: 0, xs: 1, sm: 2, md: 3, lg: 4, xl: 6, xxl: 8 }
      },
      // Radius: multiples of radiusUnit, plus a preset full-pill value.
      radius: {
        type: 'linear', unit: 'radiusUnit',
        steps: { none: 0, sm: 1, md: 2, lg: 3 },
        presets: { pill: 999 }
      }
    },

    // Scalar values copied straight through (not a scale).
    constants: ['lineHeightRatio']
  },

  // ~~~~~~~~~~~~~~~~~~~~ Font ~~~~~~~~~~~~~~~~~~~~
  font: {

    // Only family NAMES live here (data). Loading the actual font files is a
    // host concern (a font manifest) — see docs/philosophy.md.
    defaults: {
      primaryFamily: 'System',
      secondaryFamily: null
    },

    // Ordered roles; each missing family falls back to the previous role.
    roles: ['primary', 'secondary']
  }

};
