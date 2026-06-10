// Info: Color operations for js-client-helper-styler — the named color primitives a
// template may reference by `operation`. Pure hex math: blending, luminance,
// contrast, and interaction states. Singleton part; no per-caller state.
'use strict';


// Shared dependencies injected by loader (uniform parts signature)
let Lib;     // eslint-disable-line no-unused-vars -- accepted for signature uniformity
let CONFIG;  // eslint-disable-line no-unused-vars -- accepted for signature uniformity
let ERRORS;  // eslint-disable-line no-unused-vars -- accepted for signature uniformity


/////////////////////////// Module-Loader START ////////////////////////////////

/********************************************************************
Singleton loader. Injects Lib, CONFIG, and ERRORS and returns the
module-scope ColorOps object directly. All three are accepted for
signature uniformity with other parts — none are consumed today.

@param {Object} shared_libs - Lib container (unused; pure color math)
@param {Object} config      - Merged module configuration (unused)
@param {Object} errors      - Module error catalog (unused)

@return {Object} - Public ColorOps interface
*********************************************************************/
module.exports = function loader (shared_libs, config, errors) {

  // Capture injected references so they are available if a future op needs them
  Lib = shared_libs;
  CONFIG = config;
  ERRORS = errors;

  return ColorOps;

};/////////////////////////// Module-Loader END ////////////////////////////////



/////////////////////////// Public Functions START /////////////////////////////
const ColorOps = { // Named color primitives accessible by the orchestrator


  // ~~~~~~~~~~~~~~~~~~~~ Blending ~~~~~~~~~~~~~~~~~~~~
  // Mix toward another color; lighten/darken/disabled are mix presets.

  /********************************************************************
  Blend two colors by weight. weight_a is the percentage (0-100) of
  color_a in the resulting blend.

  @param {String} color_a  - first color (hex)
  @param {String} color_b  - second color (hex)
  @param {Number} weight_a - percent (0-100) of color_a in the blend

  @return {String} - blended '#rrggbb' color
  *********************************************************************/
  mix: function (color_a, color_b, weight_a) {

    // Convert the weight into complementary 0-1 ratios
    const ratio_a = weight_a / 100;
    const ratio_b = 1 - ratio_a;

    // Parse both colors into channel integers
    const channels_a = _ColorOps.parseHex(color_a);
    const channels_b = _ColorOps.parseHex(color_b);

    // Blend each channel by its ratio and serialize back to hex
    return _ColorOps.toHex({
      r: channels_a.r * ratio_a + channels_b.r * ratio_b,
      g: channels_a.g * ratio_a + channels_b.g * ratio_b,
      b: channels_a.b * ratio_a + channels_b.b * ratio_b
    });

  },


  /********************************************************************
  Tint a color toward white by `amount` percent.

  @param {String} hex    - color (hex)
  @param {Number} amount - percent (0-100) of white to mix in

  @return {String} - lightened '#rrggbb' color
  *********************************************************************/
  lighten: function (hex, amount) {

    // Blend the color toward white
    return ColorOps.mix('#FFFFFF', hex, amount);

  },


  /********************************************************************
  Shade a color toward black by `amount` percent.

  @param {String} hex    - color (hex)
  @param {Number} amount - percent (0-100) of black to mix in

  @return {String} - darkened '#rrggbb' color
  *********************************************************************/
  darken: function (hex, amount) {

    // Blend the color toward black
    return ColorOps.mix('#000000', hex, amount);

  },


  /********************************************************************
  Wash a color out toward white for a disabled look (45% color).

  @param {String} hex - base color (hex)

  @return {String} - the muted '#rrggbb' color
  *********************************************************************/
  disabled: function (hex) {

    // Keep 45% of the color, the rest white
    return ColorOps.mix(hex, '#FFFFFF', 45);

  },


  // ~~~~~~~~~~~~~~~~~~~~ Luminance & Contrast ~~~~~~~~~~~~~~~~~~~~
  // Perceived brightness and the readable foreground it implies.

  /********************************************************************
  Perceived brightness of a color (0-255). Higher = lighter.

  @param {String} hex - color (hex)

  @return {Number} - perceived brightness 0-255
  *********************************************************************/
  luminance: function (hex) {

    // Weight the channels by human luminance sensitivity
    const channels = _ColorOps.parseHex(hex);
    return 0.299 * channels.r + 0.587 * channels.g + 0.114 * channels.b;

  },


  /********************************************************************
  True when a color is dark enough to want light text on top of it.

  @param {String} hex - color (hex)

  @return {Boolean} - true when luminance < 128
  *********************************************************************/
  isDark: function (hex) {

    // Compare perceived brightness against the midpoint
    return ColorOps.luminance(hex) < 128;

  },


  /********************************************************************
  Pick a readable foreground (white or near-black) for a background.

  @param {String} hex - background color (hex)

  @return {String} - '#FFFFFF' on dark backgrounds, '#111827' on light
  *********************************************************************/
  contrast: function (hex) {

    // Light text on dark backgrounds, dark text on light backgrounds
    return ColorOps.isDark(hex) ? '#FFFFFF' : '#111827';

  },


  // ~~~~~~~~~~~~~~~~~~~~ Interaction States ~~~~~~~~~~~~~~~~~~~~
  // Hover / pressed shifts whose direction adapts to the base lightness.

  /********************************************************************
  Hover interaction state derived from a base color. Direction depends
  on whether the base is dark, so the shift stays perceptible either way.

  @param {String} hex - base color (hex)

  @return {String} - the hover-state '#rrggbb' color
  *********************************************************************/
  pseudoHover: function (hex) {

    // Lighten a dark base, darken a light base
    return ColorOps.isDark(hex) ? ColorOps.lighten(hex, 10) : ColorOps.darken(hex, 8);

  },


  /********************************************************************
  Pressed interaction state derived from a base color (a stronger shift
  than pseudoHover); direction chosen by the base's lightness.

  @param {String} hex - base color (hex)

  @return {String} - the pressed-state '#rrggbb' color
  *********************************************************************/
  pseudoPress: function (hex) {

    // Apply a larger shift than hover, in the same direction
    return ColorOps.isDark(hex) ? ColorOps.lighten(hex, 18) : ColorOps.darken(hex, 16);

  }


};/////////////////////////// Public Functions END //////////////////////////////



/////////////////////////// Private Functions START ////////////////////////////
const _ColorOps = { // Hex parsing / serialization helpers, module-only


  /********************************************************************
  Parse a #rgb or #rrggbb string into { r, g, b }, expanding shorthand.

  @param {String} hex - color string ('#fff' | '#ffffff', '#' optional)

  @return {Object} - { r, g, b } channel integers (0-255)
  *********************************************************************/
  parseHex: function (hex) {

    // Strip the leading '#' if present
    const raw = String(hex).replace('#', '');

    // Expand 3-digit shorthand ('#abc' -> 'aabbcc')
    const full = raw.length === 3
      ? raw.split('').map(function (channel) {
        return channel + channel;
      }).join('')
      : raw;

    // Parse each channel pair into an integer
    return {
      r: parseInt(full.substring(0, 2), 16),
      g: parseInt(full.substring(2, 4), 16),
      b: parseInt(full.substring(4, 6), 16)
    };

  },


  /********************************************************************
  Serialize { r, g, b } back into a #rrggbb string (channels clamped).

  @param {Object} rgb - { r, g, b } channel values

  @return {String} - '#rrggbb' color string
  *********************************************************************/
  toHex: function (rgb) {

    // Clamp and pad one channel to a 2-digit hex string
    const part = function (value) {
      return _ColorOps.clamp255(value).toString(16).padStart(2, '0');
    };

    // Concatenate the three channels behind a '#'
    return '#' + part(rgb.r) + part(rgb.g) + part(rgb.b);

  },


  /********************************************************************
  Constrain a channel value to a valid 0-255 integer.

  @param {Number} value - raw channel value (may be fractional / out of range)

  @return {Integer} - value rounded and clamped to 0-255
  *********************************************************************/
  clamp255: function (value) {

    // Round, then bound to the 0-255 range
    return Math.max(0, Math.min(255, Math.round(value)));

  }


};/////////////////////////// Private Functions END ////////////////////////////
