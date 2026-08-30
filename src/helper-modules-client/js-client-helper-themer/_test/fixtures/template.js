// Info: Shared template fixture for the helper-themer test suite.
//
// Small enough to reason about, but exercises every resolution route and
// every token group the engine emits.


/********************************************************************
Build a fresh template.

Returned by a function rather than exported as a constant, so a test
that mutates one template cannot affect another, and so two distinct
template objects are available for cache-identity checks.

@param {String} [accent] - Accent color, letting callers vary one value

@return {Object} - A complete template
*********************************************************************/
export default function buildTemplate (accent) {

  return {

    polarity: 'light',

    ramp: ['#ffffff', '#f4f4f4', '#e0e0e0', '#8d8d8d', '#393939', '#161616'],

    palette: {
      blue60: '#0f62fe',
      blue70: '#0043ce',
      red50: '#fa4d56',
      red60: '#da1e28'
    },

    scales: {
      base_font_size: 16,
      miniUnit: { base: 8 },
      carbonType: { base: 12 },
      geometric: { base: 10, ratio: 2 }
    },

    tokens: {

      // Literal, and the anchor the ramp rules count from
      background: '#ffffff',

      // Literal the caller can vary, so two templates differ by one value
      accent: accent || '#0f62fe',

      // Rule: a fixed distance along the neutral ramp
      textPrimary: { op: 'rampStep', args: [5] },

      // Rule: a named step from a palette family
      brand: { op: 'hue', args: ['blue', 60] },

      // Literal pinned low enough to fail its contrast rule
      warning: '#fa4d56',

      // Alias, which must inherit whatever its target resolves to
      brandAlias: '{brand}',

      // Rule over two resolved tokens
      brandMuted: { op: 'mix', args: ['brand', 'background', 30] },

      // Generators over two different scales
      spacing03: { scale: 'miniUnit', multiplier: 2 },
      spacing05: { scale: 'miniUnit', multiplier: 4 },
      geoStep03: { scale: 'geometric', step: 3 },

      // Type set carrying a family token and a weight
      code01: { type_set: true, step: 1, weight: 400, line_height: 1.33333, letter_spacing: 0.32, font_family: 'mono' },

      // Type set that deliberately leaves the weight unset, as Carbon does
      helperText01: { type_set: true, step: 1, line_height: 1.33333, letter_spacing: 0.32 },

      // Shadow seeded from the elevation table, which is multi-layer
      cardShadow: { shadow: true, level: 2 },

      // Shadow with explicit geometry carrying a spread native cannot represent
      spreadShadow: {
        shadow: true,
        layers: [
          { offset_x: 0, offset_y: 2, blur: 4, spread: 3, opacity: 0.2 }
        ]
      },

      // Duration, which the motion factor scales
      durationFast: 110,

      // Easing, which the two platforms want in different forms
      easingStandard: [0.2, 0, 0.38, 0.9],

      // Web-only token with a declared native fallback
      fluidGutter: '4vw'

    },

    meta: {
      background: { group: 'color' },
      accent: { group: 'color' },
      textPrimary: { group: 'color' },
      brand: { group: 'color' },
      warning: { group: 'color' },
      brandAlias: { group: 'color' },
      brandMuted: { group: 'color' },
      spacing03: { group: 'dimension' },
      spacing05: { group: 'dimension' },
      geoStep03: { group: 'dimension' },
      code01: { group: 'typeSet' },
      helperText01: { group: 'typeSet' },
      cardShadow: { group: 'shadow' },
      spreadShadow: { group: 'shadow' },
      durationFast: { group: 'duration' },
      easingStandard: { group: 'easing' },
      fluidGutter: { group: 'raw', platforms: ['web'], fallback: { native: 16 } }
    },

    contrast_rules: [
      ['warning', 'background', 4.5]
    ]

  };

};
